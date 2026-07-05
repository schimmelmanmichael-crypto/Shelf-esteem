import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NumberPadInput } from '@/components/number-pad-input';

interface Ingredient { id: string; name: string; quantity: number; unit: string; inPantry?: boolean; }
interface Recipe { id: string; name: string; description?: string; category?: string; servings?: number; prepTime?: number; cookTime?: number; instructions?: string; tips?: string; ingredients: Ingredient[]; userId?: string | null; timesCooked?: number; }

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [servings, setServings] = useState(1);
  const [leftoverServings, setLeftoverServings] = useState(0);
  const [cookMode, setCookMode] = useState(false);
  const [step, setStep] = useState(0);
  // Stable across retries of the SAME cook attempt (manual re-click after a
  // failure, or a query-lib auto-retry reusing these same mutate() variables)
  // so the backend's idempotency check can actually catch a duplicate. Reset
  // to a fresh id only after a successful cook, for the next distinct attempt.
  const [cookSessionId, setCookSessionId] = useState(() => crypto.randomUUID());

  const { data: recipe, isLoading } = useQuery<Recipe>({
    queryKey: ['recipes', id],
    queryFn: () => fetch(`/api/recipes/${id}`).then(r => r.json()),
    staleTime: 30_000,
  });

  interface CookResult { ok: boolean; deducted?: string[]; addedToShopping?: string[]; leftoverId?: string | null; error?: string; message?: string; }

  const cookMutation = useMutation({
    mutationFn: async (): Promise<CookResult> => {
      const res = await fetch(`/api/recipes/${id}/cook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servings, cookSessionId, leftoverServings }),
      });
      const data: CookResult = await res.json();
      // fetch() only rejects on network failure, not on 4xx/5xx — without this
      // check a 409 idempotency conflict would be parsed as JSON and treated
      // as a success by onSuccess below.
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? 'Cook failed');
      }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      if (data.leftoverId) {
        qc.invalidateQueries({ queryKey: ['leftovers'] });
        toast.success('Pantry updated! Leftovers saved. 🍱');
      } else {
        toast.success('Pantry updated! Missing items added to shopping list.');
      }
      setCookSessionId(crypto.randomUUID());
    },
    onError: (err: Error) => toast.error(err.message || 'Cook failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/recipes/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); navigate('/recipes'); toast.success('Recipe deleted'); },
  });

  if (isLoading) return <Layout><div className="p-6 text-center text-[var(--muted-foreground)]">Loading...</div></Layout>;
  if (!recipe) return <Layout><div className="p-6 text-center">Recipe not found</div></Layout>;

  const steps = recipe.instructions?.split('\n').filter(Boolean) ?? [];

  if (cookMode) {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-black text-xl">Cook Mode</h2>
            <Button variant="ghost" onClick={() => { setCookMode(false); setStep(0); }}>✕ Exit</Button>
          </div>
          <div className="mb-4">
            <Badge variant="secondary">Step {step + 1} of {steps.length}</Badge>
          </div>
          <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] min-h-[160px] text-lg leading-relaxed mb-6">
            {steps[step]}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Prev</Button>
            {step < steps.length - 1 ? (
              <Button className="flex-1" onClick={() => setStep(s => s + 1)}>Next →</Button>
            ) : (
              <Button className="flex-1" onClick={() => { setCookMode(false); toast.success('Great cook! Log leftovers in the Leftovers tab.'); }}>Done Cooking 🎉</Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/recipes')} className="mb-4">← Recipes</Button>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-black">{recipe.name}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              {recipe.category && <Badge variant="secondary">{recipe.category}</Badge>}
              {!recipe.userId && <Badge>Community Recipe</Badge>}
              {recipe.prepTime && <span className="text-sm text-[var(--muted-foreground)]">Prep: {recipe.prepTime}m</span>}
              {recipe.cookTime && <span className="text-sm text-[var(--muted-foreground)]">Cook: {recipe.cookTime}m</span>}
            </div>
          </div>
          {recipe.userId && (
            <Button variant="ghost" size="sm" className="text-[var(--destructive)]" onClick={() => { if (confirm('Delete this recipe?')) deleteMutation.mutate(); }}>Delete</Button>
          )}
        </div>

        {recipe.description && <p className="text-[var(--muted-foreground)] mb-4">{recipe.description}</p>}

        {/* Ingredients */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Ingredients</h3>
          <ul className="space-y-1">
            {recipe.ingredients?.map(ing => (
              <li key={ing.id} className="flex items-center gap-2 text-sm">
                <span className={ing.inPantry ? 'text-green-600' : 'text-[var(--destructive)]'}>
                  {ing.inPantry ? '✓' : '✗'}
                </span>
                <span>{ing.quantity} {ing.unit} {ing.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        {steps.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="text-sm flex gap-3">
                  <span className="text-[var(--primary)] font-bold shrink-0">{i + 1}.</span>
                  <span>{s.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {recipe.tips && (
          <div className="mb-6 p-3 rounded-lg bg-[var(--muted)] text-sm">
            <span className="font-medium">💡 Tip: </span>{recipe.tips}
          </div>
        )}

        {/* Cook section */}
        <div className="border border-[var(--border)] rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Cook This Recipe</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted-foreground)]">Servings:</span>
            <NumberPadInput value={servings} onChange={setServings} min={1} max={20} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted-foreground)]">Save as leftovers:</span>
            <NumberPadInput value={leftoverServings} onChange={setLeftoverServings} min={0} max={20} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={cookMutation.isPending} onClick={() => cookMutation.mutate()}>
              {cookMutation.isPending ? 'Cooking...' : '🍳 Cook This'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setCookMode(true)}>
              Step-by-Step Mode
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

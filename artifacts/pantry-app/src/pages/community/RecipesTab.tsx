import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface CommunityRecipe { id: string; name: string; displayName?: string; category?: string; likeCount?: number; commentCount?: number; description?: string; }

export default function RecipesTab() {
  const qc = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'Dinner', displayName: '', servings: 4, ingredients: '', instructions: '' });

  const { data: recipes = [] } = useQuery<CommunityRecipe[]>({
    queryKey: ['community/recipes'],
    queryFn: () => fetch('/api/community/recipes').then(r => r.json()),
    staleTime: 30_000,
  });

  const shareRecipe = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/community/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community/recipes'] }); toast.success('Recipe shared!'); setShareOpen(false); },
    onError: () => toast.error('Failed to share recipe'),
  });

  const like = useMutation({
    mutationFn: (id: string) => fetch(`/api/community/recipes/${id}/like`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community/recipes'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">{recipes.length} community recipes</p>
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogTrigger asChild><Button size="sm">Share a Recipe</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Share Recipe with Community</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1"><Label>Your Name (optional)</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Anonymous" /></div>
              <div className="space-y-1"><Label>Recipe Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Ingredients (one per line)</Label><Textarea value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} rows={3} /></div>
              <div className="space-y-1"><Label>Instructions</Label><Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={3} /></div>
              <Button className="w-full" disabled={!form.name || shareRecipe.isPending} onClick={() => shareRecipe.mutate(form)}>Share</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {recipes.map(r => (
          <div key={r.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{r.displayName ?? 'Anonymous'} · {r.category}</p>
                {r.description && <p className="text-sm mt-1">{r.description}</p>}
              </div>
              <button onClick={() => like.mutate(r.id)} className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                ❤️ {r.likeCount ?? 0}
              </button>
            </div>
          </div>
        ))}
        {recipes.length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No community recipes yet. Be the first to share!</p>}
      </div>
    </div>
  );
}

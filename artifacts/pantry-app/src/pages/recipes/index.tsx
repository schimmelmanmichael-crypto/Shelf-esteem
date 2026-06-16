import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Recipe { id: string; name: string; category?: string; servings?: number; timesCooked?: number; userId?: string | null; }

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <a className="block p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{recipe.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{recipe.category ?? 'General'} · {recipe.servings ?? 2} servings</p>
          </div>
          {!recipe.userId && <Badge variant="secondary" className="shrink-0">Community</Badge>}
        </div>
      </a>
    </Link>
  );
}

export default function RecipesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');
  const [form, setForm] = useState({ name: '', description: '', category: 'Dinner', servings: 2, prepTime: 10, cookTime: 20, instructions: '' });

  const { data: all = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: () => fetch('/api/recipes').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: canCook = [] } = useQuery<Recipe[]>({
    queryKey: ['recipes/can-cook'],
    queryFn: () => fetch('/api/recipes/can-cook').then(r => r.json()),
    staleTime: 30_000,
  });

  const addRecipe = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Recipe added!'); setAddOpen(false); },
    onError: () => toast.error('Failed to add recipe'),
  });

  const scrapeUrl = useMutation({
    mutationFn: (u: string) =>
      fetch('/api/recipes/scrape-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) }).then(r => r.json()),
    onSuccess: (data) => {
      fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(() => { qc.invalidateQueries({ queryKey: ['recipes'] }); toast.success('Recipe imported!'); setAddOpen(false); });
    },
    onError: () => toast.error('URL scrape failed'),
  });

  const filterRecipes = (list: Recipe[]) =>
    list.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">Recipes</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={16} className="mr-1" />Add Recipe</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Recipe</DialogTitle></DialogHeader>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setUrlMode(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${!urlMode ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)]'}`}>Manual</button>
                <button onClick={() => setUrlMode(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${urlMode ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)]'}`}>Scrape URL</button>
              </div>
              {urlMode ? (
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Recipe URL</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
                  <Button className="w-full" disabled={!url || scrapeUrl.isPending} onClick={() => scrapeUrl.mutate(url)}>
                    {scrapeUrl.isPending ? 'Importing...' : 'Import from URL'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
                    <div className="space-y-1"><Label>Servings</Label><Input type="number" value={form.servings} onChange={e => setForm(f => ({ ...f, servings: Number(e.target.value) }))} /></div>
                  </div>
                  <div className="space-y-1"><Label>Instructions</Label><Textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} rows={4} /></div>
                  <Button className="w-full" disabled={!form.name || addRecipe.isPending} onClick={() => addRecipe.mutate(form)}>
                    {addRecipe.isPending ? 'Adding...' : 'Add Recipe'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input className="pl-9" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Tabs defaultValue="all">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all" className="flex-1">All Recipes ({all.length})</TabsTrigger>
            <TabsTrigger value="can-cook" className="flex-1">Can Cook ({canCook.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <div className="space-y-2">
              {filterRecipes(all).map(r => <RecipeCard key={r.id} recipe={r} />)}
              {filterRecipes(all).length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No recipes found.</p>}
            </div>
          </TabsContent>
          <TabsContent value="can-cook">
            <div className="space-y-2">
              {filterRecipes(canCook).map(r => <RecipeCard key={r.id} recipe={r} />)}
              {filterRecipes(canCook).length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No recipes you can cook right now. Add more pantry items!</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

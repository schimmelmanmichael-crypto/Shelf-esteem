import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Leftover { id: string; mealName: string; servingsAvailable: number; expirationDate?: string; storageLocation?: string; status?: string; costPerServing?: string; }
interface Analytics { totalServingsLost: number; totalDollarLost: string; autoDetected: number; manuallyLogged: number; }

function statusBadge(item: Leftover) {
  const today = new Date().toISOString().split('T')[0];
  const in3 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  if (item.status === 'expired' || item.status === 'consumed') return null;
  if (item.expirationDate && item.expirationDate < today) return <Badge variant="destructive">Expired</Badge>;
  if (item.expirationDate && item.expirationDate <= in3) return <Badge variant="warning">Expiring Soon</Badge>;
  return <Badge variant="success">Active</Badge>;
}

export default function LeftoversPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ mealName: '', servingsAvailable: 2, servingsOriginal: 2, expirationDate: '', storageLocation: 'fridge', costPerServing: '' });

  const { data: leftovers = [] } = useQuery<Leftover[]>({
    queryKey: ['leftovers'],
    queryFn: () => fetch('/api/leftovers').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ['leftovers/analytics'],
    queryFn: () => fetch('/api/leftovers/analytics').then(r => r.json()),
    staleTime: 30_000,
  });

  const addLeftover = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/leftovers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leftovers'] }); toast.success('Leftover logged!'); setAddOpen(false); },
    onError: () => toast.error('Failed to add leftover'),
  });

  const consume = useMutation({
    mutationFn: ({ id, servings }: { id: string; servings: number }) =>
      fetch(`/api/leftovers/${id}/consume`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servings }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leftovers'] }); toast.success('Servings consumed!'); },
  });

  const logWaste = useMutation({
    mutationFn: (id: string) => fetch(`/api/leftovers/${id}/missed-opportunity`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leftovers', 'leftovers/analytics'] }); toast.info('Logged as missed opportunity'); },
  });

  const active = leftovers.filter(l => l.status === 'active' || !l.status);

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">Leftovers</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" />Log Leftover</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Leftover</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1"><Label>Meal Name *</Label><Input value={form.mealName} onChange={e => setForm(f => ({ ...f, mealName: e.target.value }))} placeholder="e.g. Chicken Stir-Fry" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Servings Available</Label><Input type="number" value={form.servingsAvailable} min={1} onChange={e => setForm(f => ({ ...f, servingsAvailable: Number(e.target.value) }))} /></div>
                  <div className="space-y-1"><Label>Cost/Serving ($)</Label><Input type="number" value={form.costPerServing} onChange={e => setForm(f => ({ ...f, costPerServing: e.target.value }))} placeholder="Optional" /></div>
                </div>
                <div className="space-y-1"><Label>Expiration Date</Label><Input type="date" value={form.expirationDate} onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))} /></div>
                <Button className="w-full" disabled={!form.mealName || addLeftover.isPending} onClick={() => addLeftover.mutate(form)}>
                  {addLeftover.isPending ? 'Saving...' : 'Log Leftover'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-3">
              {active.map(item => (
                <div key={item.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{item.mealName}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">{item.servingsAvailable} servings · {item.storageLocation ?? 'fridge'}{item.expirationDate && ` · exp. ${item.expirationDate}`}</p>
                    </div>
                    {statusBadge(item)}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => consume.mutate({ id: item.id, servings: 1 })}>Eat 1 Serving</Button>
                    <Button size="sm" variant="outline" className="text-[var(--destructive)]" onClick={() => { if (confirm('Log as missed opportunity?')) logWaste.mutate(item.id); }}>Log Waste</Button>
                  </div>
                </div>
              ))}
              {active.length === 0 && (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                  <div className="text-4xl mb-2">↩️</div>
                  <p>No active leftovers. Cook something and log it!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            {analytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
                    <p className="text-2xl font-black text-[#dc2626]">{analytics.totalServingsLost}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Total servings lost</p>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
                    <p className="text-2xl font-black text-[#dc2626]">${analytics.totalDollarLost}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Dollar value lost</p>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
                    <p className="text-2xl font-black">{analytics.autoDetected}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Auto-detected expired</p>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-center">
                    <p className="text-2xl font-black">{analytics.manuallyLogged}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Manually logged waste</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--muted-foreground)]">Loading analytics...</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

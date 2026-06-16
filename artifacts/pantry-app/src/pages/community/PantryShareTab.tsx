import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface PantryShare { id: string; itemName: string; quantity?: string; isFree?: boolean; tradeFor?: string; zipCode?: string; displayName?: string; }

export default function PantryShareTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ itemName: '', quantity: '', isFree: true, tradeFor: '', zipCode: '', displayName: '' });

  const { data: shares = [] } = useQuery<PantryShare[]>({
    queryKey: ['community/pantry-shares'],
    queryFn: () => fetch('/api/community/pantry-shares').then(r => r.json()),
    staleTime: 30_000,
  });

  const post = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/community/pantry-shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community/pantry-shares'] }); toast.success('Share posted!'); setOpen(false); },
    onError: () => toast.error('Failed to post share'),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">{shares.length} available shares</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">Offer Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Share Pantry Item</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1"><Label>Item Name *</Label><Input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Quantity</Label><Input value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 2 cans" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isFree" checked={form.isFree} onChange={e => setForm(f => ({ ...f, isFree: e.target.checked }))} />
                <Label htmlFor="isFree">Free (no trade required)</Label>
              </div>
              {!form.isFree && <div className="space-y-1"><Label>Trade For</Label><Input value={form.tradeFor} onChange={e => setForm(f => ({ ...f, tradeFor: e.target.value }))} /></div>}
              <div className="space-y-1"><Label>Zip Code</Label><Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.itemName || post.isPending} onClick={() => post.mutate(form)}>Post Share</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {shares.map(s => (
          <div key={s.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
            <div>
              <p className="font-semibold">{s.itemName}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{s.quantity}{s.zipCode && ` · ${s.zipCode}`}</p>
              {s.tradeFor && <p className="text-xs text-[var(--muted-foreground)]">Trade for: {s.tradeFor}</p>}
            </div>
            <Badge variant={s.isFree ? 'success' : 'secondary'}>{s.isFree ? 'Free' : 'Trade'}</Badge>
          </div>
        ))}
        {shares.length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No pantry shares yet. Have extra food? Share it!</p>}
      </div>
    </div>
  );
}

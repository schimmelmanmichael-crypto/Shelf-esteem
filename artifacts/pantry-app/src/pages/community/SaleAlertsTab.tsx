import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SaleAlert { id: string; storeName: string; itemName: string; salePrice?: string; regularPrice?: string; zipCode?: string; displayName?: string; }

export default function SaleAlertsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ storeName: '', itemName: '', salePrice: '', regularPrice: '', zipCode: '', displayName: '' });

  const { data: alerts = [] } = useQuery<SaleAlert[]>({
    queryKey: ['community/sale-alerts'],
    queryFn: () => fetch('/api/community/sale-alerts').then(r => r.json()),
    staleTime: 30_000,
  });

  const post = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/community/sale-alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community/sale-alerts'] }); toast.success('Sale alert posted!'); setOpen(false); },
    onError: () => toast.error('Failed to post alert'),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">{alerts.length} sale alerts</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">Post Alert</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post Sale Alert</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1"><Label>Your Name (optional)</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Anonymous" /></div>
              <div className="space-y-1"><Label>Store *</Label><Input value={form.storeName} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Item *</Label><Input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Sale Price</Label><Input value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="$2.99" /></div>
                <div className="space-y-1"><Label>Regular Price</Label><Input value={form.regularPrice} onChange={e => setForm(f => ({ ...f, regularPrice: e.target.value }))} placeholder="$4.99" /></div>
              </div>
              <div className="space-y-1"><Label>Zip Code</Label><Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="33101" /></div>
              <Button className="w-full" disabled={!form.storeName || !form.itemName || post.isPending} onClick={() => post.mutate(form)}>Post Alert</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {alerts.map(a => (
          <div key={a.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{a.itemName}</p>
                <p className="text-sm text-[var(--muted-foreground)]">📍 {a.storeName}{a.zipCode && ` · ${a.zipCode}`}</p>
              </div>
              <div className="text-right">
                {a.salePrice && <p className="font-bold text-[var(--primary)]">{a.salePrice}</p>}
                {a.regularPrice && <p className="text-xs text-[var(--muted-foreground)] line-through">{a.regularPrice}</p>}
              </div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No sale alerts yet. Spot a great deal? Post it!</p>}
      </div>
    </div>
  );
}

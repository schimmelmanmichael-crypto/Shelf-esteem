import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Tag } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShoppingItem { id: string; name: string; quantity?: string; unit?: string; category?: string; isChecked?: boolean; addedFrom?: string; }

interface CouponResult {
  coupons?: Array<{ item: string; store: string; deal: string; savings: string; tip?: string }>;
  generalTips?: string[];
  estimatedTotalSavings?: string;
}

export default function ShoppingPage() {
  const qc = useQueryClient();
  const [newItem, setNewItem] = useState('');
  const [couponSheet, setCouponSheet] = useState(false);
  const [coupons, setCoupons] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: items = [] } = useQuery<ShoppingItem[]>({
    queryKey: ['shopping'],
    queryFn: () => fetch('/api/shopping').then(r => r.json()),
    staleTime: 30_000,
  });

  const addItem = useMutation({
    mutationFn: (name: string) =>
      fetch('/api/shopping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, quantity: '1', unit: 'count' }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopping'] }); setNewItem(''); },
    onError: () => toast.error('Failed to add item'),
  });

  const toggleItem = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      fetch(`/api/shopping/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isChecked: checked }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => fetch(`/api/shopping/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });

  const completePurchase = useMutation({
    mutationFn: () => {
      const checkedItems = items.filter(i => i.isChecked);
      return fetch('/api/shopping/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName, purchaseDate, items: checkedItems.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit })) }),
      }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopping'] }); qc.invalidateQueries({ queryKey: ['pantry'] }); toast.success('Pantry updated!'); setPurchaseOpen(false); },
    onError: () => toast.error('Purchase failed'),
  });

  async function findCoupons() {
    const unchecked = items.filter(i => !i.isChecked);
    if (unchecked.length === 0) { toast.info('Check off items first'); return; }
    setCouponLoading(true);
    setCouponSheet(true);
    try {
      const res = await fetch('/api/shopping/coupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: unchecked.map(i => i.name) }),
      });
      setCoupons(await res.json());
    } catch { toast.error('Coupon lookup failed'); setCouponSheet(false); }
    finally { setCouponLoading(false); }
  }

  const checked = items.filter(i => i.isChecked);
  const unchecked = items.filter(i => !i.isChecked);

  const byCategory = unchecked.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const cat = item.category ?? 'Other';
    (acc[cat] = acc[cat] ?? []).push(item);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">Shopping List</h1>
          <div className="flex gap-2">
            {unchecked.length > 0 && (
              <Button variant="outline" size="sm" onClick={findCoupons}><Tag size={14} className="mr-1" />Find Coupons</Button>
            )}
            {checked.length > 0 && (
              <Button size="sm" onClick={() => setPurchaseOpen(true)}>Complete Purchase</Button>
            )}
          </div>
        </div>

        {/* Add item */}
        <div className="flex gap-2 mb-6">
          <Input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add item..." onKeyDown={e => e.key === 'Enter' && newItem && addItem.mutate(newItem)} />
          <Button disabled={!newItem} onClick={() => addItem.mutate(newItem)}><Plus size={16} /></Button>
        </div>

        {/* Unchecked grouped by category */}
        {Object.entries(byCategory).map(([cat, catItems]) => (
          <div key={cat} className="mb-4">
            <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">{cat}</h3>
            <div className="space-y-1">
              {catItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--muted)]">
                  <input type="checkbox" checked={false} onChange={() => toggleItem.mutate({ id: item.id, checked: true })} className="w-4 h-4 accent-[var(--primary)]" />
                  <span className="flex-1 text-sm">{item.name}</span>
                  {item.quantity && <span className="text-xs text-[var(--muted-foreground)]">{item.quantity} {item.unit}</span>}
                  <button onClick={() => deleteItem.mutate(item.id)} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Checked items */}
        {checked.length > 0 && (
          <div className="mt-4 opacity-60">
            <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">✓ In Cart</h3>
            <div className="space-y-1">
              {checked.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg">
                  <input type="checkbox" checked onChange={() => toggleItem.mutate({ id: item.id, checked: false })} className="w-4 h-4 accent-[var(--primary)]" />
                  <span className="flex-1 text-sm line-through">{item.name}</span>
                  <button onClick={() => deleteItem.mutate(item.id)} className="text-[var(--muted-foreground)] text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <div className="text-4xl mb-2">🛒</div>
            <p>Your shopping list is empty. Add items or plan a meal!</p>
          </div>
        )}

        {/* Coupon sheet */}
        <Sheet open={couponSheet} onOpenChange={setCouponSheet}>
          <SheetContent side="bottom">
            <SheetHeader><SheetTitle>🏷️ Shelfy Found Some Deals!</SheetTitle></SheetHeader>
            {couponLoading ? (
              <div className="py-8 text-center text-[var(--muted-foreground)]">🔍 Shelfy is hunting for deals...</div>
            ) : coupons ? (
              <div className="space-y-4 mt-4 pb-6 overflow-y-auto max-h-[60vh]">
                {coupons.estimatedTotalSavings && (
                  <p className="text-sm font-medium text-[var(--primary)]">Estimated savings: {coupons.estimatedTotalSavings}</p>
                )}
                {coupons.coupons?.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg border border-[var(--border)] space-y-1">
                    <p className="font-medium text-sm">{c.item}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">📍 {c.store}</p>
                    <p className="text-sm">💰 {c.deal} — {c.savings}</p>
                    {c.tip && <p className="text-xs text-[var(--muted-foreground)]">💡 {c.tip}</p>}
                  </div>
                ))}
                {coupons.generalTips && coupons.generalTips.length > 0 && (
                  <div>
                    <p className="font-medium text-sm mb-1">💡 General Tips</p>
                    <ul className="space-y-1">{coupons.generalTips.map((t, i) => <li key={i} className="text-xs text-[var(--muted-foreground)]">• {t}</li>)}</ul>
                  </div>
                )}
              </div>
            ) : <p className="text-center py-4 text-[var(--muted-foreground)]">No coupons found. Try again later.</p>}
          </SheetContent>
        </Sheet>

        {/* Purchase dialog */}
        <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Complete Purchase</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1"><Label>Store Name</Label><Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Walmart" /></div>
              <div className="space-y-1"><Label>Purchase Date</Label><Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></div>
              <p className="text-sm text-[var(--muted-foreground)]">{checked.length} items will be added to your pantry.</p>
              <Button className="w-full" disabled={!storeName || completePurchase.isPending} onClick={() => completePurchase.mutate()}>
                {completePurchase.isPending ? 'Processing...' : 'Confirm Purchase'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

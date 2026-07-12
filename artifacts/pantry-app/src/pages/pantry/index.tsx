import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { Plus, Scan, Search } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PantryItem {
  id: string;
  name: string;
  brand?: string;
  quantity: string;
  unit: string;
  category?: string;
  storageArea?: string;
  expiryDate?: string;
  parLevel?: string;
  barcode?: string;
}

const CATEGORIES = ['All', 'Produce', 'Dairy', 'Proteins', 'Grains', 'Canned', 'Frozen', 'Other'];
const STORAGE = ['All', 'Pantry', 'Fridge', 'Freezer', 'Counter'];

function expiryStatus(date?: string) {
  if (!date) return 'none';
  const today = new Date().toISOString().split('T')[0];
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  if (date < today) return 'expired';
  if (date <= in7)  return 'soon';
  return 'ok';
}

export default function PantryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [storage, setStorage] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', quantity: '1', unit: 'count', category: 'other', storageArea: 'pantry', expiryDate: '', brand: '' });
  // Stable across a retry of the SAME "add item" attempt (e.g. clicking Add
  // Item again after a failure without closing the dialog); refreshed each
  // time the dialog opens for a new attempt, and after a successful add.
  const [addRequestId, setAddRequestId] = useState(() => crypto.randomUUID());
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: '', brand: '', category: 'other', storageArea: 'pantry', expiryDate: '' });

  function openEdit(item: PantryItem) {
    setEditingItem(item);
    setEditForm({
      quantity: item.quantity ?? '',
      brand: item.brand ?? '',
      category: item.category ?? 'other',
      storageArea: item.storageArea ?? 'pantry',
      expiryDate: item.expiryDate ?? '',
    });
  }

  const { data: items = [] } = useQuery<PantryItem[]>({
    queryKey: ['pantry'],
    queryFn: () => fetch('/api/pantry').then(r => r.json()),
    staleTime: 30_000,
  });

  const addItem = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, quantity: Number(data.quantity), idempotencyKey: addRequestId }),
      });
      const body = await res.json();
      // fetch() only rejects on network failure, not on 4xx/5xx — without
      // this check a 409 idempotency conflict would be parsed as JSON and
      // treated as a success by onSuccess below.
      if (!res.ok) {
        throw new Error(body.message ?? body.error ?? 'Failed to add item');
      }
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      toast.success('Item added!');
      setAddOpen(false);
      setForm({ name: '', quantity: '1', unit: 'count', category: 'other', storageArea: 'pantry', expiryDate: '', brand: '' });
      setAddRequestId(crypto.randomUUID());
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add item'),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
      // Same fetch()-doesn't-reject-on-4xx/5xx gap as addItem had — without
      // this check a failed delete would still report "Item removed".
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? 'Failed to remove item');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      toast.success('Item removed');
      setEditingItem(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove item'),
  });

  const updateItem = useMutation({
    mutationFn: async () => {
      if (!editingItem) throw new Error('No item to update');
      const res = await fetch(`/api/pantry/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: Number(editForm.quantity),
          brand: editForm.brand,
          category: editForm.category,
          storageArea: editForm.storageArea,
          expiryDate: editForm.expiryDate,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error ?? 'Failed to update item');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] });
      toast.success('Item updated');
      setEditingItem(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update item'),
  });

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === 'All' || item.category?.toLowerCase() === cat.toLowerCase();
    const matchStorage = storage === 'All' || item.storageArea?.toLowerCase() === storage.toLowerCase();
    return matchSearch && matchCat && matchStorage;
  });

  return (
    <Layout>
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">Pantry</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/pantry/scan"><Scan size={16} className="mr-1" />Scan</Link>
            </Button>
            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (open) setAddRequestId(crypto.randomUUID()); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus size={16} className="mr-1" />Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Pantry Item</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chicken Breast" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label>Quantity</Label><Input
                      type="text"
                      inputMode="decimal"
                      value={form.quantity}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const v = e.target.value;
                        if (/^\d*\.?\d*$/.test(v)) {
                          setForm(f => ({ ...f, quantity: v }));
                        }
                      }}
                    /></div>
                    <div className="space-y-1"><Label>Unit</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. lb, oz, count" /></div>
                  </div>
                  <div className="space-y-1"><Label>Brand</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Optional" /></div>
                  <div className="space-y-1"><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Category</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{['produce','dairy','proteins','grains','canned','frozen','other'].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Storage</Label>
                      <Select value={form.storageArea} onValueChange={v => setForm(f => ({ ...f, storageArea: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{['pantry','fridge','freezer','counter'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full" disabled={!form.name || addItem.isPending} onClick={() => addItem.mutate(form)}>
                    {addItem.isPending ? 'Adding...' : 'Add Item'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit {editingItem?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.quantity}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const v = e.target.value;
                      if (/^\d*\.?\d*$/.test(v)) {
                        setEditForm(f => ({ ...f, quantity: v }));
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Storage</Label>
                  <Select value={editForm.storageArea} onValueChange={v => setEditForm(f => ({ ...f, storageArea: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['pantry','fridge','freezer','counter'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['produce','dairy','proteins','grains','canned','frozen','other'].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Brand</Label><Input value={editForm.brand} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} placeholder="Optional" /></div>
              <div className="space-y-1"><Label>Expiry Date</Label><Input type="date" value={editForm.expiryDate} onChange={e => setEditForm(f => ({ ...f, expiryDate: e.target.value }))} /></div>
              <Button className="w-full" disabled={updateItem.isPending} onClick={() => updateItem.mutate()}>
                {updateItem.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                className="w-full text-[var(--destructive)]"
                disabled={deleteItem.isPending}
                onClick={() => { if (editingItem) deleteItem.mutate(editingItem.id); }}
              >
                Delete Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="space-y-2 mb-4">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" /><Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map(c => <button key={c} onClick={() => setCat(c)} className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${cat === c ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>{c}</button>)}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STORAGE.map(s => <button key={s} onClick={() => setStorage(s)} className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${storage === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>{s}</button>)}
          </div>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mb-3">{filtered.length} items</p>

        <div className="space-y-2">
          {filtered.map(item => {
            const status = expiryStatus(item.expiryDate);
            return (
              <div
                key={item.id}
                onClick={() => openEdit(item)}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] cursor-pointer hover:bg-[var(--muted)]/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{item.name}</span>
                    {item.brand && <span className="text-xs text-[var(--muted-foreground)]">{item.brand}</span>}
                    {status === 'expired' && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                    {status === 'soon'    && <Badge variant="warning" className="text-xs">Expiring soon</Badge>}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-0.5">
                    {item.quantity} {item.unit} · {item.storageArea ?? 'pantry'}
                    {item.expiryDate && ` · exp. ${item.expiryDate}`}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-[var(--destructive)] shrink-0" onClick={e => { e.stopPropagation(); deleteItem.mutate(item.id); }}>Remove</Button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <div className="text-4xl mb-2">🥫</div>
              <p>No items found. Start adding to your pantry!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface GadgetPost { id: string; title: string; brand?: string; price?: string; discountCode?: string; displayName?: string; likeCount?: number; notes?: string; }

export default function GadgetsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', brand: '', price: '', discountCode: '', notes: '', displayName: '' });

  const { data: posts = [] } = useQuery<GadgetPost[]>({
    queryKey: ['community/gadgets'],
    queryFn: () => fetch('/api/community/gadgets').then(r => r.json()),
    staleTime: 30_000,
  });

  const post = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/community/gadgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, postType: 'recommend' }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community/gadgets'] }); toast.success('Gadget posted!'); setOpen(false); },
    onError: () => toast.error('Failed to post'),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">{posts.length} recommendations</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">Share Gadget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Recommend a Kitchen Gadget</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Brand</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Price</Label><Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="$29.99" /></div>
              </div>
              <div className="space-y-1"><Label>Discount Code</Label><Input value={form.discountCode} onChange={e => setForm(f => ({ ...f, discountCode: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.title || post.isPending} onClick={() => post.mutate(form)}>Post</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{p.title}</p>
                {p.brand && <p className="text-sm text-[var(--muted-foreground)]">{p.brand}{p.price && ` · ${p.price}`}</p>}
                {p.discountCode && <p className="text-xs text-[var(--primary)] font-mono mt-1">Code: {p.discountCode}</p>}
                {p.notes && <p className="text-sm mt-1">{p.notes}</p>}
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No gadget posts yet. Share your favorite kitchen tool!</p>}
      </div>
    </div>
  );
}

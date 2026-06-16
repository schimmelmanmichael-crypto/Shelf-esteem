import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface QAPost { id: string; title: string; body: string; isResolved?: boolean; helpfulCount?: number; replyCount?: number; displayName?: string; }

export default function HelpTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', displayName: '' });

  const { data: posts = [] } = useQuery<QAPost[]>({
    queryKey: ['community/qa'],
    queryFn: () => fetch('/api/community/qa').then(r => r.json()),
    staleTime: 30_000,
  });

  const post = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/community/qa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community/qa'] }); toast.success('Question posted!'); setOpen(false); setForm({ title: '', body: '', displayName: '' }); },
    onError: () => toast.error('Failed to post question'),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">Community Q&A</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">Ask Question</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ask the Community</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1"><Label>Your Name (optional)</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Anonymous" /></div>
              <div className="space-y-1"><Label>Question Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Details</Label><Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} /></div>
              <Button className="w-full" disabled={!form.title || !form.body || post.isPending} onClick={() => post.mutate(form)}>Post Question</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {posts.map(p => (
          <div key={p.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex justify-between items-start mb-1">
              <p className="font-semibold">{p.title}</p>
              {p.isResolved && <Badge variant="success">Resolved</Badge>}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{p.body}</p>
            <div className="flex gap-3 mt-2 text-xs text-[var(--muted-foreground)]">
              <span>👍 {p.helpfulCount ?? 0}</span>
              <span>💬 {p.replyCount ?? 0} replies</span>
              {p.displayName && <span>by {p.displayName}</span>}
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No questions yet. Ask the community anything!</p>}
      </div>
    </div>
  );
}

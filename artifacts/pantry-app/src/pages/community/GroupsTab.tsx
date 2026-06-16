import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface GroupEvent { id: string; title: string; description?: string; eventDate?: string; maxMembers?: number; currentMembers?: number; zipCode?: string; displayName?: string; }

export default function GroupsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', eventDate: '', maxMembers: 10, zipCode: '', displayName: '' });

  const { data: events = [] } = useQuery<GroupEvent[]>({
    queryKey: ['community/groups'],
    queryFn: () => fetch('/api/community/groups').then(r => r.json()),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/community/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community/groups'] }); toast.success('Event created!'); setOpen(false); },
    onError: () => toast.error('Failed to create event'),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">{events.length} upcoming events</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm">Create Event</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Group Event</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1"><Label>Event Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Max Members</Label><Input type="number" value={form.maxMembers} min={2} onChange={e => setForm(f => ({ ...f, maxMembers: Number(e.target.value) }))} /></div>
              </div>
              <div className="space-y-1"><Label>Zip Code</Label><Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.title || create.isPending} onClick={() => create.mutate(form)}>Create Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {events.map(e => (
          <div key={e.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{e.title}</p>
                {e.eventDate && <p className="text-sm text-[var(--muted-foreground)]">📅 {e.eventDate}{e.zipCode && ` · ${e.zipCode}`}</p>}
                {e.description && <p className="text-sm mt-1">{e.description}</p>}
              </div>
              <Badge variant="secondary">{e.currentMembers ?? 1}/{e.maxMembers ?? '?'}</Badge>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-center py-8 text-[var(--muted-foreground)]">No group events. Organize a community cook!</p>}
      </div>
    </div>
  );
}

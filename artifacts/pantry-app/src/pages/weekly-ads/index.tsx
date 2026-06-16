import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface WeeklyAd { id: string; storeName: string; weekOf?: string; status?: string; sourceUrl?: string; }

export default function WeeklyAdsPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [adText, setAdText] = useState('');
  const [storeName, setStoreName] = useState('');

  const { data: ads = [] } = useQuery<WeeklyAd[]>({
    queryKey: ['weekly-ads'],
    queryFn: () => fetch('/api/weekly-ads').then(r => r.json()),
    staleTime: 30_000,
  });

  const parseAd = useMutation({
    mutationFn: () =>
      fetch('/api/weekly-ads/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adText, storeName }) }).then(r => r.json()),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['weekly-ads'] }); toast.success(`Ad parsed — ${d.items?.length ?? 0} items found`); setAddOpen(false); setAdText(''); setStoreName(''); },
    onError: () => toast.error('Parse failed'),
  });

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">Weekly Ads</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" />Upload Ad</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Parse Weekly Ad</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1"><Label>Store Name</Label><Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Publix" /></div>
                <div className="space-y-1">
                  <Label>Ad Text</Label>
                  <textarea className="w-full h-40 rounded-md border border-[var(--border)] bg-[var(--input)] p-3 text-sm resize-none focus:outline-none" value={adText} onChange={e => setAdText(e.target.value)} placeholder="Paste the weekly ad text here..." />
                </div>
                <Button className="w-full" disabled={!adText || !storeName || parseAd.isPending} onClick={() => parseAd.mutate()}>
                  {parseAd.isPending ? 'Parsing...' : 'Parse Ad'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {ads.map(ad => (
            <div key={ad.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
              <div>
                <p className="font-medium">{ad.storeName}</p>
                {ad.weekOf && <p className="text-sm text-[var(--muted-foreground)]">Week of {ad.weekOf}</p>}
              </div>
              <Badge variant={ad.status === 'parsed' ? 'success' : 'secondary'}>{ad.status ?? 'pending'}</Badge>
            </div>
          ))}
          {ads.length === 0 && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <div className="text-4xl mb-2">📰</div>
              <p>No weekly ads yet. Upload one to find deals that match your pantry!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

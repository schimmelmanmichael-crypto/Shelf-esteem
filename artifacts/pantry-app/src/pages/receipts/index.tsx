import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Receipt { id: string; storeName?: string; purchaseDate?: string; total?: string; itemCount?: number; status?: string; }

export default function ReceiptsPage() {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [receiptText, setReceiptText] = useState('');

  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: ['receipts'],
    queryFn: () => fetch('/api/receipts').then(r => r.json()),
    staleTime: 30_000,
  });

  const parseReceipt = useMutation({
    mutationFn: (text: string) =>
      fetch('/api/receipts/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiptText: text }) }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      toast.success(`Parsed! Found ${data.items?.length ?? 0} items.`);
      setUploadOpen(false);
      setReceiptText('');
    },
    onError: () => toast.error('Parse failed'),
  });

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">Receipts</h1>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Upload Receipt</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Parse Receipt</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-[var(--muted-foreground)]">Paste the text from your receipt and Shelfy will extract all items automatically.</p>
                <div className="space-y-1">
                  <Label>Receipt Text</Label>
                  <textarea
                    className="w-full h-40 rounded-md border border-[var(--border)] bg-[var(--input)] p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    placeholder="Paste receipt text here..."
                    value={receiptText}
                    onChange={e => setReceiptText(e.target.value)}
                  />
                </div>
                <Button className="w-full" disabled={!receiptText || parseReceipt.isPending} onClick={() => parseReceipt.mutate(receiptText)}>
                  {parseReceipt.isPending ? 'Parsing...' : 'Parse Receipt'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {receipts.map(r => (
            <div key={r.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
              <div>
                <p className="font-medium">{r.storeName ?? 'Unknown Store'}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {r.purchaseDate} · {r.itemCount ?? 0} items
                  {r.total && ` · $${r.total}`}
                </p>
              </div>
              <Badge variant={r.status === 'confirmed' ? 'success' : 'secondary'}>{r.status ?? 'pending'}</Badge>
            </div>
          ))}
          {receipts.length === 0 && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <div className="text-4xl mb-2">🧾</div>
              <p>No receipts yet. Upload your first receipt to track spending!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

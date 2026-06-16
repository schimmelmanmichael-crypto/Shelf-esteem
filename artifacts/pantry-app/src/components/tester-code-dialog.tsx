import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function TesterCodeDialog() {
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (c: string) =>
      fetch('/api/billing/redeem-tester-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Invalid code');
        return r.json();
      }),
    onSuccess: () => {
      toast.success('Tester code applied! Plan upgraded.');
      qc.invalidateQueries({ queryKey: ['billing-status'] });
      setOpen(false);
      setCode('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Redeem Code</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redeem Tester Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              placeholder="e.g. SHIMMYPLAN"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && mutate(code)}
            />
          </div>
          <Button className="w-full" disabled={isPending || !code} onClick={() => mutate(code)}>
            {isPending ? 'Applying...' : 'Apply Code'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

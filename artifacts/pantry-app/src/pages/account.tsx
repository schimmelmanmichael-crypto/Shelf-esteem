import { useState } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/theme-toggle';

interface BillingStatus { plan: string; trialEndsAt?: string; currentPeriodEnd?: string; }
interface ReferralCode { code: string; redeemCount: number; creditsEarned: number; }

export default function AccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { theme } = useTheme();

  const [testerCodeOpen, setTesterCodeOpen] = useState(false);
  const [testerCode, setTesterCode] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [demoCodeOpen, setDemoCodeOpen] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [referralInput, setReferralInput] = useState('');

  const { data: billing } = useQuery<BillingStatus>({
    queryKey: ['billing-status'],
    queryFn: () => fetch('/api/billing/status').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: referral } = useQuery<ReferralCode>({
    queryKey: ['referral-code'],
    queryFn: () => fetch('/api/referral/my-code').then(r => r.json()),
    staleTime: 60_000,
  });

  const redeemTester = useMutation({
    mutationFn: (code: string) =>
      fetch('/api/billing/redeem-tester-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Tester code redeemed! Plan upgraded.');
      qc.invalidateQueries({ queryKey: ['billing-status'] });
      setTesterCodeOpen(false);
      setTesterCode('');
    },
    onError: () => toast.error('Failed to redeem code'),
  });

  const redeemReferral = useMutation({
    mutationFn: (code: string) =>
      fetch('/api/referral/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Referral code redeemed!');
      qc.invalidateQueries({ queryKey: ['billing-status'] });
      setReferralInput('');
    },
    onError: () => toast.error('Failed to redeem referral code'),
  });

  const activateDemo = useMutation({
    mutationFn: (code: string) =>
      fetch('/api/demo/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Demo mode activated!');
      setDemoCodeOpen(false);
      setDemoCode('');
    },
    onError: () => toast.error('Failed to activate demo'),
  });

  const restoreDemo = useMutation({
    mutationFn: () => fetch('/api/demo/restore', { method: 'POST' }).then(r => r.json()),
    onSuccess: () => { toast.success('Demo data restored.'); qc.invalidateQueries(); },
    onError: () => toast.error('Failed to restore demo'),
  });

  const resetData = useMutation({
    mutationFn: () => fetch('/api/data-reset/reset', { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      toast.success('All data deleted.');
      qc.invalidateQueries();
      setResetOpen(false);
      setResetConfirm('');
    },
    onError: () => toast.error('Reset failed'),
  });

  const managePortal = useMutation({
    mutationFn: () =>
      fetch('/api/billing/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnUrl: window.location.href }) }).then(r => r.json()),
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: () => toast.error('Could not open billing portal'),
  });

  const planLabel = billing?.plan ?? 'free';
  const isTrialing = !!billing?.trialEndsAt;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="font-semibold">{user?.fullName ?? user?.username ?? 'User'}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{user?.primaryEmailAddress?.emailAddress}</p>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">Theme: <span className="font-medium capitalize">{theme}</span></span>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Plan & Billing */}
      <Card>
        <CardHeader><CardTitle>Plan & Billing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={planLabel === 'free' ? 'secondary' : 'default'} className="capitalize">{planLabel}</Badge>
            {isTrialing && <Badge variant="warning">Trial</Badge>}
          </div>
          {billing?.trialEndsAt && (
            <p className="text-sm text-[var(--muted-foreground)]">Trial ends {new Date(billing.trialEndsAt).toLocaleDateString()}</p>
          )}
          {billing?.currentPeriodEnd && !isTrialing && (
            <p className="text-sm text-[var(--muted-foreground)]">Renews {new Date(billing.currentPeriodEnd).toLocaleDateString()}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => setLocation('/pricing')}>Upgrade Plan</Button>
            {planLabel !== 'free' && (
              <Button size="sm" variant="outline" onClick={() => managePortal.mutate()} disabled={managePortal.isPending}>
                Manage Subscription
              </Button>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">Have a tester code?</p>
            <Dialog open={testerCodeOpen} onOpenChange={setTesterCodeOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline">Redeem Tester Code</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Redeem Tester Code</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1"><Label>Code</Label><Input value={testerCode} onChange={e => setTesterCode(e.target.value)} placeholder="SHELF-XXXX" /></div>
                  <Button className="w-full" disabled={!testerCode || redeemTester.isPending} onClick={() => redeemTester.mutate(testerCode)}>Redeem</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Referrals */}
      <Card>
        <CardHeader><CardTitle>Referrals</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {referral && (
            <div className="p-3 rounded-lg bg-[var(--muted)] space-y-1">
              <p className="text-xs text-[var(--muted-foreground)]">Your referral code</p>
              <p className="font-mono text-lg font-bold tracking-widest">{referral.code}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{referral.redeemCount} redeems · {referral.creditsEarned} credits earned</p>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(referral.code); toast.success('Copied!'); }}>Copy Code</Button>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">Have a friend's referral code?</p>
            <div className="flex gap-2">
              <Input value={referralInput} onChange={e => setReferralInput(e.target.value)} placeholder="Enter code" className="flex-1" />
              <Button size="sm" disabled={!referralInput || redeemReferral.isPending} onClick={() => redeemReferral.mutate(referralInput)}>Redeem</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Mode */}
      <Card>
        <CardHeader><CardTitle>Demo Mode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">Load sample data to explore Shelf Esteem features, or restore if you activated demo previously.</p>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={demoCodeOpen} onOpenChange={setDemoCodeOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline">Activate Demo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Activate Demo Mode</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1"><Label>Demo Seed Code</Label><Input value={demoCode} onChange={e => setDemoCode(e.target.value)} placeholder="DEMO-XXXX" /></div>
                  <Button className="w-full" disabled={!demoCode || activateDemo.isPending} onClick={() => activateDemo.mutate(demoCode)}>Activate</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={() => restoreDemo.mutate()} disabled={restoreDemo.isPending}>Restore Demo Data</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader><CardTitle>Data & Privacy</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">Permanently delete all your pantry, receipts, leftovers, meal plans, and shopping list data. This cannot be undone.</p>
          <Dialog open={resetOpen} onOpenChange={open => { setResetOpen(open); if (!open) setResetConfirm(''); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950">Delete All My Data</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Delete All Data</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-[var(--muted-foreground)]">This will permanently erase all your data. Type <strong>DELETE</strong> to confirm.</p>
                <Input value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="DELETE" />
                <Button variant="destructive" className="w-full" disabled={resetConfirm !== 'DELETE' || resetData.isPending} onClick={() => resetData.mutate()}>
                  Permanently Delete Everything
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="outline" className="w-full" onClick={() => signOut(() => setLocation('/sign-in'))}>Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  );
}

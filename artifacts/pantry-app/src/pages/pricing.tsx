import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const PLAN_NAMES = ['Free', 'Pro', 'Plus', 'Family', 'Restaurant'];

const PLAN_FEATURES: Record<string, string[]> = {
  Free:       ['25 pantry items', '5 recipes', 'Basic shopping list', 'Community access'],
  Pro:        ['Unlimited pantry', 'Unlimited recipes', 'AI coupon finder', 'Receipt scanning', 'Weekly ads'],
  Plus:       ['Everything in Pro', 'Household sharing', 'Spending analytics', 'Price alerts', 'Deal matching'],
  Family:     ['Everything in Plus', 'Up to 6 household members', 'Shared pantry & meal plan'],
  Restaurant: ['Everything in Family', 'Bulk import', 'Restaurant-grade portions', 'Priority support'],
};

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const { data: products = [], isLoading } = useQuery<Array<{ id: string; name: string; default_price?: { unit_amount: number; id: string } }>>({
    queryKey: ['billing-products'],
    queryFn: () => fetch('/api/billing/products').then(r => r.json()),
    staleTime: 300_000,
  });

  const { mutate: checkout } = useMutation({
    mutationFn: (priceId: string) =>
      fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, annual }),
      }).then(r => r.json()).then(d => { if (d.url) window.location.href = d.url; }),
    onError: () => toast.error('Redirect to checkout failed'),
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] px-6 py-4 flex justify-between items-center">
        <Link href="/"><a className="flex items-center gap-2"><span className="text-2xl">🥫</span><span className="font-black text-xl">Shelf Esteem</span></a></Link>
        <Button variant="ghost" asChild><Link href="/sign-in">Sign In</Link></Button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4">Simple, honest pricing</h1>
          <p className="text-[var(--muted-foreground)] text-lg mb-6">14-day free trial on all paid plans. No credit card required.</p>
          <div className="inline-flex items-center gap-3 border border-[var(--border)] rounded-full p-1 bg-[var(--muted)]">
            <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!annual ? 'bg-[var(--card)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)}  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${annual  ? 'bg-[var(--card)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}>Annual <Badge variant="success" className="ml-1">Save 20%</Badge></button>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {PLAN_NAMES.map((name, i) => {
            const product = products.find(p => p.name?.toLowerCase().includes(name.toLowerCase()));
            const price = product?.default_price?.unit_amount;
            const priceId = product?.default_price?.id;
            const monthly = price ? (annual ? Math.round(price * 0.8 / 100) : price / 100) : 0;
            const isPopular = name === 'Plus';
            const isFree = name === 'Free';

            return (
              <Card key={name} className={`relative ${isPopular ? 'border-[var(--primary)] shadow-lg' : ''}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{name}</CardTitle>
                  <div className="mt-2">
                    {isFree ? (
                      <span className="text-3xl font-black">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-black">${monthly.toFixed(2)}</span>
                        <span className="text-[var(--muted-foreground)] text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  {!isFree && <Badge variant="secondary" className="mt-1 text-xs">14-day free trial</Badge>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {(PLAN_FEATURES[name] ?? []).map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-[var(--primary)] mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {isFree ? (
                    <Button variant="outline" className="w-full" asChild><Link href="/sign-up">Start Free</Link></Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                      disabled={!priceId}
                      onClick={() => priceId && checkout(priceId)}
                    >
                      {isLoading ? 'Loading...' : 'Get Started'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

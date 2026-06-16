import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Deal { id: string; name: string; storeName?: string; salePrice?: string; regularPrice?: string; weekOf?: string; }
interface StoreComparison { store: string; lowest: number; prices: number[]; }

export default function DealsPage() {
  const [compareItem, setCompareItem] = useState('');
  const [search, setSearch] = useState('');

  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ['deals'],
    queryFn: () => fetch('/api/deals').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: comparison = [], refetch: runComparison } = useQuery<StoreComparison[]>({
    queryKey: ['deals/price-comparison', search],
    queryFn: () => fetch(`/api/deals/price-comparison?item=${encodeURIComponent(search)}`).then(r => r.json()),
    enabled: false,
    staleTime: 60_000,
  });

  return (
    <Layout>
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black mb-4">Deals</h1>

        <Tabs defaultValue="deals">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="deals" className="flex-1">Deals For You</TabsTrigger>
            <TabsTrigger value="compare" className="flex-1">Price Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="deals">
            <div className="space-y-2">
              {deals.map(d => (
                <div key={d.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{d.storeName} {d.weekOf && `· Week of ${d.weekOf}`}</p>
                  </div>
                  <div className="text-right">
                    {d.salePrice && <p className="font-bold text-[var(--primary)]">${d.salePrice}</p>}
                    {d.regularPrice && <p className="text-xs text-[var(--muted-foreground)] line-through">${d.regularPrice}</p>}
                  </div>
                </div>
              ))}
              {deals.length === 0 && (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                  <div className="text-4xl mb-2">🏷️</div>
                  <p>No deals found. Upload a weekly ad to see deals that match your pantry!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="compare">
            <div className="flex gap-2 mb-4">
              <Input value={compareItem} onChange={e => setCompareItem(e.target.value)} placeholder="e.g. chicken breast" />
              <button onClick={() => { setSearch(compareItem); setTimeout(() => runComparison(), 0); }} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium">Compare</button>
            </div>
            <div className="space-y-2">
              {comparison.map(c => (
                <div key={c.store} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                  <p className="font-medium">{c.store}</p>
                  <div className="text-right">
                    <p className="font-bold text-[var(--primary)]">${c.lowest.toFixed(2)} lowest</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{c.prices.length} purchases</p>
                  </div>
                </div>
              ))}
              {search && comparison.length === 0 && (
                <p className="text-center py-6 text-[var(--muted-foreground)]">No price history for "{search}". Add receipts to build history.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

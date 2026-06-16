import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PantryItem { id: string; name: string; barcode?: string; quantity: string; unit: string; category?: string; createdAt?: string; }

export default function InventoryPage() {
  const { data: items = [] } = useQuery<PantryItem[]>({
    queryKey: ['pantry'],
    queryFn: () => fetch('/api/pantry').then(r => r.json()),
    staleTime: 30_000,
  });

  const sorted = [...items].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  return (
    <Layout>
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black">Inventory</h1>
          <Button asChild size="sm">
            <Link href="/pantry/scan">📷 Scan</Link>
          </Button>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">{items.length} total items — sorted by most recently added</p>
        <div className="space-y-2">
          {sorted.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {item.quantity} {item.unit}
                  {item.barcode && <span className="ml-2 font-mono text-xs">{item.barcode}</span>}
                </div>
              </div>
              {item.category && <Badge variant="secondary" className="capitalize">{item.category}</Badge>}
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <p className="text-4xl mb-2">📦</p>
              <p>No pantry items yet. <Link href="/pantry"><a className="text-[var(--primary)] underline">Add some!</a></Link></p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

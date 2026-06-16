import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#ea580c'];

export default function SpendingPage() {
  const { data: summary } = useQuery<{ thisMonthTotal: string; avgPerTrip: string; tripCount: number }>({
    queryKey: ['spending/summary'],
    queryFn: () => fetch('/api/spending/summary').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: byMonth = [] } = useQuery<Array<{ month: string; total: string }>>({
    queryKey: ['spending/by-month'],
    queryFn: () => fetch('/api/spending/by-month').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: byStore = [] } = useQuery<Array<{ store: string; total: string }>>({
    queryKey: ['spending/by-store'],
    queryFn: () => fetch('/api/spending/by-store').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: byCategory = [] } = useQuery<Array<{ category: string; total: string }>>({
    queryKey: ['spending/by-category'],
    queryFn: () => fetch('/api/spending/by-category').then(r => r.json()),
    staleTime: 30_000,
  });

  return (
    <Layout>
      <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-black mb-4">Spending Analytics</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'This Month', value: `$${summary?.thisMonthTotal ?? '0.00'}` },
            { label: 'Avg per Trip',  value: `$${summary?.avgPerTrip ?? '0.00'}` },
            { label: 'Trips',         value: summary?.tripCount ?? 0 },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-black text-[var(--primary)]">{s.value}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* By Month */}
        {byMonth.length > 0 && (
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-base">Monthly Spending</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byMonth.map(d => ({ ...d, total: Number(d.total) }))}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']} />
                  <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* By Store */}
          {byStore.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">By Store</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={byStore.map(d => ({ ...d, total: Number(d.total) }))} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="store" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']} />
                    <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* By Category */}
          {byCategory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">By Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={byCategory.map(d => ({ ...d, value: Number(d.total) }))} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={60} label={({ category }) => category}>
                      {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {byMonth.length === 0 && byStore.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <div className="text-4xl mb-2">📊</div>
            <p>No spending data yet. Complete a purchase to see analytics!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

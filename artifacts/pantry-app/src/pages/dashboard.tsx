import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const GREETINGS = [
  "Your pantry is waiting. Let's see what Shelfy can find.",
  "Good to see you. Any mystery items in the back of the fridge?",
  "Time to check those expiry dates. Shelfy's on it.",
  "What are we cooking today? Let's find out.",
  "The pantry doesn't lie. Shelfy does the math.",
];

function todaysGreeting() {
  const d = new Date().getDate();
  return GREETINGS[d % GREETINGS.length];
}

export default function Dashboard() {
  const { scores } = usePlanLimits();

  const { data: pantryData } = useQuery<{
    itemCount: number;
    expiringSoon: unknown[];
    expired: unknown[];
    shelfScore: number;
  }>({
    queryKey: ['pantry/summary'],
    queryFn: () => fetch('/api/pantry/summary').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: mealPlans = [] } = useQuery<Array<{ id: string; date: string; mealSlot: string; customName?: string }>>({
    queryKey: ['meal-plan'],
    queryFn: () => fetch('/api/meal-plan').then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: spendSummary } = useQuery<{ thisMonthTotal: string; tripCount: number }>({
    queryKey: ['spending/summary'],
    queryFn: () => fetch('/api/spending/summary').then(r => r.json()),
    staleTime: 30_000,
  });

  const today = new Date().toISOString().split('T')[0];
  const upcomingMeals = mealPlans
    .filter(m => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[var(--foreground)]">Dashboard</h1>
          <p className="text-[var(--muted-foreground)] mt-1">{todaysGreeting()}</p>
        </div>

        {/* Score badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Shelf Score',   value: pantryData?.shelfScore ?? scores.shelfScore,   color: '#16a34a', icon: '📦' },
            { label: 'Savings Score', value: `$${scores.savingsScore}`,                     color: '#2563eb', icon: '💰' },
            { label: 'Waste Score',   value: scores.wasteScore,                              color: '#dc2626', icon: '🗑️' },
            { label: 'Shelf Streak',  value: `${scores.shelfStreak}d`,                      color: '#d97706', icon: '🔥' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
              <span className="text-xs text-[var(--muted-foreground)] mt-1">{s.icon} {s.label}</span>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Pantry Health */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📦 Pantry Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-black text-[var(--primary)]">{pantryData?.itemCount ?? 0} <span className="text-base font-normal text-[var(--muted-foreground)]">items</span></p>
              {(pantryData?.expiringSoon?.length ?? 0) > 0 && (
                <Badge variant="warning">⚠️ {pantryData?.expiringSoon.length} expiring soon</Badge>
              )}
              {(pantryData?.expired?.length ?? 0) > 0 && (
                <Badge variant="destructive">❌ {pantryData?.expired.length} expired</Badge>
              )}
              <Button variant="outline" size="sm" asChild className="w-full mt-2">
                <Link href="/pantry">View Pantry</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Meals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📅 Upcoming Meals</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMeals.length === 0 ? (
                <p className="text-[var(--muted-foreground)] text-sm">No meals planned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingMeals.map(m => (
                    <li key={m.id} className="flex justify-between items-center text-sm">
                      <span>{m.customName ?? 'Planned meal'}</span>
                      <Badge variant="secondary">{m.mealSlot}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" asChild className="w-full mt-3">
                <Link href="/meal-plan">Meal Plan</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Spending Snapshot */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">💰 This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-[#2563eb]">${spendSummary?.thisMonthTotal ?? '0.00'}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{spendSummary?.tripCount ?? 0} shopping trips</p>
              <Button variant="outline" size="sm" asChild className="w-full mt-3">
                <Link href="/spending">View Spending</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">⚡ Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { href: '/pantry',    label: '+ Add Item' },
                { href: '/pantry/scan', label: '📷 Scan Barcode' },
                { href: '/recipes',  label: '🍳 Find Recipes' },
                { href: '/shopping', label: '🛒 Shopping List' },
              ].map(a => (
                <Button key={a.href} variant="outline" size="sm" asChild>
                  <Link href={a.href}>{a.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating quick-add */}
      <Link href="/pantry">
        <a className="fixed bottom-24 right-4 z-40 bg-[var(--primary)] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity">
          <Plus size={24} />
        </a>
      </Link>
    </Layout>
  );
}

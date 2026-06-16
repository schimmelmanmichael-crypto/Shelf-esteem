import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const POSITIONS = [
  'Stop buying what you already own.',
  'Know exactly what\'s in your fridge.',
  'Cook more. Waste less. Save more.',
];

const FEATURES = [
  { icon: '📦', title: 'Smart Pantry', desc: 'Track every item with expiry dates, categories, and quantities.' },
  { icon: '⏰', title: 'Expiration Alerts', desc: 'Shelfy warns you before food goes bad so nothing gets wasted.' },
  { icon: '🍳', title: 'Recipe Matching', desc: 'See exactly which recipes you can cook right now from what you have.' },
  { icon: '🛒', title: 'Auto Shopping List', desc: 'Plan meals for the week and your shopping list builds itself.' },
  { icon: '🏷️', title: 'Deal Matching', desc: 'Find coupons and sale items that match your actual shopping list.' },
  { icon: '👥', title: 'Community', desc: 'Share recipes, spot deals, and swap pantry items with neighbors.' },
];

export default function Landing() {
  const [posIdx, setPosIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPosIdx(i => (i + 1) % POSITIONS.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥫</span>
          <span className="font-black text-xl">Shelf Esteem</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link href="/pricing">Pricing</Link></Button>
          <Button variant="ghost" asChild><Link href="/sign-in">Sign In</Link></Button>
          <Button asChild><Link href="/sign-up">Start Free</Link></Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <Badge className="mb-6 text-sm">14-day free trial — no credit card</Badge>
        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4 text-[var(--foreground)]">
          <AnimatePresence mode="wait">
            <motion.span
              key={posIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="block text-[var(--primary)]"
            >
              {POSITIONS[posIdx]}
            </motion.span>
          </AnimatePresence>
        </h1>
        <p className="text-xl text-[var(--muted-foreground)] mb-8 max-w-2xl mx-auto">
          Shelf Esteem is the kitchen management app that tracks your pantry, plans your meals, builds your shopping list, and finds you deals — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild className="text-base px-8">
            <Link href="/sign-up">Start Free Trial →</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base px-8">
            <Link href="/pricing">See Plans</Link>
          </Button>
        </div>
      </section>

      {/* Gamification preview */}
      <section className="max-w-2xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Shelf Score', value: '92', color: '#16a34a', icon: '📦' },
            { label: 'Savings Score', value: '$47', color: '#2563eb', icon: '💰' },
            { label: 'Waste Score', value: '3', color: '#dc2626', icon: '🗑️' },
            { label: 'Shelf Streak', value: '12', color: '#d97706', icon: '🔥' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
              <span className="text-xs text-[var(--muted-foreground)] mt-1">{s.icon} {s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-black text-center mb-12">Everything your kitchen needs</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="p-6 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-[var(--muted-foreground)] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--primary)] py-16 px-6 text-center">
        <h2 className="text-3xl font-black text-white mb-4">Ready to own your pantry?</h2>
        <p className="text-white/80 mb-8 text-lg">Join thousands saving money and wasting less food every week.</p>
        <Button size="lg" variant="secondary" asChild className="text-base px-8">
          <Link href="/sign-up">Start Free Trial →</Link>
        </Button>
      </section>

      <footer className="py-8 text-center text-[var(--muted-foreground)] text-sm border-t border-[var(--border)]">
        <p>© 2026 Shelf Esteem — Third Act Studios</p>
        <p className="mt-1">Shelfy says: stop buying what you already own. 🥫</p>
      </footer>
    </div>
  );
}

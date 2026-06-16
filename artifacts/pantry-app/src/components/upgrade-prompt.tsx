import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { type ReactNode } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';

// TEST_MODE: all limits are Infinity — this never blocks
export function GatedFeature({ children }: { feature: string; children: ReactNode }) {
  return <>{children}</>;
}

export function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center rounded-xl border border-[var(--border)] bg-[var(--muted)]">
      <div className="text-4xl">🔒</div>
      <p className="font-semibold">Upgrade to unlock {feature}</p>
      <Button asChild>
        <Link href="/pricing">View Plans</Link>
      </Button>
    </div>
  );
}

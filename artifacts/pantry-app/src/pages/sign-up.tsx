import { SignUp } from '@clerk/react';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🥫</div>
          <h1 className="text-2xl font-black">Start Your Free Trial</h1>
          <p className="text-[var(--muted-foreground)] text-sm">14 days free — no credit card required</p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <SignUp
          appearance={{ baseTheme: resolvedTheme === 'dark' ? dark : undefined } as any}
          forceRedirectUrl="/meal-plan"
        />
      </div>
    </div>
  );
}

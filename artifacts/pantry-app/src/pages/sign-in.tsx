import { SignIn } from '@clerk/react';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

export default function SignInPage() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🥫</div>
          <h1 className="text-2xl font-black">Shelf Esteem</h1>
          <p className="text-[var(--muted-foreground)] text-sm">Stop Buying What You Already Own</p>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <SignIn
          appearance={{ baseTheme: resolvedTheme === 'dark' ? dark : undefined } as any}
          forceRedirectUrl="/meal-plan"
        />
      </div>
    </div>
  );
}

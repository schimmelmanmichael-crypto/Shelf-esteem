import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';

export default function CheckoutComplete() {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-black">You're all set!</h1>
        <p className="text-[var(--muted-foreground)] text-lg max-w-md">
          Your subscription is now active. Shelfy is ready to help you save money and waste less food.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button asChild><Link href="/pantry">Go to Pantry</Link></Button>
          <Button variant="outline" asChild><Link href="/dashboard">Dashboard</Link></Button>
        </div>
      </div>
    </Layout>
  );
}

import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center bg-[var(--background)]">
      <div className="text-6xl">🥫</div>
      <h1 className="text-4xl font-black">404</h1>
      <p className="text-[var(--muted-foreground)] text-lg">Page not found. Shelfy looked everywhere.</p>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}

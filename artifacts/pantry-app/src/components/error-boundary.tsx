import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <div className="text-6xl">🥫</div>
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-[var(--muted-foreground)]">Shelfy hit a snag. Try refreshing.</p>
          <Button onClick={() => window.location.reload()}>Refresh page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

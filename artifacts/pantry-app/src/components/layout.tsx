import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useUser } from '@clerk/react';
import {
  Home, Package, BookOpen, ShoppingCart, Calendar, Users,
  DollarSign, RefreshCcw, User, BarChart2, Tag, FileText,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { ShelfyMicButton } from './shelfy-mic-button';
import { HelpButton } from './help-button';
import { HelpSlide } from './help-slide';
import { OnboardingOverlay } from './onboarding';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard', icon: Home },
  { href: '/pantry',     label: 'Pantry',    icon: Package },
  { href: '/recipes',    label: 'Recipes',   icon: BookOpen },
  { href: '/shopping',   label: 'Shopping',  icon: ShoppingCart },
  { href: '/meal-plan',  label: 'Meal Plan', icon: Calendar },
  { href: '/deals',      label: 'Deals',     icon: Tag },
  { href: '/receipts',   label: 'Receipts',  icon: FileText },
  { href: '/spending',   label: 'Spending',  icon: BarChart2 },
  { href: '/leftovers',  label: 'Leftovers', icon: RefreshCcw },
  { href: '/community',  label: 'Community', icon: Users },
  { href: '/account',    label: 'Account',   icon: User },
];

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link href={href}>
      <a
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]'
        )}
      >
        <Icon size={18} />
        <span>{label}</span>
      </a>
    </Link>
  );
}

function MobileNavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link href={href}>
      <a className="flex flex-col items-center gap-1 px-3 py-2 min-w-[52px]">
        <Icon
          size={22}
          className={active ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}
        />
        {active && <div className="w-1 h-1 rounded-full bg-[var(--primary)]" />}
      </a>
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <OnboardingOverlay />
      <HelpSlide />

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 w-64 border-r border-[var(--border)] bg-[var(--card)] flex flex-col z-30">
          <div className="p-4 border-b border-[var(--border)]">
            <Link href="/dashboard">
              <a className="flex items-center gap-2">
                <span className="text-2xl">🥫</span>
                <span className="font-black text-lg text-[var(--foreground)]">Shelf Esteem</span>
              </a>
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.href} {...item} active={location.startsWith(item.href)} />
            ))}
          </nav>

          <div className="p-3 border-t border-[var(--border)] flex items-center justify-between">
            <ThemeToggle />
            <HelpButton />
            {user && (
              <div className="flex items-center gap-2">
                <img
                  src={user.imageUrl}
                  alt={user.firstName ?? 'User'}
                  className="w-8 h-8 rounded-full"
                />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={cn('min-h-screen', !isMobile ? 'ml-64' : 'pb-20')}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-[var(--card)] border-t border-[var(--border)] overflow-x-auto">
          <div className="flex items-center">
            {NAV_ITEMS.map(item => (
              <MobileNavItem key={item.href} {...item} active={location.startsWith(item.href)} />
            ))}
            <div className="px-2 py-2 shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      )}

      <ShelfyMicButton />
    </div>
  );
}

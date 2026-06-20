import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { ClerkProvider, useAuth } from '@clerk/react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Router, Route, Switch, Redirect } from 'wouter';
import { Toaster } from 'sonner';
import { HelpProvider } from './context/help-context';

// Pages
import Landing        from './pages/landing';
import Pricing        from './pages/pricing';
import Dashboard      from './pages/dashboard';
import Account        from './pages/account';
import Manual         from './pages/manual';
import NotFound       from './pages/not-found';
import PantryPage     from './pages/pantry/index';
import ScanPage       from './pages/pantry/scan';
import InventoryPage  from './pages/inventory/index';
import RecipesPage    from './pages/recipes/index';
import RecipeDetail   from './pages/recipes/detail';
import ShoppingPage   from './pages/shopping/index';
import CheckoutComplete from './pages/shopping/checkout-complete';
import ReceiptsPage   from './pages/receipts/index';
import DealsPage      from './pages/deals/index';
import WeeklyAdsPage  from './pages/weekly-ads/index';
import MealPlanPage   from './pages/meal-plan/index';
import SpendingPage   from './pages/spending/index';
import LeftoversPage  from './pages/leftovers/index';
import CommunityPage  from './pages/community/index';
import SignInPage     from './pages/sign-in';
import SignUpPage     from './pages/sign-up';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AuthCacheSync({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  useEffect(() => { qc.clear(); }, [userId]);
  return <>{children}</>;
}

function ProtectedRoute({ component: C }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <C />;
}

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <Redirect to="/meal-plan" /> : <Landing />;
}

export default function App() {
  const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ClerkProvider
        publishableKey={pk}
        routerPush={(to) => window.history.pushState({}, '', to)}
        routerReplace={(to) => window.history.replaceState({}, '', to)}
      >
        <QueryClientProvider client={queryClient}>
          <HelpProvider>
            <AuthCacheSync>
              <Router>
                <Switch>
                  <Route path="/"                         component={HomeRedirect} />
                  <Route path="/sign-in"                  component={SignInPage} />
                  <Route path="/sign-up"                  component={SignUpPage} />
                  <Route path="/pricing"                  component={Pricing} />
                  <Route path="/dashboard"                component={() => <ProtectedRoute component={Dashboard} />} />
                  <Route path="/pantry"                   component={() => <ProtectedRoute component={PantryPage} />} />
                  <Route path="/pantry/scan"              component={() => <ProtectedRoute component={ScanPage} />} />
                  <Route path="/inventory"                component={() => <ProtectedRoute component={InventoryPage} />} />
                  <Route path="/recipes"                  component={() => <ProtectedRoute component={RecipesPage} />} />
                  <Route path="/recipes/:id"              component={() => <ProtectedRoute component={RecipeDetail} />} />
                  <Route path="/shopping"                 component={() => <ProtectedRoute component={ShoppingPage} />} />
                  <Route path="/shopping/checkout-complete" component={() => <ProtectedRoute component={CheckoutComplete} />} />
                  <Route path="/receipts"                 component={() => <ProtectedRoute component={ReceiptsPage} />} />
                  <Route path="/deals"                    component={() => <ProtectedRoute component={DealsPage} />} />
                  <Route path="/weekly-ads"               component={() => <ProtectedRoute component={WeeklyAdsPage} />} />
                  <Route path="/meal-plan"                component={() => <ProtectedRoute component={MealPlanPage} />} />
                  <Route path="/spending"                 component={() => <ProtectedRoute component={SpendingPage} />} />
                  <Route path="/leftovers"                component={() => <ProtectedRoute component={LeftoversPage} />} />
                  <Route path="/community"                component={CommunityPage} />
                  <Route path="/account"                  component={() => <ProtectedRoute component={Account} />} />
                  <Route path="/manual"                   component={() => <ProtectedRoute component={Manual} />} />
                  <Route component={NotFound} />
                </Switch>
              </Router>
            </AuthCacheSync>
            <Toaster richColors position="top-right" />
          </HelpProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}

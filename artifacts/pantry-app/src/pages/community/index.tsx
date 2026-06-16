import { Layout } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RecipesTab      from './RecipesTab';
import SaleAlertsTab   from './SaleAlertsTab';
import PantryShareTab  from './PantryShareTab';
import ChallengesTab   from './ChallengesTab';
import GadgetsTab      from './GadgetsTab';
import GroupsTab       from './GroupsTab';
import HelpTab         from './HelpTab';

export default function CommunityPage() {
  return (
    <Layout>
      <div className="p-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-black mb-4">Community</h1>
        <Tabs defaultValue="recipes">
          <TabsList className="flex flex-wrap gap-1 h-auto mb-4 bg-[var(--muted)] p-1 rounded-lg">
            {['recipes','sale-alerts','pantry-shares','challenges','gadgets','groups','qa'].map(tab => (
              <TabsTrigger key={tab} value={tab} className="text-xs capitalize">
                {tab.replace('-', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="recipes"><RecipesTab /></TabsContent>
          <TabsContent value="sale-alerts"><SaleAlertsTab /></TabsContent>
          <TabsContent value="pantry-shares"><PantryShareTab /></TabsContent>
          <TabsContent value="challenges"><ChallengesTab /></TabsContent>
          <TabsContent value="gadgets"><GadgetsTab /></TabsContent>
          <TabsContent value="groups"><GroupsTab /></TabsContent>
          <TabsContent value="qa"><HelpTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelp } from '@/context/help-context';

export function HelpButton() {
  const { openHelp } = useHelp();
  return (
    <Button variant="ghost" size="icon" onClick={() => openHelp()} aria-label="Help">
      <HelpCircle size={18} />
    </Button>
  );
}

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ShelfyMicButton() {
  const [active, setActive] = useState(false);

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="icon"
      className="fixed bottom-24 right-4 z-40 h-12 w-12 rounded-full shadow-lg"
      onClick={() => setActive(a => !a)}
      aria-label="Voice input"
    >
      {active ? <MicOff size={20} /> : <Mic size={20} />}
    </Button>
  );
}

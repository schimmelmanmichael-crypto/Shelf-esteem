import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { icon: '🥫', title: 'Your Pantry', body: 'Track everything you own. No more buying what you already have.' },
  { icon: '📷', title: 'Scan Barcodes', body: 'Add items instantly by scanning the barcode with your phone camera.' },
  { icon: '🍳', title: 'Cook From Stock', body: 'Discover recipes you can make right now with what\'s in your pantry.' },
  { icon: '🛒', title: 'Smart Shopping', body: 'Your meal plan auto-generates your shopping list — and Shelfy finds coupons.' },
  { icon: '📅', title: 'Plan Your Week', body: 'Plan meals for the week and never wonder "what\'s for dinner?" again.' },
];

export function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('shelfy-onboarded')) {
      setVisible(true);
    }
  }, []);

  function finish() {
    localStorage.setItem('shelfy-onboarded', '1');
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--card)] rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <div className="text-6xl mb-4">{current?.icon}</div>
        <h2 className="text-2xl font-black mb-2">{current?.title}</h2>
        <p className="text-[var(--muted-foreground)] mb-8">{current?.body}</p>
        <div className="flex gap-1 justify-center mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-2 w-8 rounded-full transition-colors ${i === step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={finish}>Skip</Button>
          <Button className="flex-1" onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : finish()}>
            {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
          </Button>
        </div>
      </div>
    </div>
  );
}

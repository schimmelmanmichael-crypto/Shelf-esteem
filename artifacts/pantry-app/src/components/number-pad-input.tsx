import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NumberPadInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberPadInput({ value, onChange, min = 0, max = 9999, step = 1 }: NumberPadInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
      >
        <Minus size={16} />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={e => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="text-center text-lg font-bold h-10"
        min={min}
        max={max}
        step={step}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}

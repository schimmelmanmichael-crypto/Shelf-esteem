import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';

interface PantryItem { id: string; name: string; }

interface PantryTypeaheadProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function PantryTypeahead({ value, onChange, placeholder = 'Search pantry items...' }: PantryTypeaheadProps) {
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery<PantryItem[]>({
    queryKey: ['pantry'],
    queryFn: () => fetch('/api/pantry').then(r => r.json()),
    staleTime: 30_000,
  });

  const filtered = items
    .filter(i => i.name.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-[var(--border)] bg-[var(--popover)] shadow-md">
          {filtered.map(item => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              onMouseDown={() => { onChange(item.name); setOpen(false); }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

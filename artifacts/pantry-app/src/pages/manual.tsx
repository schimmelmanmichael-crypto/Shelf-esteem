import { useState } from 'react';
import { helpContent } from '@/data/help-content';
import { cn } from '@/lib/utils';

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-semibold mt-3 mb-1">{line.slice(2, -2)}</p>;
    }
    const parts = line.split(/\*\*(.*?)\*\*/g);
    if (parts.length > 1) {
      return (
        <p key={i} className="text-sm text-[var(--foreground)]">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        </p>
      );
    }
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-[var(--muted-foreground)]">{line}</p>;
  });
}

export default function ManualPage() {
  const [active, setActive] = useState(helpContent[0]?.id ?? '');
  const section = helpContent.find(s => s.id === active);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">User Guide</h1>
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="hidden md:flex flex-col gap-1 w-48 shrink-0">
          {helpContent.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                'text-left px-3 py-2 rounded-lg text-sm transition-colors',
                active === s.id
                  ? 'bg-[var(--primary)] text-white font-medium'
                  : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
              )}
            >
              {s.title}
            </button>
          ))}
        </nav>

        {/* Mobile select */}
        <div className="md:hidden w-full mb-4">
          <select
            value={active}
            onChange={e => setActive(e.target.value)}
            className="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
          >
            {helpContent.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {section && (
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <h2 className="text-xl font-bold mb-4">{section.title}</h2>
              <div>{renderContent(section.content)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

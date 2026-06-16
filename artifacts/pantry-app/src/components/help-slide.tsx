import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useHelp } from '@/context/help-context';
import { helpContent } from '@/data/help-content';
import { ScrollArea } from '@/components/ui/scroll-area';

export function HelpSlide() {
  const { isOpen, currentSection, closeHelp } = useHelp();
  const section = helpContent.find(s => s.id === currentSection) ?? helpContent[0];

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && closeHelp()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>📖 {section?.title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="mt-4 h-full pb-16">
          <div className="space-y-4 pr-4">
            {section?.content.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-line">
                {para}
              </p>
            ))}
          </div>
          <div className="mt-8 border-t border-[var(--border)] pt-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-2">More topics:</p>
            <ul className="space-y-1">
              {helpContent.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => { /* openHelp called via context */ }}
                    className="text-sm text-[var(--primary)] hover:underline text-left"
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

import { createContext, useContext, useState, type ReactNode } from 'react';

interface HelpContextValue {
  isOpen: boolean;
  currentSection: string;
  openHelp: (section?: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextValue>({
  isOpen: false,
  currentSection: 'getting-started',
  openHelp: () => {},
  closeHelp: () => {},
});

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState('getting-started');

  return (
    <HelpContext.Provider value={{
      isOpen,
      currentSection,
      openHelp: (section = 'getting-started') => { setCurrentSection(section); setIsOpen(true); },
      closeHelp: () => setIsOpen(false),
    }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  return useContext(HelpContext);
}

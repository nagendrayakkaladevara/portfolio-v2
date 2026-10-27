import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/src/hooks/use-preferences';
import { playSound } from '@/src/lib/sound';
import { ChatWidget } from '@/src/features/chat/chat-widget';

type Cue = Parameters<typeof playSound>[0];
const SoundContext = createContext<{ enabled: boolean; toggle: () => void; cue: (name: Cue) => void }>({ enabled: false, toggle: () => {}, cue: () => {} });
export function useInterfaceSound() { return useContext(SoundContext); }

export function SiteLayout() {
  const { dark, toggleTheme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const location = useLocation();
  const cue = (name: Cue) => playSound(name, enabled);
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [location.pathname]);
  return <SoundContext.Provider value={{ enabled, cue, toggle: () => { const next = !enabled; setEnabled(next); playSound('toggle-on', next); } }}>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="page-controls"><Button variant="outline" size="icon" className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => { toggleTheme(); cue('select'); }}>
      <AnimatePresence mode="wait" initial={false}><motion.span className="control-icon" key={dark ? 'dark' : 'light'} initial={{ rotate: -40, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 40, opacity: 0 }} transition={{ duration: 0.15 }}>{dark ? <Sun size={17} /> : <Moon size={17} />}</motion.span></AnimatePresence>
    </Button></div>
    <Outlet />
    <ChatWidget />
  </SoundContext.Provider>;
}

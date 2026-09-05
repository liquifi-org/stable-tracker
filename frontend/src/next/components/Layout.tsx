import { useEffect, useState } from 'react';
import { Link, useLocation, useOutlet } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun, Mail, Home, Github, Search, FileText } from 'lucide-react';
import { FilterProvider } from '../../app/context/FilterContext';
import { FilterPanel } from './FilterPanel';
import { Footer } from './Footer';
import { CountryCommandPalette } from '../../app/components/CountryCommandPalette';
import { usePrefersReducedMotion } from '../../app/hooks/usePrefersReducedMotion';
import { SEO, usePageMeta } from '../lib/seo';
import logo from '../../assets/logos/logo_white.png';

const GITHUB_URL = 'https://github.com/liquifi-org/stable-tracker';

function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduced = usePrefersReducedMotion();

  if (reduced) return outlet;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

function LayoutBody({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  const location = useLocation();
  const NO_FILTER_PATHS = ['/contact', '/legal-disclaimer', '/whitepaper'];
  const showFilters = !NO_FILTER_PATHS.includes(location.pathname);
  const pageMeta =
    location.pathname === '/contact'
      ? { ...SEO.contact, path: '/contact' }
      : location.pathname === '/legal-disclaimer'
        ? { ...SEO.legal, path: '/legal-disclaimer' }
        : location.pathname === '/whitepaper'
          ? null
          : location.pathname.startsWith('/country/')
            ? null
            : { ...SEO.overview, path: '/' };
  usePageMeta(pageMeta);

  const isWhitepaper = location.pathname === '/whitepaper';
  const isOverview = location.pathname === '/' || location.pathname.startsWith('/country/');

  const navClass =
    'inline-flex items-center gap-1.5 text-[13px] font-medium text-white/75 hover:text-white transition-ui';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink-text)]">
      <div className="sticky top-0 z-40">
        <header className="ink-header">
          <div className="px-5 sm:px-8 h-[3.75rem] flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <img src={logo} alt="" className="h-6 w-auto shrink-0 opacity-95" />
              <span className="display text-[1.2rem] sm:text-[1.35rem] text-white truncate">
                Stablecoin Tracker
              </span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-4">
              <Link
                to="/whitepaper"
                aria-current={isWhitepaper ? 'page' : undefined}
                aria-label="Whitepaper"
                title="Whitepaper"
                className={`inline-flex items-center gap-1 h-7 px-2 sm:px-2.5 rounded-full border text-[11px] font-semibold tracking-wide transition-ui shrink-0 ${
                  isWhitepaper
                    ? 'border-white/45 bg-white/15 text-white'
                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Whitepaper</span>
              </Link>
              <Link to="/" className={navClass} aria-current={isOverview ? 'page' : undefined}>
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={navClass}>
                <Github className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Source</span>
              </a>
              <Link to="/contact" className={navClass}>
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Contact</span>
              </Link>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('open-country-search'))}
                className="hidden md:inline-flex items-center gap-2 h-8 px-3 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white text-xs transition-ui"
                aria-label="Search countries"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search</span>
                <kbd className="font-sans text-[10px] text-white/50 border border-white/15 rounded px-1">⌘K</kbd>
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-ui shrink-0"
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </header>
      </div>
      <div className="flex flex-col lg:flex-row flex-1 w-full min-w-0">
        <main className="flex-1 px-5 sm:px-8 py-8 min-w-0">
          <AnimatedOutlet />
        </main>
        {showFilters && <FilterPanel />}
      </div>
      <Footer />
      <CountryCommandPalette />
    </div>
  );
}

export function Layout() {
  const { isDark, toggle } = useDarkMode();
  return (
    <FilterProvider>
      <LayoutBody isDark={isDark} toggle={toggle} />
    </FilterProvider>
  );
}

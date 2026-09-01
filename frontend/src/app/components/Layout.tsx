import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { Moon, Sun, FileText, Mail, Home, Github } from 'lucide-react';

const GITHUB_URL = 'https://github.com/liquifi-org/stable-tracker';
import { FilterProvider, useFilters } from '../context/FilterContext';
import { FilterPanel } from './FilterPanel';
import { Footer } from './Footer';
import logo from '../../assets/logos/logo_white.png';
import alliumLogo from '../../assets/logos/allium.svg';

function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

function LayoutBody({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  const location = useLocation();
  const filters = useFilters();
  const NO_FILTER_PATHS = ['/contact', '/legal-disclaimer', '/privacy-policy'];
  // The regulation tab hides filters, but only on the main page — mapType is global,
  // persistent state, so without the path check it would also hide filters on pages
  // like the country detail view when navigated to from the regulation map.
  const isMainPage = location.pathname === '/';
  const showFilters = !NO_FILTER_PATHS.includes(location.pathname) && (!isMainPage || filters.mapType !== 'regulation');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-950 text-slate-800 dark:text-slate-100 transition-all duration-300">
      <header
        className="border-b border-slate-200/50 dark:border-neutral-700 backdrop-blur-sm transition-all duration-300"
        style={{ backgroundColor: isDark ? 'var(--brand-900)' : 'var(--brand)' }}
      >
        <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Stablecoin Tracker" className="h-8 sm:h-10 w-auto" />
            <div>
              <h1 className="text-lg sm:text-2xl text-white"><b>Stablecoin</b> Tracker</h1>
              <p className="text-xs sm:text-sm text-white/70 mt-1">Global adoption and flows analysis</p>
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/20 mx-1" />
            <a
              href="https://www.allium.so"
              target="_blank"
              rel="noopener noreferrer"
              title="Powered by Allium"
              className="hidden sm:flex flex-col items-center gap-1 shrink-0"
            >
              <img src={alliumLogo} alt="Allium" className="h-5 w-auto object-contain brightness-0 invert" />
              <span className="text-[10px] text-white/70 font-medium whitespace-nowrap">Powered by Allium</span>
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </Link>
            {/* TODO: link to the whitepaper once published */}
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Whitepaper</span>
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">Source Code</span>
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Contact</span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105 shrink-0"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>
      <div className="flex flex-col lg:flex-row flex-1">
        <main className="flex-1 p-4 sm:p-6 min-w-0">
          <Outlet />
        </main>
        {showFilters && <FilterPanel />}
      </div>
      <Footer />
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

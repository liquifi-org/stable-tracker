import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { Moon, Sun, FileText, Mail, Home, Github } from 'lucide-react';

const GITHUB_URL = 'https://github.com/liquifi-org/stable-tracker';
import { FilterProvider, useFilters } from '../context/FilterContext';
import { FilterPanel } from './FilterPanel';
import { Footer } from './Footer';
import logo from '../../assets/logos/logo_white.png';

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
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Stablecoin Tracker" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl text-white"><b>Stablecoin</b> Tracker</h1>
              <p className="text-sm text-white/70 mt-1">Global adoption and flows analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <Home className="h-4 w-4" />
              Overview
            </Link>
            {/* TODO: link to the whitepaper once published */}
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <FileText className="h-4 w-4" />
              Whitepaper
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <Github className="h-4 w-4" />
              Source Code
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-all duration-300"
            >
              <Mail className="h-4 w-4" />
              Contact
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <main className="flex-1 p-6">
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

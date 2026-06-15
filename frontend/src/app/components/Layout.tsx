import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { Moon, Sun } from 'lucide-react';
import { FilterProvider } from '../context/FilterContext';
import { FilterPanel } from './FilterPanel';

function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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

export function Layout() {
  const { isDark, toggle } = useDarkMode();

  return (
    <FilterProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-gradient-to-br dark:from-neutral-900 dark:to-neutral-950 text-slate-800 dark:text-slate-100 transition-all duration-300">
        <header
          className="border-b border-slate-200/50 dark:border-neutral-700 backdrop-blur-sm transition-all duration-300"
          style={{ backgroundColor: isDark ? 'var(--brand-900)' : 'var(--brand)' }}
        >
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Stablecoins Tracker</h1>
              <p className="text-sm text-white/70 mt-1">Global adoption and flows analysis</p>
            </div>
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
        </header>
        <div className="flex">
          <main className="flex-1 p-6">
            <Outlet />
          </main>
          <FilterPanel />
        </div>
      </div>
    </FilterProvider>
  );
}

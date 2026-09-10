import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { focusCountryOnMap } from '../lib/mapEvents';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { api, type CountryAdoptionMetric } from '../services/api';
import { CountryFlag } from './CountryFlag';
import { countryPath } from '../lib/countryRoutes';
import { useFilters } from '../context/FilterContext';
import { isDisplayableWalletCount } from '../lib/displayFloors';

export function CountryCommandPalette() {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<CountryAdoptionMetric[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const filters = useFilters();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const openPalette = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-country-search', openPalette);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-country-search', openPalette);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.getAdoptionAnalytics(filters.year, filters.month)
      .then((adoption) => {
        if (cancelled) return;
        const withData = adoption
          .filter((c) => isDisplayableWalletCount(c.activeWallets))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries(withData);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, filters.year, filters.month]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Jump to country"
      description="Search countries with data in this period"
    >
      <CommandInput placeholder="Search countries…" />
      <CommandList>
        <CommandEmpty>No country found.</CommandEmpty>
        <CommandGroup heading="Countries">
          {countries.map((c) => (
            <CommandItem
              key={c.countryId}
              value={`${c.name} ${c.isoAlpha2 ?? ''} ${c.countryId}`}
              onSelect={() => {
                setOpen(false);
                if (location.pathname === '/') {
                  focusCountryOnMap({
                    countryId: c.countryId,
                    name: c.name,
                    isoAlpha2: c.isoAlpha2,
                  });
                  return;
                }
                navigate(countryPath({ countryId: c.countryId, name: c.name, isoAlpha2: c.isoAlpha2 }), {
                  state: { name: c.name, isoAlpha2: c.isoAlpha2 },
                });
              }}
            >
              {c.isoAlpha2 && <CountryFlag isoAlpha2={c.isoAlpha2} className="w-4 h-4" />}
              <span>{c.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

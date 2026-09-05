import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { api, type CountryRegulationInfo } from '../services/api';
import { CountryFlag } from './CountryFlag';
import { countryPath } from '../lib/countryRoutes';

export function CountryCommandPalette() {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<CountryRegulationInfo[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    const open = () => setOpen(true);
    window.addEventListener('open-country-search', open);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-country-search', open);
    };
  }, []);

  useEffect(() => {
    if (!open || countries.length > 0) return;
    api.getCountriesRegulation()
      .then((page) => setCountries(page.items))
      .catch(() => setCountries([]));
  }, [open, countries.length]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Jump to country"
      description="Search countries by name"
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

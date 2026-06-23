interface CountryFlagProps {
  isoAlpha2: string;
  className?: string;
}

export function CountryFlag({ isoAlpha2, className = 'w-5 h-5' }: CountryFlagProps) {
  if (!isoAlpha2) return null;
  return (
    <img
      src={`https://flagcdn.com/${isoAlpha2.toLowerCase()}.svg`}
      alt=""
      loading="lazy"
      className={`${className} rounded-full object-cover border border-slate-200 dark:border-neutral-600 shrink-0`}
    />
  );
}

import { usePrefersReducedMotion } from '../../app/hooks/usePrefersReducedMotion';
import { motion } from 'motion/react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  size?: 'sm' | 'md';
  layoutId?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  layoutId = 'segmented-pill',
}: SegmentedControlProps<T>) {
  const reduced = usePrefersReducedMotion();
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-3.5 py-2 text-[13px]';

  return (
    <div className="relative inline-flex rounded-full p-[3px] bg-[color-mix(in_oklab,var(--ink-text)_8%,transparent)]">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 ${pad} rounded-full font-medium tracking-tight transition-ui ${
              active ? 'text-white' : 'text-[var(--muted-ink)] hover:text-[var(--ink-text)]'
            }`}
          >
            {active && (
              reduced ? (
                <span className="absolute inset-0 rounded-full -z-10" style={{ backgroundColor: 'var(--ink)' }} />
              ) : (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full -z-10"
                  style={{ backgroundColor: 'var(--ink)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

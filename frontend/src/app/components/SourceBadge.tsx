import alliumLogo from '../../assets/logos/allium.svg';
import strideLogo from '../../assets/logos/stride.svg';

export type DataSource = 'allium' | 'stride';

const SOURCE_LOGOS: Record<DataSource, string> = {
  allium: alliumLogo,
  stride: strideLogo,
};

const SOURCE_NAMES: Record<DataSource, string> = {
  allium: 'Allium',
  stride: 'Stride',
};

const SIZE_CLASSES = {
  sm: 'h-3',
  md: 'h-5',
} as const;

interface SourceBadgeProps {
  source: DataSource;
  /** What the data is, e.g. "Wallets data" — rendered as "{label} by {source}" in the tooltip. */
  label: string;
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
  /** 'auto' (default): original color in light mode, flattens to white in dark mode — for
   *  badges sitting on a surface that follows the page theme (cards, tooltips).
   *  'white': always flattened to white — for badges on a surface that's always the brand
   *  color regardless of theme (e.g. table header bars). */
  variant?: 'auto' | 'white';
}

/** Small attribution chip — logo flattens to solid white (same treatment as the footer's
 *  collaborator logos), no background pill. Native tooltip on hover. */
export function SourceBadge({ source, label, className = '', size = 'sm', variant = 'auto' }: SourceBadgeProps) {
  return (
    <span
      title={`${label} by ${SOURCE_NAMES[source]}`}
      className={`inline-flex items-center shrink-0 cursor-help ${className}`}
    >
      <img
        src={SOURCE_LOGOS[source]}
        alt={SOURCE_NAMES[source]}
        className={`${SIZE_CLASSES[size]} w-auto object-contain ${
          variant === 'white' ? 'brightness-0 invert' : 'dark:brightness-0 dark:invert'
        }`}
      />
    </span>
  );
}

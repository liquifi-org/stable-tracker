import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}

export function FilterSelect({ value, onValueChange, options, ariaLabel }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="w-full bg-white dark:bg-neutral-900 border-slate-200/50 dark:border-neutral-700 text-slate-700 dark:text-slate-200 h-9"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="dark:bg-neutral-900 dark:border-neutral-700">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

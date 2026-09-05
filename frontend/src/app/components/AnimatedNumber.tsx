import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface AnimatedNumberProps {
  value: number | null | undefined;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const reduced = usePrefersReducedMotion();
  const displayRef = useRef(value ?? 0);
  const [display, setDisplay] = useState(value ?? 0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return;
    if (reduced) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    const start = displayRef.current;
    const end = value;
    const duration = 400;
    const t0 = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = start + (end - start) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  if (value == null || Number.isNaN(value)) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={`tabular-nums ${className ?? ''}`}>
      {format ? format(display) : Math.round(display).toLocaleString()}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/*
  A number that counts to its new value instead of snapping.

  Driven by setTimeout rather than requestAnimationFrame: rAF is suspended in
  a backgrounded tab, which would leave the scoreboard frozen on a stale
  number the moment someone switches away mid-over. The step count is small
  enough that timer granularity doesn't show.
*/
export default function Ticker({
  value,
  duration = 420,
  reduced = false,
  className,
}: {
  value: number;
  duration?: number;
  reduced?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced || value === from.current) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const delta = value - start;
    const steps = Math.min(14, Math.max(4, Math.abs(delta)));
    const every = duration / steps;
    const timers: number[] = [];

    for (let i = 1; i <= steps; i++) {
      timers.push(
        window.setTimeout(() => {
          const t = i / steps;
          /* ease-out: fast off the mark, settling into the final value */
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(Math.round(start + delta * eased));
        }, every * i)
      );
    }
    from.current = value;
    return () => timers.forEach(clearTimeout);
  }, [value, duration, reduced]);

  return <span className={className}>{shown}</span>;
}

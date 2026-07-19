"use client";

import { useEffect, useState, type RefObject } from "react";

/*
  Reports whether the page surface beneath a fixed element is dark or
  light, so floating chrome (navbar pills) can restyle itself per
  section while scrolling. Samples the element stack under the pill's
  centre each scroll frame and picks the first opaque background color.
*/
export default function useSurfaceTone(
  ref: RefObject<HTMLElement | null>,
  rerunKey?: unknown
) {
  const [tone, setTone] = useState<"dark" | "light">("dark");

  useEffect(() => {
    let raf = 0;

    const sample = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(1, rect.left + rect.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(1, rect.top + rect.height / 2));

      for (const under of document.elementsFromPoint(x, y)) {
        if (el.contains(under)) continue;
        const style = getComputedStyle(under);
        /* SVG shapes (e.g. the brush-stroke section edges) paint via fill,
           not background-color */
        const paint =
          under instanceof SVGElement && !(under instanceof SVGSVGElement)
            ? style.fill
            : style.backgroundColor;
        const m = paint.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const parts = m[1].split(",").map(parseFloat);
        const alpha = parts.length > 3 ? parts[3] : 1;
        if (alpha < 0.4) continue;
        const lum = (0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]) / 255;
        setTone(lum < 0.5 ? "dark" : "light");
        return;
      }
    };

    const queue = () => {
      if (!raf) raf = requestAnimationFrame(sample);
    };

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue, { passive: true });
    /* first paint + after the page-enter transition settles */
    sample();
    const settle = setTimeout(sample, 600);

    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rerunKey]);

  return tone;
}

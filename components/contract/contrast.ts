/*
  WCAG 2.1 contrast, straight from the spec's own formulas: relative
  luminance (successive criterion 1.4.3's own definition) feeds the
  contrast ratio ((L1 + 0.05) / (L2 + 0.05), L1 the lighter of the two).

  Kept dependency-free and pure so it is unit-testable without a DOM.
  SidePanel's COLORS block calls this on every colour change to drive a
  live readout: it never blocks a choice, it only reports one honestly,
  which is also why this file has no notion of "reject" - only ratios
  and a pass/fail label against the two thresholds the task asks for
  (4.5:1 for body text, 3:1 for large text/headings).
*/

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function linearize(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/* null when either colour is not a valid 6-digit hex, so callers can
   tell "not enough information yet" apart from a real ratio of 1 */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = "body" | "large";

export const WCAG_AA_THRESHOLD: Record<ContrastLevel, number> = {
  body: 4.5,
  large: 3,
};

export function passesWcagAA(ratio: number, level: ContrastLevel): boolean {
  return ratio >= WCAG_AA_THRESHOLD[level];
}

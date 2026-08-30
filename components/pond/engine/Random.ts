// Seeded PRNG (mulberry32). Deterministic when seeded — handy for stable
// scene layouts — but the game seeds from time for natural variety each visit.

export class Random {
  private state: number;

  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.state = seed >>> 0;
  }

  /** Next float in [0,1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min,max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min,max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** ±spread around 0. */
  spread(spread: number): number {
    return (this.next() * 2 - 1) * spread;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

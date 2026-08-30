// Keeps a calm little population of bugs aloft over the pond: spawns them up to a
// cap on gentle timers, updates and draws them, reaps the ones the frog has
// eaten, and answers "did this click land on a bug?" for the Scene. No waves, no
// pressure — there's always something to catch, never a swarm.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { Bug, type BugKind } from "./Bug";

const KINDS: { kind: BugKind; weight: number }[] = [
  { kind: "mosquito", weight: 1.4 },
  { kind: "dragonfly", weight: 1 },
  { kind: "merge", weight: 1 },
  { kind: "syntax", weight: 1 },
  { kind: "moth", weight: 1 },
  { kind: "loop", weight: 1 },
];

export class Bugs implements SceneElement {
  private readonly bugs: Bug[] = [];
  private spawnIn = 0.6;

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly max = 5
  ) {}

  /** The topmost bug under a stage-space point, if any (skips caught ones). */
  pick(sx: number, sy: number): Bug | null {
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      if (!b.caught && b.alive && b.hitTest(sx, sy)) return b;
    }
    return null;
  }

  /** Nearest live, un-targeted bug to a point — the frog uses this to watch. */
  nearest(x: number, y: number, within: number): Bug | null {
    let best: Bug | null = null;
    let bestD = within * within;
    for (const b of this.bugs) {
      if (b.caught || !b.alive) continue;
      const d = (b.x - x) ** 2 + (b.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private spawn(): void {
    let total = 0;
    for (const k of KINDS) total += k.weight;
    let r = this.rng.next() * total;
    let kind: BugKind = "mosquito";
    for (const k of KINDS) {
      if ((r -= k.weight) <= 0) {
        kind = k.kind;
        break;
      }
    }
    const { w, h } = this.layout;
    const x = this.rng.range(w * 0.12, w * 0.88);
    const y = this.rng.range(h * 0.36, h * 0.78);
    this.bugs.push(new Bug(this.layout, this.rng, kind, x, y));
  }

  update(world: World): void {
    for (let i = this.bugs.length - 1; i >= 0; i--) {
      if (!this.bugs[i].alive) this.bugs.splice(i, 1);
    }
    if (this.bugs.length < this.max) {
      this.spawnIn -= world.dt;
      if (this.spawnIn <= 0) {
        this.spawn();
        this.spawnIn = this.rng.range(1.6, 3.2);
      }
    }
    for (const b of this.bugs) b.update(world);
  }

  render(world: World): void {
    for (const b of this.bugs) b.render(world);
  }
}

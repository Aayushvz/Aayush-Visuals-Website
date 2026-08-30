// A bamboo grove framing the pond on both sides — tall, thin, segmented stalks
// in near-silhouette with a few drooping leaves. Clustered at the edges so the
// middle of the scene (where the frog lives) stays open. Baked once.

import { StaticLayer } from "../../render/StaticLayer";
import { C } from "../../config/theme";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";

interface Stalk {
  x: number;
  topY: number;
  baseY: number;
  lit: boolean;
  leanDir: number;
}

export class Bamboo extends StaticLayer {
  private stalks: Stalk[] = [];

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random
  ) {
    super();
  }

  relayout(): void {
    super.relayout();
    this.stalks = []; // regenerate for the new size on next paint
  }

  private build(): void {
    const { w, waterlineY } = this.layout;
    this.stalks = [];
    const clusters: [number, number][] = [
      [0.0, 0.17],
      [0.83, 1.0],
    ];
    for (const [a, b] of clusters) {
      const n = this.rng.int(4, 6);
      for (let i = 0; i < n; i++) {
        const x = Math.round((a + this.rng.next() * (b - a)) * w);
        const height = this.rng.range(0.42, 0.78) * waterlineY;
        this.stalks.push({
          x,
          baseY: waterlineY + this.rng.int(0, 4),
          topY: Math.round(waterlineY - height),
          lit: this.rng.chance(0.4),
          leanDir: this.rng.chance(0.5) ? 1 : -1,
        });
      }
    }
    // Draw taller stalks first so nearer short ones overlap correctly.
    this.stalks.sort((s1, s2) => s1.topY - s2.topY);
  }

  protected paint(cx: CanvasRenderingContext2D, _world: World): void {
    if (this.stalks.length === 0) this.build();
    for (const s of this.stalks) this.drawStalk(cx, s);
  }

  private drawStalk(cx: CanvasRenderingContext2D, s: Stalk): void {
    const body = s.lit ? C.bambooLit : C.bambooDark;
    const nodeCol = C.bambooNode;

    // Stalk with a very slight lean, drawn as stacked 2px segments.
    const segLen = 9;
    for (let y = s.baseY; y > s.topY; y -= segLen) {
      const t = (s.baseY - y) / (s.baseY - s.topY);
      const dx = Math.round(s.leanDir * t * t * 3);
      cx.fillStyle = body;
      cx.fillRect(s.x + dx, y - segLen, 2, segLen);
      // Node band between segments.
      cx.fillStyle = nodeCol;
      cx.fillRect(s.x + dx - 1, y - segLen, 4, 1);
    }

    // A couple of leaves near the crown.
    cx.fillStyle = C.bambooLeaf;
    const lx = s.x + Math.round(s.leanDir * 3);
    for (let k = 0; k < 3; k++) {
      const ly = s.topY + 3 + k * 5;
      const dir = k % 2 === 0 ? 1 : -1;
      for (let j = 0; j < 6; j++) {
        cx.fillRect(lx + dir * j, ly + Math.round(j * 0.6), 1, 1);
      }
    }
  }
}

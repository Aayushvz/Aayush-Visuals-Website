import {
  buildAtlas,
  heroFrameIndex,
  HERO_H,
  HERO_W,
  propAtlasIndex,
  TILE,
  tileAtlasIndex,
  type Atlas,
  type HeroDir,
} from "./tiles";
import { buildWorld, cellAt, DISCOVERIES, solidAt, type Discovery, type World } from "./world";

/*
  The game loop, kept out of React entirely.

  React owns the shell — intro screen, HUD, the project panel — and this
  owns the frame. They talk through two narrow channels: `setInput` going
  in, and the `onState` callback coming out, which fires only when
  something the HUD renders actually changes. Nothing here triggers a
  re-render per frame.

  `destroy()` releases every listener and cancels the loop, because this
  mounts inside a portfolio and a leaked rAF would keep burning battery on
  whatever page the visitor goes to next.
*/

const SPEED = 62; // px per second, walking
const SPRINT = 108;
const INTERACT_RANGE = 26;

export type GameState = {
  district: string;
  nearby: Discovery | null;
  found: string[];
  x: number;
  y: number;
};

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  onState: (s: GameState) => void;
  onEnter: (d: Discovery) => void;
};

type Keys = Record<string, boolean>;

export class CityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private atlas: Atlas;
  private world: World;
  private keys: Keys = {};
  private raf = 0;
  private last = 0;
  private running = false;

  private px: number;
  private py: number;
  private dir: HeroDir = "down";
  private animT = 0;
  private frame = 0;
  private moving = false;

  private found = new Set<string>();
  private nearby: Discovery | null = null;
  private onState: (s: GameState) => void;
  private onEnter: (d: Discovery) => void;

  /** set by the shell while a panel is open, so the city does not move under it */
  paused = false;

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("city: no 2d context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.atlas = buildAtlas();
    this.world = buildWorld(DISCOVERIES);
    this.px = this.world.spawn.x;
    this.py = this.world.spawn.y;
    this.onState = opts.onState;
    this.onEnter = opts.onEnter;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clearKeys);
  }

  /* ── input ─────────────────────────────────────────────────────── */

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.has(k) || k === " " || k === "e") e.preventDefault();
    this.keys[k] = true;
    if (k === "e" && this.nearby && !this.paused) this.onEnter(this.nearby);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private clearKeys = () => {
    this.keys = {};
  };

  /** touch joystick, -1..1 on each axis */
  stick = { x: 0, y: 0 };

  /** the on-screen interact button */
  interact = () => {
    if (this.nearby && !this.paused) this.onEnter(this.nearby);
  };

  markFound(id: string) {
    this.found.add(id);
    this.emit();
  }

  /* ── loop ──────────────────────────────────────────────────────── */

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    this.emit();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clearKeys);
  }

  private tick = (now: number) => {
    if (!this.running) return;
    /* clamp: a backgrounded tab hands back a delta of seconds, which would
       teleport the player through a wall on the first frame back */
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    if (!this.paused) this.update(dt);
    this.render();

    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    const k = this.keys;
    let ax = (k.a || k.arrowleft ? -1 : 0) + (k.d || k.arrowright ? 1 : 0);
    let ay = (k.w || k.arrowup ? -1 : 0) + (k.s || k.arrowdown ? 1 : 0);

    if (this.stick.x || this.stick.y) {
      ax = this.stick.x;
      ay = this.stick.y;
    }

    const len = Math.hypot(ax, ay);
    this.moving = len > 0.08;

    if (this.moving) {
      ax /= len;
      ay /= len;
      const speed = k.shift ? SPRINT : SPEED;

      /* axes resolved separately so sliding along a wall works instead of
         sticking the moment one axis is blocked */
      this.moveAxis(ax * speed * dt, 0);
      this.moveAxis(0, ay * speed * dt);

      if (Math.abs(ax) > Math.abs(ay)) this.dir = ax < 0 ? "left" : "right";
      else this.dir = ay < 0 ? "up" : "down";

      this.animT += dt * (k.shift ? 14 : 9);
      this.frame = Math.floor(this.animT) % 4;
    } else {
      this.frame = 0;
      this.animT = 0;
    }

    this.checkNearby();
    this.updateTraffic(dt);
  }

  /*
    Traffic and pedestrians.

    Cars loop the full width or height of the map and wrap, which costs
    nothing and means the streets are never empty wherever you are.
    Pedestrians turn round when the pavement runs out rather than
    pathfinding — at this scale the difference is invisible and the cost
    is not.
  */
  private updateTraffic(dt: number) {
    const wpx = this.world.w * TILE;
    const hpx = this.world.h * TILE;

    for (const car of this.world.cars) {
      car.x += car.dx * car.speed * dt;
      car.y += car.dy * car.speed * dt;
      if (car.x < -24) car.x = wpx + 24;
      if (car.x > wpx + 24) car.x = -24;
      if (car.y < -24) car.y = hpx + 24;
      if (car.y > hpx + 24) car.y = -24;
    }

    for (const n of this.world.npcs) {
      n.t += dt;
      const nx = n.x + n.dx * 18 * dt;
      const ny = n.y + n.dy * 18 * dt;
      if (solidAt(this.world, nx, ny + 4)) {
        n.dx = -n.dx;
        n.dy = -n.dy;
      } else {
        n.x = nx;
        n.y = ny;
      }
    }
  }

  /* the hero's feet are the collider — a box the size of the whole sprite
     would stop him walking under the overhang of anything */
  private moveAxis(dx: number, dy: number) {
    const nx = this.px + dx;
    const ny = this.py + dy;
    const halfW = 4;
    const top = 4;
    const bottom = 7;

    const corners: Array<[number, number]> = [
      [nx - halfW, ny + top],
      [nx + halfW, ny + top],
      [nx - halfW, ny + bottom],
      [nx + halfW, ny + bottom],
    ];

    if (corners.some(([cx, cy]) => solidAt(this.world, cx, cy))) return;
    this.px = nx;
    this.py = ny;
  }

  private checkNearby() {
    let best: Discovery | null = null;
    let bestD = INTERACT_RANGE;

    for (const d of this.world.discoveries) {
      const dx = d.tx * TILE + TILE / 2 - this.px;
      const dy = d.ty * TILE + TILE / 2 - this.py;
      const dist = Math.hypot(dx, dy);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }

    if (best?.id !== this.nearby?.id) {
      this.nearby = best;
      this.emit();
    }
  }

  private emit() {
    this.onState({
      district: "Downtown",
      nearby: this.nearby,
      found: [...this.found],
      x: this.px,
      y: this.py,
    });
  }

  /* ── render ────────────────────────────────────────────────────── */

  private render() {
    const { ctx, canvas } = this;
    const scale = Number(canvas.dataset.scale || 3);
    const vw = canvas.width / scale;
    const vh = canvas.height / scale;

    /* camera follows, clamped so the view never leaves the city */
    const camX = Math.max(0, Math.min(this.world.w * TILE - vw, this.px - vw / 2));
    const camY = Math.max(0, Math.min(this.world.h * TILE - vh, this.py - vh / 2));

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#14141c";
    ctx.fillRect(0, 0, vw, vh);
    ctx.translate(-Math.round(camX), -Math.round(camY));

    /* only the tiles on screen — the city is 60x44 and drawing all of it
       every frame is 2,640 blits for the ~400 that are visible */
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(this.world.w - 1, Math.ceil((camX + vw) / TILE));
    const y1 = Math.min(this.world.h - 1, Math.ceil((camY + vh) / TILE));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cell = cellAt(this.world, x, y);
        if (!cell) continue;
        ctx.drawImage(
          this.atlas.canvas,
          tileAtlasIndex(cell.id) * TILE,
          0,
          TILE,
          TILE,
          x * TILE,
          y * TILE,
          TILE,
          TILE
        );
      }
    }

    this.renderProps(ctx, x0, y0, x1, y1);
    this.renderCars(ctx, camX, camY, vw, vh);
    this.renderNpcs(ctx, camX, camY, vw, vh);
    this.renderMarkers(ctx);

    /* shadow then hero, so he sits on the ground rather than floating */
    ctx.fillStyle = "rgba(10,10,18,0.3)";
    ctx.beginPath();
    ctx.ellipse(Math.round(this.px), Math.round(this.py) + 7, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const fi = heroFrameIndex(this.dir, this.moving ? this.frame : 0);
    ctx.drawImage(
      this.atlas.canvas,
      fi * TILE,
      this.atlas.heroRowY,
      TILE,
      TILE,
      Math.round(this.px) - HERO_W / 2 - 2,
      Math.round(this.py) - HERO_H + 6,
      TILE,
      TILE
    );

    ctx.restore();
  }

  private renderProps(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) {
    for (const p of this.world.props) {
      if (p.tx < x0 - 1 || p.tx > x1 + 1 || p.ty < y0 - 1 || p.ty > y1 + 1) continue;
      /* a contact shadow is what stops a prop looking stuck on top of the
         pavement rather than standing on it */
      ctx.fillStyle = "rgba(10,10,18,0.22)";
      ctx.beginPath();
      ctx.ellipse(p.tx * TILE + 8, p.ty * TILE + 14, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(
        this.atlas.canvas,
        propAtlasIndex(p.id) * TILE,
        this.atlas.propRowY,
        TILE,
        TILE,
        p.tx * TILE,
        p.ty * TILE,
        TILE,
        TILE
      );
    }
  }

  private renderCars(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number
  ) {
    for (const car of this.world.cars) {
      if (car.x < camX - 30 || car.x > camX + vw + 30) continue;
      if (car.y < camY - 30 || car.y > camY + vh + 30) continue;

      const horiz = car.dx !== 0;
      const w = horiz ? 18 : 10;
      const h = horiz ? 10 : 18;
      const x = Math.round(car.x - w / 2);
      const y = Math.round(car.y - h / 2);

      ctx.fillStyle = "rgba(10,10,18,0.3)";
      ctx.fillRect(x + 1, y + h - 2, w, 3);
      ctx.fillStyle = car.colour;
      ctx.fillRect(x, y, w, h);
      /* roof + screen: two bands are enough to read as a car from above */
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      if (horiz) ctx.fillRect(x + 5, y + 1, 8, h - 2);
      else ctx.fillRect(x + 1, y + 5, w - 2, 8);
      ctx.fillStyle = "#ffe9b0";
      if (horiz) ctx.fillRect(car.dx > 0 ? x + w - 2 : x, y + 1, 2, 2);
      else ctx.fillRect(x + 1, car.dy > 0 ? y + h - 2 : y, 2, 2);
    }
  }

  private renderNpcs(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number
  ) {
    for (const n of this.world.npcs) {
      if (n.x < camX - 20 || n.x > camX + vw + 20) continue;
      if (n.y < camY - 20 || n.y > camY + vh + 20) continue;

      ctx.fillStyle = "rgba(10,10,18,0.25)";
      ctx.beginPath();
      ctx.ellipse(Math.round(n.x), Math.round(n.y) + 6, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      const frame = Math.floor(n.t * 5) % 2;
      ctx.drawImage(
        this.atlas.canvas,
        (n.variant * 2 + frame) * TILE,
        this.atlas.npcRowY,
        TILE,
        TILE,
        Math.round(n.x) - 8,
        Math.round(n.y) - 12,
        TILE,
        TILE
      );
    }
  }

  private renderMarkers(ctx: CanvasRenderingContext2D) {
    const t = performance.now() / 1000;
    for (const d of this.world.discoveries) {
      const cx = d.tx * TILE + TILE / 2;
      const cy = d.ty * TILE;
      const bob = Math.sin(t * 2.2 + d.tx) * 2;
      const done = this.found.has(d.id);

      ctx.fillStyle = done ? "rgba(89,232,255,0.35)" : "rgba(89,232,255,0.85)";
      /* a diamond, drawn as two triangles — reads as a waypoint at 16px
         where a circle would just be a blob */
      ctx.beginPath();
      ctx.moveTo(cx, cy - 16 + bob);
      ctx.lineTo(cx + 4, cy - 11 + bob);
      ctx.lineTo(cx, cy - 6 + bob);
      ctx.lineTo(cx - 4, cy - 11 + bob);
      ctx.closePath();
      ctx.fill();

      if (this.nearby?.id === d.id) {
        ctx.strokeStyle = "rgba(89,232,255,0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(d.tx * TILE - 4, d.ty * TILE - 4, TILE + 8, TILE + 8);
      }
    }
  }
}

const MOVE_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

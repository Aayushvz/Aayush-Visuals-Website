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

  /** supplied by the shell after the Start gesture */
  audio: { step: (s: "stone" | "grass" | "road", now: number, running: boolean) => void; discover: () => void } | null = null;

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

    /* footsteps, keyed to what is under the hero's feet */
    if (this.moving) {
      const cell = cellAt(this.world, Math.floor(this.px / TILE), Math.floor((this.py + 6) / TILE));
      const id = cell?.id ?? "walk";
      const surface = id === "grass" || id === "tree" ? "grass" : id.startsWith("road") || id.startsWith("zebra") ? "road" : "stone";
      this.audio?.step(surface, performance.now(), !!this.keys.shift);
    }
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
    this.renderNight(ctx, camX, camY, vw, vh, x0, y0, x1, y1);
    /* after the night wash, so navigation is never dimmed by it */
    this.renderCompass(ctx, camX, camY, vw, vh);
    this.renderMiniMap(ctx, camX, camY, vw);

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

  /*
    Night.

    Two passes. First a cool wash over everything, which is the night
    itself; then every light source drawn with 'lighter' so it adds back
    into that wash instead of sitting on top of it as a pale sticker.

    The light sprite is a radial gradient rendered once into its own
    canvas and then blitted. Building a gradient per lamp per frame is the
    classic way to make a lit scene crawl — there can be forty lamps on
    screen and this is the same cost as forty drawImage calls.
  */
  private renderNight(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) {
    ctx.fillStyle = "rgba(10,14,38,0.68)";
    ctx.fillRect(camX, camY, vw, vh);

    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";

    /* lit windows and shopfronts. Which windows are lit is a hash of the
       tile, so the same flats are on every night rather than flickering */
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cell = cellAt(this.world, x, y);
        if (!cell) continue;
        const shop = cell.id.startsWith("fac_shop");
        const win = cell.id.startsWith("fac_win");
        if (!shop && !win) continue;
        if (win && hash3(x, y, 91) > 0.62) continue; // a dark flat

        ctx.fillStyle = shop ? "rgba(255,206,130,0.42)" : "rgba(255,214,150,0.3)";
        if (shop) ctx.fillRect(x * TILE + 2, y * TILE + 6, 12, 8);
        else ctx.fillRect(x * TILE + 4, y * TILE + 4, 8, 7);

        this.light(ctx, x * TILE + 8, y * TILE + 9, shop ? 30 : 20, "255,200,120", shop ? 0.5 : 0.3);
      }
    }

    /* street lamps pool light onto the pavement */
    for (const p of this.world.props) {
      if (p.id !== "lamp") continue;
      if (p.tx < x0 - 2 || p.tx > x1 + 2 || p.ty < y0 - 2 || p.ty > y1 + 2) continue;
      this.light(ctx, p.tx * TILE + 8, p.ty * TILE + 10, 54, "255,214,150", 0.62);
    }

    /* headlights, thrown ahead of each car */
    for (const car of this.world.cars) {
      if (car.x < camX - 40 || car.x > camX + vw + 40) continue;
      if (car.y < camY - 40 || car.y > camY + vh + 40) continue;
      this.light(ctx, car.x + car.dx * 16, car.y + car.dy * 16, 34, "255,236,190", 0.5);
      this.light(ctx, car.x, car.y, 14, "255,236,190", 0.25);
    }

    /* the beacons, and a soft pool under the hero so he never gets lost */
    for (const d of this.world.discoveries) {
      if (d.tx < x0 - 3 || d.tx > x1 + 3 || d.ty < y0 - 3 || d.ty > y1 + 3) continue;
      const pulse = 0.55 + Math.sin(performance.now() / 420 + d.tx) * 0.16;
      this.light(ctx, d.tx * TILE + 8, d.ty * TILE + 2, 60, "89,232,255", pulse);
    }
    this.light(ctx, this.px, this.py, 42, "180,205,255", 0.3);

    ctx.globalCompositeOperation = prev;
  }

  /*
    One cached radial sprite per colour.

    The first attempt drew a white sprite then tinted it with a
    'source-atop' fillRect — but source-atop composites against the whole
    canvas, not against the sprite just drawn, so every light painted a
    solid coloured square over the city. There are only four colours here,
    so baking the tint into each gradient is both correct and cheaper.
  */
  private lightSprites = new Map<string, HTMLCanvasElement>();

  private light(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    rgb: string,
    alpha: number
  ) {
    let sprite = this.lightSprites.get(rgb);
    if (!sprite) {
      sprite = document.createElement("canvas");
      sprite.width = 128;
      sprite.height = 128;
      const sc = sprite.getContext("2d");
      if (sc) {
        const g = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, `rgba(${rgb},0.95)`);
        g.addColorStop(0.4, `rgba(${rgb},0.34)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        sc.fillStyle = g;
        sc.fillRect(0, 0, 128, 128);
      }
      this.lightSprites.set(rgb, sprite);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
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

  /*
    The work pointers.

    A floating diamond on its own told you a building mattered but never
    which work was inside, so every beacon now carries its name on a
    plate. Found ones dim and get a tick, which is what turns eight
    identical markers into a checklist you can read at a glance.
  */
  private renderMarkers(ctx: CanvasRenderingContext2D) {
    const t = performance.now() / 1000;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const d of this.world.discoveries) {
      const cx = d.tx * TILE + TILE / 2;
      const cy = d.ty * TILE;
      const bob = Math.sin(t * 2.2 + d.tx) * 2;
      const done = this.found.has(d.id);
      const near = this.nearby?.id === d.id;

      /* the plate */
      ctx.font = "7px ui-monospace, monospace";
      const label = done ? `✓ ${d.label}` : d.label;
      const w = ctx.measureText(label).width + 8;
      const py = cy - 27 + bob;

      ctx.fillStyle = done ? "rgba(8,12,22,0.7)" : "rgba(8,12,22,0.88)";
      ctx.fillRect(cx - w / 2, py - 6, w, 12);
      ctx.fillStyle = done ? "rgba(89,232,255,0.45)" : near ? "#ffffff" : "rgba(89,232,255,0.95)";
      ctx.fillText(label, cx, py);

      /* the beacon */
      ctx.fillStyle = done ? "rgba(89,232,255,0.3)" : "rgba(89,232,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 18 + bob);
      ctx.lineTo(cx + 4, cy - 13 + bob);
      ctx.lineTo(cx, cy - 8 + bob);
      ctx.lineTo(cx - 4, cy - 13 + bob);
      ctx.closePath();
      ctx.fill();

      if (near) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(d.tx * TILE - 4, d.ty * TILE - 4, TILE + 8, TILE + 8);
      }
    }
  }

  /*
    Arrows for what you cannot see.

    The city is 72x56 tiles and the viewport shows maybe a twentieth of
    it, so without these the remaining discoveries are a guessing game.
    One chevron per unfound discovery, pinned to the screen edge nearest
    it, with the distance in metres so it reads as navigation.
  */
  private renderCompass(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number
  ) {
    const pad = 26;
    for (const d of this.world.discoveries) {
      if (this.found.has(d.id)) continue;
      const tx = d.tx * TILE + TILE / 2;
      const ty = d.ty * TILE;
      /* on screen already? then the beacon is doing the job */
      if (tx > camX + 20 && tx < camX + vw - 20 && ty > camY + 30 && ty < camY + vh - 20) continue;

      const ang = Math.atan2(ty - this.py, tx - this.px);
      const cx = camX + vw / 2 + Math.cos(ang) * (vw / 2 - pad);
      const cy = camY + vh / 2 + Math.sin(ang) * (vh / 2 - pad);
      const dist = Math.round(Math.hypot(tx - this.px, ty - this.py) / TILE);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(89,232,255,0.85)";
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-4, -4.5);
      ctx.lineTo(-4, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.font = "7px ui-monospace, monospace";
      ctx.fillStyle = "rgba(89,232,255,0.8)";
      ctx.textAlign = "center";
      ctx.fillText(`${dist}m`, cx, cy + 12);
    }
  }

  /*
    The mini-map.

    The city layout never changes, so it is rasterised once at one pixel
    per tile and then blitted — redrawing 4,032 tiles into a corner every
    frame would cost more than the whole rest of the render.
  */
  private miniMap: HTMLCanvasElement | null = null;

  private buildMiniMap() {
    const c = document.createElement("canvas");
    c.width = this.world.w;
    c.height = this.world.h;
    const g = c.getContext("2d");
    if (!g) return c;
    for (let y = 0; y < this.world.h; y++) {
      for (let x = 0; x < this.world.w; x++) {
        const cell = cellAt(this.world, x, y);
        if (!cell) continue;
        const id = cell.id;
        g.fillStyle = id.startsWith("road") || id.startsWith("zebra")
          ? "#262b3d"
          : id === "grass" || id === "tree"
            ? "#2f5f3c"
            : id.startsWith("roof")
              ? "#555a74"
              : id.startsWith("fac_")
                ? "#7a6a74"
                : "#3b4054";
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  private renderMiniMap(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number) {
    if (!this.miniMap) this.miniMap = this.buildMiniMap();
    const mapW = 84;
    const mapH = Math.round((mapW * this.world.h) / this.world.w);
    const x = camX + vw - mapW - 12;
    const y = camY + 46;

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(8,10,20,0.9)";
    ctx.fillRect(x - 3, y - 3, mapW + 6, mapH + 6);
    ctx.drawImage(this.miniMap, x, y, mapW, mapH);

    const sx = mapW / (this.world.w * TILE);
    const sy = mapH / (this.world.h * TILE);

    /* discoveries, then the hero on top so he is never hidden under one */
    for (const d of this.world.discoveries) {
      ctx.fillStyle = this.found.has(d.id) ? "rgba(89,232,255,0.5)" : "#59e8ff";
      ctx.fillRect(x + d.tx * TILE * sx - 1.5, y + d.ty * TILE * sy - 1.5, 3, 3);
    }

    ctx.fillStyle = "#ff3a4e";
    ctx.fillRect(x + this.px * sx - 1.5, y + this.py * sy - 1.5, 3, 3);

    ctx.strokeStyle = "rgba(232,236,248,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 3, y - 3, mapW + 6, mapH + 6);
    ctx.restore();
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

/* deterministic 0..1 from a tile, for "is this flat's light on" */
function hash3(x: number, y: number, s: number): number {
  let n = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

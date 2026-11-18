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
import {
  buildWorld,
  cellAt,
  DISCOVERIES,
  solidAt,
  venueSolidAt,
  type Discovery,
  type World,
} from "./world";
import { drawItem, drawVenueFloor } from "./interiors";

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
/** a lamp is at full strength within this, and dark beyond LAMP_OFF */
const LAMP_ON = 46;
const LAMP_OFF = 120;

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
    if (this.world.venues.some((v) => venueSolidAt(v, nx, ny + 5))) return;
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

    /*
      Walking into a doorway opens it.

      Pressing E still works, but having to press anything at all made
      people walk past buildings without ever learning there was
      something inside. `armed` stops it reopening the instant the panel
      closes: it only re-arms once you have stepped away again.
    */
    /* 20px, not 13: standing in the doorway puts the hero one tile (16px)
       from the door's centre, so a tighter threshold meant walking up to a
       building never opened it and only the E key ever worked */
    if (best && bestD < 20) {
      if (this.armed && !this.paused) {
        this.armed = false;
        this.onEnter(best);
      }
    } else if (!best || bestD > 30) {
      this.armed = true;
    }
  }

  /** false between opening a discovery and walking away from it */
  private armed = true;

  /** only fires when something the HUD actually renders has changed */
  private emit() {
    this.onState({
      district: this.nearby?.label ?? "Downtown",
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

    this.renderVenues(ctx, x0, y0, x1, y1);
    this.renderProps(ctx, x0, y0, x1, y1);
    this.renderCars(ctx, camX, camY, vw, vh);
    this.renderNpcs(ctx, camX, camY, vw, vh);
    this.renderMarkers(ctx);
    this.renderNight(ctx, camX, camY, vw, vh, x0, y0, x1, y1);
    /* after the night wash, so navigation is never dimmed by it */
    this.renderCompass(ctx, camX, camY, vw, vh);
    this.renderMiniMap(ctx, camX, camY, vw, vh);

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
    /*
      Night as a multiply, not a flat wash.

      Painting translucent navy over the city pulled every colour toward
      the same grey — brick, slate and plum all ended up the same muddy
      blue, which is why the buildings looked dull and blurry. Multiply
      scales each channel instead, so a red brick stays red and only gets
      darker. The tint is warm-shadowed rather than pure blue so the
      ground does not go cold under the lamps.
    */
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#59608f";
    ctx.fillRect(camX, camY, vw, vh);

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

        ctx.fillStyle = shop ? "rgba(255,206,130,0.5)" : "rgba(255,214,150,0.38)";
        if (shop) ctx.fillRect(x * TILE + 2, y * TILE + 6, 12, 8);
        else ctx.fillRect(x * TILE + 4, y * TILE + 4, 8, 7);

        /* a tight spill, not a cloud: a wide soft circle per window was
           what turned whole façades into fog */
        this.light(ctx, x * TILE + 8, y * TILE + 10, shop ? 18 : 12, "255,198,118", shop ? 0.55 : 0.34);
      }
    }

    /*
      Street lamps come on as you reach them.

      Every lamp burning at once made the street a field of overlapping
      grey-white discs with no focus anywhere. Lighting only the ones you
      are near gives the walk a moving pool of warmth, and leaves real
      darkness between them to walk out of.
    */
    for (const p of this.world.props) {
      if (p.id !== "lamp") continue;
      if (p.tx < x0 - 3 || p.tx > x1 + 3 || p.ty < y0 - 3 || p.ty > y1 + 3) continue;

      const lx = p.tx * TILE + 8;
      const ly = p.ty * TILE + 10;
      const d = Math.hypot(lx - this.px, ly - this.py);
      /* full from 0 to LAMP_ON, fading to nothing by LAMP_OFF */
      const t = 1 - (d - LAMP_ON) / (LAMP_OFF - LAMP_ON);
      const on = t < 0 ? 0 : t > 1 ? 1 : t;
      if (on <= 0.01) continue;

      /* the bulb itself brightens too, so the lamp reads as switching on
         rather than a glow appearing around a dark post */
      ctx.fillStyle = `rgba(255,236,180,${0.35 + on * 0.6})`;
      ctx.fillRect(lx - 2, ly - 7, 4, 2);
      this.light(ctx, lx, ly, 26 + on * 14, "255,206,140", 0.3 + on * 0.5);
    }

    /* headlights, thrown ahead of each car */
    for (const car of this.world.cars) {
      if (car.x < camX - 40 || car.x > camX + vw + 40) continue;
      if (car.y < camY - 40 || car.y > camY + vh + 40) continue;
      this.light(ctx, car.x + car.dx * 14, car.y + car.dy * 14, 22, "255,236,190", 0.55);
      this.light(ctx, car.x, car.y, 10, "255,236,190", 0.22);
    }

    /* the beacons, and a soft pool under the hero so he never gets lost */
    for (const d of this.world.discoveries) {
      if (d.tx < x0 - 3 || d.tx > x1 + 3 || d.ty < y0 - 3 || d.ty > y1 + 3) continue;
      const pulse = 0.55 + Math.sin(performance.now() / 420 + d.tx) * 0.16;
      this.light(ctx, d.tx * TILE + 8, d.ty * TILE + 2, 60, "89,232,255", pulse);
    }
    this.light(ctx, this.px, this.py, 26, "190,212,255", 0.26);

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

  /*
    The cutaway buildings.

    Each project building has had its roof left off by the generator, so
    what the street sees is the room itself: floor, furniture, and the
    people working in it. There is no interior to walk into — the
    building IS the exhibit.
  */
  private renderVenues(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) {
    const t = performance.now() / 1000;

    for (const v of this.world.venues) {
      if (v.x1 < x0 - 1 || v.x0 > x1 + 1 || v.y1 < y0 - 1 || v.y0 > y1 + 1) continue;
      const ox = v.x0 * TILE;
      const oy = v.y0 * TILE;

      drawVenueFloor(ctx, v.venue, ox, oy, v.x1 - v.x0 + 1, v.y1 - v.y0 + 1);
      for (const it of v.venue.items) drawItem(ctx, it, v.venue.pal, ox, oy);

      /*
        The people. Each kind of work gets its own motion — typing is a
        small fast nod, lifting is a slow heavy rise, painting leans in
        and out, serving paces the counter. Standing still would make
        every room read as a showroom rather than a workplace.
      */
      for (const wk of v.venue.workers) {
        const wx = ox + wk.x * TILE + 8;
        const base = oy + wk.y * TILE + 11;
        let dy = 0;
        let dx = 0;
        if (wk.doing === "type") dy = Math.sin(t * 7 + wk.x) * 0.9;
        else if (wk.doing === "lift") dy = Math.sin(t * 2.1 + wk.y) * 2.6;
        else if (wk.doing === "paint") dx = Math.sin(t * 3.2 + wk.x) * 1.6;
        else if (wk.doing === "serve") dx = Math.sin(t * 1.5 + wk.y) * 2.4;
        else dy = Math.sin(t * 1.3 + wk.x) * 0.7;

        ctx.fillStyle = "rgba(10,10,18,0.25)";
        ctx.beginPath();
        ctx.ellipse(wx, base + 6, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        const frame = Math.floor(t * (wk.doing === "idle" ? 1.4 : 4)) % 2;
        ctx.drawImage(
          this.atlas.canvas,
          (wk.variant * 2 + frame) * TILE,
          this.atlas.npcRowY,
          TILE,
          TILE,
          Math.round(wx - 8 + dx),
          Math.round(base - 12 + dy),
          TILE,
          TILE
        );
      }
    }
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
      if (car.x < camX - 32 || car.x > camX + vw + 32) continue;
      if (car.y < camY - 32 || car.y > camY + vh + 32) continue;

      const horiz = car.dx !== 0;
      const L = 22; // length along travel
      const W = 11; // width across
      const w = horiz ? L : W;
      const h = horiz ? W : L;
      const x = Math.round(car.x - w / 2);
      const y = Math.round(car.y - h / 2);

      /* ground shadow, offset the way the street lights fall */
      ctx.fillStyle = "rgba(6,8,16,0.38)";
      ctx.fillRect(x + 1, y + 2, w, h);

      /* wheels first, so the body sits over them */
      ctx.fillStyle = "#15171f";
      if (horiz) {
        ctx.fillRect(x + 3, y - 1, 5, 2);
        ctx.fillRect(x + L - 8, y - 1, 5, 2);
        ctx.fillRect(x + 3, y + W - 1, 5, 2);
        ctx.fillRect(x + L - 8, y + W - 1, 5, 2);
      } else {
        ctx.fillRect(x - 1, y + 3, 2, 5);
        ctx.fillRect(x - 1, y + L - 8, 2, 5);
        ctx.fillRect(x + W - 1, y + 3, 2, 5);
        ctx.fillRect(x + W - 1, y + L - 8, 2, 5);
      }

      /* body, with a darker rim so it has an edge rather than floating */
      ctx.fillStyle = car.colour;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      if (horiz) {
        ctx.fillRect(x, y + h - 2, w, 2);
        ctx.fillRect(x, y, w, 1);
      } else {
        ctx.fillRect(x + w - 2, y, 2, h);
        ctx.fillRect(x, y, 1, h);
      }

      /* cabin and glass: the roof is the car colour darkened, the
         windscreen and rear screen are separate so you can read which
         way it is pointing at a glance */
      const dark = "rgba(0,0,0,0.35)";
      const glass = "rgba(150,200,230,0.75)";
      if (horiz) {
        ctx.fillStyle = dark;
        ctx.fillRect(x + 6, y + 1, 10, h - 2);
        ctx.fillStyle = glass;
        ctx.fillRect(car.dx > 0 ? x + 15 : x + 5, y + 2, 2, h - 4);
        ctx.fillRect(car.dx > 0 ? x + 5 : x + 15, y + 2, 2, h - 4);
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(x + 7, y + 1, 8, 2);
      } else {
        ctx.fillStyle = dark;
        ctx.fillRect(x + 1, y + 6, w - 2, 10);
        ctx.fillStyle = glass;
        ctx.fillRect(x + 2, car.dy > 0 ? y + 15 : y + 5, w - 4, 2);
        ctx.fillRect(x + 2, car.dy > 0 ? y + 5 : y + 15, w - 4, 2);
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(x + 1, y + 7, 2, 8);
      }

      /* lamps: white ahead, red behind */
      ctx.fillStyle = "#fff3cf";
      ctx.fillStyle = "#ffeec4";
      if (horiz) {
        const fx = car.dx > 0 ? x + w - 2 : x;
        ctx.fillRect(fx, y + 1, 2, 2);
        ctx.fillRect(fx, y + h - 3, 2, 2);
        ctx.fillStyle = "#e0453a";
        const rx = car.dx > 0 ? x : x + w - 2;
        ctx.fillRect(rx, y + 1, 2, 2);
        ctx.fillRect(rx, y + h - 3, 2, 2);
      } else {
        const fy = car.dy > 0 ? y + h - 2 : y;
        ctx.fillRect(x + 1, fy, 2, 2);
        ctx.fillRect(x + w - 3, fy, 2, 2);
        ctx.fillStyle = "#e0453a";
        const ry = car.dy > 0 ? y : y + h - 2;
        ctx.fillRect(x + 1, ry, 2, 2);
        ctx.fillRect(x + w - 3, ry, 2, 2);
      }
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
      ctx.font = "5px ui-monospace, monospace";
      const label = done ? `✓ ${d.label}` : d.label;
      const w = ctx.measureText(label).width + 5;
      const py = cy - 22 + bob;

      ctx.fillStyle = done ? "rgba(8,12,22,0.62)" : "rgba(8,12,22,0.82)";
      ctx.fillRect(cx - w / 2, py - 4, w, 8);
      ctx.fillStyle = done ? "rgba(89,232,255,0.45)" : near ? "#ffffff" : "rgba(89,232,255,0.95)";
      ctx.fillText(label, cx, py);

      /* the beacon */
      ctx.fillStyle = done ? "rgba(89,232,255,0.3)" : "rgba(89,232,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 15 + bob);
      ctx.lineTo(cx + 2.5, cy - 11.5 + bob);
      ctx.lineTo(cx, cy - 8 + bob);
      ctx.lineTo(cx - 2.5, cy - 11.5 + bob);
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
      ctx.moveTo(5, 0);
      ctx.lineTo(-3, -3.2);
      ctx.lineTo(-3, 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.font = "5px ui-monospace, monospace";
      ctx.fillStyle = "rgba(89,232,255,0.8)";
      ctx.textAlign = "center";
      ctx.fillText(`${dist}m`, cx, cy + 9);
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

    const isBuilding = (x: number, y: number) => {
      const cell = cellAt(this.world, x, y);
      return !!cell && (cell.id.startsWith("roof") || cell.id.startsWith("fac_"));
    };

    /* ground first */
    for (let y = 0; y < this.world.h; y++) {
      for (let x = 0; x < this.world.w; x++) {
        const cell = cellAt(this.world, x, y);
        if (!cell) continue;
        const id = cell.id;
        g.fillStyle =
          id.startsWith("road") || id.startsWith("zebra")
            ? "#20242f"
            : id === "grass" || id === "tree"
              ? "#2c5c3a"
              : "#39404f";
        g.fillRect(x, y, 1, 1);
      }
    }

    /*
      Then the buildings, extruded.

      A flat fill made the radar a grid of grey squares. Dropping a dark
      pixel below-right of every building and lighting its northern edge
      fakes a light source, and suddenly the blocks have height - the same
      trick the city itself uses with its parapets.
    */
    for (let y = 0; y < this.world.h; y++) {
      for (let x = 0; x < this.world.w; x++) {
        if (!isBuilding(x, y)) continue;
        if (!isBuilding(x + 1, y) || !isBuilding(x, y + 1)) {
          g.fillStyle = "rgba(4,6,12,0.55)";
          g.fillRect(x + 1, y + 1, 1, 1);
        }
      }
    }
    for (let y = 0; y < this.world.h; y++) {
      for (let x = 0; x < this.world.w; x++) {
        if (!isBuilding(x, y)) continue;
        const lit = !isBuilding(x, y - 1);
        g.fillStyle = lit ? "#7e86a6" : "#5b6179";
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  private renderMiniMap(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number
  ) {
    if (!this.miniMap) this.miniMap = this.buildMiniMap();

    /*
      Sized against the viewport, not fixed: at a fixed radius the dish
      swallowed a quarter of a small window.

      On a phone it also moves to the top right. Bottom right is where
      the thumb and the interact button live, and a radar under a thumb
      is a radar nobody can read.
    */
    const compact = vw < 260;
    const R = compact
      ? Math.max(20, Math.min(28, vw * 0.13))
      : Math.max(26, Math.min(46, Math.min(vw, vh) * 0.13));
    const SPAN = compact ? 18 : 22; // tiles visible across the radar
    const cx = camX + vw - R - (compact ? 10 : 16);
    const cy = compact ? camY + R + 30 : camY + vh - R - 16;
    const scale = (R * 2) / (SPAN * TILE); // screen px per world px

    ctx.save();

    /* the dish, sitting above the city on a soft shadow */
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 3, R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(6,9,18,0.86)";
    ctx.fill();
    ctx.save();
    ctx.clip();

    const srcW = SPAN;
    const srcX = this.px / TILE - srcW / 2;
    const srcY = this.py / TILE - srcW / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.miniMap, srcX, srcY, srcW, srcW, cx - R, cy - R, R * 2, R * 2);
    ctx.globalAlpha = 1;

    /* blips. Anything outside the dish is pinned to its rim, pointing the
       way, which is the behaviour that makes a radar useful */
    for (const d of this.world.discoveries) {
      const wx = d.tx * TILE + TILE / 2;
      const wy = d.ty * TILE;
      let bx = cx + (wx - this.px) * scale;
      let by = cy + (wy - this.py) * scale;
      const dist = Math.hypot(bx - cx, by - cy);
      const edge = dist > R - 6;
      if (edge) {
        const a = Math.atan2(by - cy, bx - cx);
        bx = cx + Math.cos(a) * (R - 6);
        by = cy + Math.sin(a) * (R - 6);
      }
      const done = this.found.has(d.id);
      if (!done) {
        ctx.fillStyle = "rgba(89,232,255,0.3)";
        ctx.beginPath();
        ctx.arc(bx, by, edge ? 4 : 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = done ? "rgba(89,232,255,0.45)" : "#9df3ff";
      ctx.beginPath();
      ctx.arc(bx, by, edge ? 2 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (!done && !edge) {
        ctx.strokeStyle = "rgba(89,232,255,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 5 + Math.sin(performance.now() / 300) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    /* traffic, so the radar feels live */
    ctx.fillStyle = "rgba(230,235,255,0.5)";
    for (const car of this.world.cars) {
      const bx = cx + (car.x - this.px) * scale;
      const by = cy + (car.y - this.py) * scale;
      if (Math.hypot(bx - cx, by - cy) > R - 4) continue;
      ctx.fillRect(bx - 1, by - 1, 2, 2);
    }

    /* the player arrow, pointing the way he faces */
    const ang =
      this.dir === "up" ? -Math.PI / 2 : this.dir === "down" ? Math.PI / 2 : this.dir === "left" ? Math.PI : 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = "#ff3a4e";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /*
      Glass. A vignette darkens the rim so the dish reads as a bowl
      rather than a sticker, and one bright arc across the top left is
      the reflection every physical screen has.
    */
    const vg = ctx.createRadialGradient(cx, cy, R * 0.45, cx, cy, R);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(2,4,10,0.75)");
    ctx.fillStyle = vg;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    const gloss = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.3, cy + R * 0.4);
    gloss.addColorStop(0, "rgba(255,255,255,0.16)");
    gloss.addColorStop(0.55, "rgba(255,255,255,0.03)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // un-clip

    /* bezel and north mark */
    ctx.strokeStyle = "rgba(10,14,24,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(190,205,235,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(232,236,248,0.75)";
    ctx.font = "7px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", cx, cy - R - 6);

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

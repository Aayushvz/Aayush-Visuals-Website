import {
  buildAtlas,
  heroFrameIndex,
  HERO_CELL_H,
  HERO_CELL_W,
  HERO_H,
  HERO_W,
  NPC_CELL_H,
  NPC_CELL_W,
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

  React owns the shell — intro screen, HUD, Game Boy, project panel — and this
  owns the frame. They talk through narrow channels: input going in, and
  onState going out when something the HUD renders changes.

  Supports Day and Night cycles, varied vehicle models, realistic character
  rendering, direct teleportation, and smooth performance.
*/

const SPEED = 68; // px per second, walking
const SPRINT = 118;
const INTERACT_RANGE = 28;
const LAMP_ON = 46;
const LAMP_OFF = 120;

export type GameState = {
  district: string;
  nearby: Discovery | null;
  found: string[];
  x: number;
  y: number;
  isDay: boolean;
};

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  onState: (s: GameState) => void;
  onEnter: (d: Discovery) => void;
  onToggleGameBoy?: () => void;
};

type Keys = Record<string, boolean>;

export class CityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dayAtlas: Atlas;
  private nightAtlas: Atlas;
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

  public isDay = false; // default night; toggles with Day/Night switch

  private found = new Set<string>();
  private nearby: Discovery | null = null;
  private onState: (s: GameState) => void;
  private onEnter: (d: Discovery) => void;
  private onToggleGameBoy?: () => void;

  /** set by the shell while a panel or drawer is open */
  paused = false;

  /** supplied by the shell after the audio start */
  audio: {
    step: (s: "stone" | "grass" | "road", now: number, running: boolean) => void;
    discover: () => void;
    playWarp?: () => void;
  } | null = null;

  stick = { x: 0, y: 0 };

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("city: no 2d context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.dayAtlas = buildAtlas(true);
    this.nightAtlas = buildAtlas(false);
    this.atlas = this.isDay ? this.dayAtlas : this.nightAtlas;

    this.world = buildWorld(DISCOVERIES);
    this.px = this.world.spawn.x;
    this.py = this.world.spawn.y;
    this.onState = opts.onState;
    this.onEnter = opts.onEnter;
    this.onToggleGameBoy = opts.onToggleGameBoy;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clearKeys);
  }

  /* ── input ─────────────────────────────────────────────────────── */

  private onKeyDown = (e: KeyboardEvent) => {
    const k = keyName(e);
    if (MOVE_KEYS.has(k) || k === " " || k === "e") e.preventDefault();
    this.keys[k] = true;

    if (k === "e" && this.nearby && !this.paused) {
      this.onEnter(this.nearby);
    } else if (k === "g") {
      e.preventDefault();
      this.onToggleGameBoy?.();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[keyName(e)] = false;
  };

  private clearKeys = () => {
    this.keys = {};
  };

  interact() {
    if (this.nearby && !this.paused) this.onEnter(this.nearby);
  }

  setDay(day: boolean) {
    this.isDay = day;
    this.atlas = this.isDay ? this.dayAtlas : this.nightAtlas;
    this.miniMap = null;
    this.emit();
  }

  toggleDayNight() {
    this.setDay(!this.isDay);
  }

  teleportTo(tx: number, ty: number) {
    this.px = tx * TILE + 8;
    this.py = (ty + 1) * TILE + 10;
    this.dir = "up";
    this.audio?.playWarp?.();
    this.checkNearby();
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

  markFound(id: string) {
    this.found.add(id);
    this.emit();
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.08, (now - this.last) / 1000);
    this.last = now;

    if (!this.paused) this.update(dt);
    this.render();

    this.raf = requestAnimationFrame(this.tick);
  };

  /* ── simulation ────────────────────────────────────────────────── */

  private update(dt: number) {
    let vx = 0;
    let vy = 0;

    if (this.keys["w"] || this.keys["arrowup"]) vy -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) vy += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) vx -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) vx += 1;

    if (this.stick.x || this.stick.y) {
      vx = this.stick.x;
      vy = this.stick.y;
    }

    const len = Math.hypot(vx, vy);
    this.moving = len > 0.08;

    if (this.moving) {
      const spd = (this.keys["shift"] ? SPRINT : SPEED) * dt;
      const nx = (vx / len) * spd;
      const ny = (vy / len) * spd;

      if (Math.abs(vx) > Math.abs(vy)) {
        this.dir = vx > 0 ? "right" : "left";
      } else {
        this.dir = vy > 0 ? "down" : "up";
      }

      this.moveAxis(nx, 0);
      this.moveAxis(0, ny);

      this.animT += dt * (this.keys["shift"] ? 11 : 7.5);
      this.frame = Math.floor(this.animT) % 4;
    } else {
      this.animT = 0;
      this.frame = 0;
    }

    this.checkNearby();
    this.updateTraffic(dt);

    if (this.moving) {
      const cell = cellAt(
        this.world,
        Math.floor(this.px / TILE),
        Math.floor((this.py + 6) / TILE)
      );
      const id = cell?.id ?? "walk";
      const surface =
        id === "grass" || id === "tree"
          ? "grass"
          : id.startsWith("road") || id.startsWith("zebra")
            ? "road"
            : "stone";
      this.audio?.step(surface, performance.now(), !!this.keys.shift);
    }
  }

  private updateTraffic(dt: number) {
    const wpx = this.world.w * TILE;
    const hpx = this.world.h * TILE;

    for (const car of this.world.cars) {
      if (car.isParked) continue;
      car.x += car.dx * car.speed * dt;
      car.y += car.dy * car.speed * dt;
      if (car.x < -36) car.x = wpx + 36;
      if (car.x > wpx + 36) car.x = -36;
      if (car.y < -36) car.y = hpx + 36;
      if (car.y > hpx + 36) car.y = -36;
    }

    for (const n of this.world.npcs) {
      n.t += dt;
      const nx = n.x + n.dx * 20 * dt;
      const ny = n.y + n.dy * 20 * dt;
      if (solidAt(this.world, nx, ny + 4)) {
        n.dx = -n.dx;
        n.dy = -n.dy;
      } else {
        n.x = nx;
        n.y = ny;
      }
    }
  }

  /* hero feet collider */
  private moveAxis(dx: number, dy: number) {
    const nx = this.px + dx;
    const ny = this.py + dy;
    const halfW = 4;
    const top = 0;
    const bottom = 4;

    const corners: Array<[number, number]> = [
      [nx - halfW, ny + top],
      [nx + halfW, ny + top],
      [nx - halfW, ny + bottom],
      [nx + halfW, ny + bottom],
    ];

    if (corners.some(([cx, cy]) => solidAt(this.world, cx, cy))) return;
    if (this.world.venues.some((v) => venueSolidAt(v, nx, ny + 4))) return;
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

    if (best && bestD < 22) {
      if (this.armed && !this.paused) {
        this.armed = false;
        this.onEnter(best);
      }
    } else if (!best || bestD > 32) {
      this.armed = true;
    }
  }

  private armed = true;

  private emit() {
    this.onState({
      district: this.nearby?.label ?? "Downtown",
      nearby: this.nearby,
      found: [...this.found],
      x: this.px,
      y: this.py,
      isDay: this.isDay,
    });
  }

  /* ── render ────────────────────────────────────────────────────── */

  private render() {
    const { ctx, canvas } = this;
    const scale = Number(canvas.dataset.scale || 3);
    const vw = canvas.width / scale;
    const vh = canvas.height / scale;

    /*
      The camera follows the ROUNDED hero, not the float one.

      This was the phone jitter. The camera was derived from this.px and
      then rounded for the translate, while the sprite was rounded
      separately — two roundings of the same moving value, crossing their
      .5 boundaries at different moments. The hero's screen position
      therefore flipped between two pixels as he walked, which at the 3x
      phone scale is a three-device-pixel shudder across the whole view.

      Driving both from one integer makes the difference constant: as the
      rounded hero advances a pixel the camera advances with it, so the
      world slides and the hero stays put.
    */
    const hx = Math.round(this.px);
    const hy = Math.round(this.py);
    const camX = Math.max(0, Math.min(this.world.w * TILE - vw, hx - vw / 2));
    const camY = Math.max(0, Math.min(this.world.h * TILE - vh, hy - vh / 2));

    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Background fill
    ctx.fillStyle = this.isDay ? "#d2d8e4" : "#14141c";
    ctx.fillRect(0, 0, vw, vh);

    ctx.translate(-Math.round(camX), -Math.round(camY));

    const x0 = Math.max(0, Math.floor(camX / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(this.world.w - 1, Math.ceil((camX + vw) / TILE));
    const y1 = Math.min(this.world.h - 1, Math.ceil((camY + vh) / TILE));

    // 1. Tiles
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

    // 2. Venues & Props
    this.renderVenues(ctx, x0, y0, x1, y1);
    this.renderProps(ctx, x0, y0, x1, y1);

    // 3. Vehicles & NPCs
    this.renderCars(ctx, camX, camY, vw, vh);
    this.renderNpcs(ctx, camX, camY, vw, vh);

    // 4. Lighting Pass (Daylight sun shadows or Night glow)
    if (this.isDay) {
      this.renderDaylight(ctx, camX, camY, vw, vh, x0, y0, x1, y1);
    } else {
      this.renderNight(ctx, camX, camY, vw, vh, x0, y0, x1, y1);
    }

    // 5. Markers (rendered AFTER lighting so tags stay luminous, crisp & high-contrast!)
    this.renderMarkers(ctx);

    // 6. Navigation UI (always clear)
    this.renderCompass(ctx, camX, camY, vw, vh);
    this.renderMiniMap(ctx, camX, camY, vw, vh);

    // 7. Hero shadow and sprite (grounded firmly beneath feet)
    ctx.fillStyle = this.isDay ? "rgba(15,20,35,0.35)" : "rgba(10,10,18,0.5)";
    ctx.beginPath();
    const shadowX = this.isDay ? Math.round(this.px) + 1.5 : Math.round(this.px);
    const shadowY = this.isDay ? Math.round(this.py) + 3.8 : Math.round(this.py) + 3.2;
    ctx.ellipse(shadowX, shadowY, 5.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    const fi = heroFrameIndex(this.dir, this.moving ? this.frame : 0);
    ctx.drawImage(
      this.atlas.canvas,
      fi * HERO_CELL_W,
      this.atlas.heroRowY,
      HERO_CELL_W,
      HERO_CELL_H,
      Math.round(this.px) - HERO_CELL_W / 2,
      Math.round(this.py) - 14,
      HERO_CELL_W,
      HERO_CELL_H
    );

    // 8. Player Character 'YOU' floating tag (image 4)
    const bob = Math.sin(performance.now() / 240) * 1.5;
    const tagX = Math.round(this.px);
    const tagY = Math.round(this.py) - 25 + bob;

    // Dark pill backing with crisp Spidey red border
    ctx.fillStyle = "rgba(10, 14, 26, 0.92)";
    ctx.strokeStyle = "#e62838";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagX - 11, tagY - 6, 22, 10, 3);
    ctx.fill();
    ctx.stroke();

    // Downward pointer arrow pointing right at Spidey's head
    ctx.fillStyle = "#e62838";
    ctx.beginPath();
    ctx.moveTo(tagX - 3, tagY + 4);
    ctx.lineTo(tagX + 3, tagY + 4);
    ctx.lineTo(tagX, tagY + 7);
    ctx.closePath();
    ctx.fill();

    // 'YOU' text in crisp white
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 6px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", tagX, tagY - 1);

    ctx.restore();
  }

  /*
    Daylight lighting pass:
    Directional sunlight drop shadows to the southeast, plus warm atmosphere.
  */
  private renderDaylight(
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
    ctx.fillStyle = "rgba(18, 24, 42, 0.22)";

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cell = cellAt(this.world, x, y);
        if (!cell || (!cell.id.startsWith("roof") && !cell.id.startsWith("fac_"))) continue;

        const east = cellAt(this.world, x + 1, y);
        const south = cellAt(this.world, x, y + 1);

        if (!east || (!east.id.startsWith("roof") && !east.id.startsWith("fac_"))) {
          ctx.fillRect((x + 1) * TILE, y * TILE + 2, 4, TILE);
        }
        if (!south || (!south.id.startsWith("roof") && !south.id.startsWith("fac_"))) {
          ctx.fillRect(x * TILE + 2, (y + 1) * TILE, TILE, 4);
        }
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(255, 245, 220, 0.12)";
    ctx.fillRect(camX, camY, vw, vh);
    ctx.restore();
  }

  /*
    Night lighting pass:
    Atmospheric deep midnight multiply wash with glowing street lamp pools,
    warm window light, realistic vehicle headlights, and superhero ambient aura.
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
    const prev = ctx.globalCompositeOperation;

    // Detect if hero is currently inside any venue
    const insideVenue = this.world.venues.find((v) => {
      const vx0 = v.x0 * TILE;
      const vy0 = v.y0 * TILE;
      const vx1 = (v.x1 + 1) * TILE;
      const vy1 = (v.y1 + 1) * TILE;
      return this.px >= vx0 && this.px <= vx1 && this.py >= vy0 && this.py <= vy1;
    });

    ctx.globalCompositeOperation = "multiply";
    // If inside a venue, cut out the dark multiply fog over that venue room!
    if (insideVenue) {
      const rx = insideVenue.x0 * TILE;
      const ry = insideVenue.y0 * TILE;
      const rw = (insideVenue.x1 - insideVenue.x0 + 1) * TILE;
      const rh = (insideVenue.y1 - insideVenue.y0 + 1) * TILE;
      ctx.save();
      ctx.beginPath();
      ctx.rect(camX, camY, vw, vh);
      ctx.rect(rx, ry, rw, rh);
      ctx.clip("evenodd");
      ctx.fillStyle = "#2c335a";
      ctx.fillRect(camX, camY, vw, vh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#2c335a";
      ctx.fillRect(camX, camY, vw, vh);
    }

    ctx.globalCompositeOperation = "lighter";

    // When inside a venue, gently warm the room interior without harsh glare/washout
    if (insideVenue) {
      const rx = insideVenue.x0 * TILE;
      const ry = insideVenue.y0 * TILE;
      const rw = (insideVenue.x1 - insideVenue.x0 + 1) * TILE;
      const rh = (insideVenue.y1 - insideVenue.y0 + 1) * TILE;
      const midX = rx + rw / 2;
      const midY = ry + rh / 2;
      const roomRadius = Math.max(36, Math.min(rw, rh) * 0.7);
      this.light(ctx, midX, midY, roomRadius, "255,242,210", 0.2);
    }

    // Windows & Shopfronts
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cell = cellAt(this.world, x, y);
        if (!cell) continue;
        const shop = cell.id.startsWith("fac_shop");
        const win = cell.id.startsWith("fac_win");
        if (!shop && !win) continue;
        if (win && hash3(x, y, 41) > 0.42) continue;

        const rgb = shop ? "255,225,160" : "255,214,130";
        const rad = shop ? 30 : 18;
        const alpha = shop ? 0.42 : 0.28;
        this.light(ctx, x * TILE + 8, y * TILE + 8, rad, rgb, alpha);
      }
    }

    // Street Lamps: warm golden pools that smoothly illuminate as player nears
    const LAMP_PROXIMITY = 90;
    for (const p of this.world.props) {
      if (p.id !== "lamp") continue;
      if (p.tx < x0 - 2 || p.tx > x1 + 2 || p.ty < y0 - 2 || p.ty > y1 + 2) continue;
      const lx = p.tx * TILE + 8;
      const ly = p.ty * TILE + 6;
      const dist = Math.hypot(this.px - lx, this.py - ly);
      if (dist < LAMP_PROXIMITY) {
        const factor = Math.max(0, 1 - dist / LAMP_PROXIMITY);
        const glow = factor * factor; // smooth quadratic falloff
        this.light(ctx, lx, ly, LAMP_ON * (0.7 + 0.35 * factor), "255,228,150", 0.65 * glow);
        this.light(ctx, lx, ly, LAMP_OFF * (0.7 + 0.35 * factor), "255,210,120", 0.28 * glow);
      }
    }

    // Car Headlights & Police Sirens in Night
    const now = performance.now();
    for (const car of this.world.cars) {
      if (car.isParked) continue;
      if (car.x < camX - 40 || car.x > camX + vw + 40) continue;
      if (car.y < camY - 40 || car.y > camY + vh + 40) continue;
      
      const hx = car.x + (car.dx !== 0 ? car.dx * 20 : 0);
      const hy = car.y + (car.dy !== 0 ? car.dy * 20 : 0);
      this.light(ctx, hx, hy, 44, "255,248,210", 0.42);

      // Flashing police siren glow
      if (car.type === "police") {
        const sirenRed = Math.floor(now / 160) % 2 === 0;
        const sColor = sirenRed ? "255,40,60" : "40,120,255";
        this.light(ctx, car.x, car.y, 48, sColor, 0.48);
      }
    }

    // Discoveries & Spider-Man Hero ambient aura
    for (const d of this.world.discoveries) {
      if (d.tx < x0 - 3 || d.tx > x1 + 3 || d.ty < y0 - 3 || d.ty > y1 + 3) continue;
      const pulse = 0.55 + Math.sin(now / 420 + d.tx) * 0.16;
      this.light(ctx, d.tx * TILE + 8, d.ty * TILE + 2, 60, "89,232,255", pulse);
    }
    // Subtle Spider-Sense Hero aura around Spidey
    this.light(ctx, this.px, this.py, 30, "235,55,75", 0.24);

    ctx.globalCompositeOperation = "source-over";
    // Warm illuminated neon room perimeter when inside a venue
    if (insideVenue) {
      const rx = insideVenue.x0 * TILE;
      const ry = insideVenue.y0 * TILE;
      const rw = (insideVenue.x1 - insideVenue.x0 + 1) * TILE;
      const rh = (insideVenue.y1 - insideVenue.y0 + 1) * TILE;
      ctx.save();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(251, 191, 36, 0.6)";
      ctx.shadowBlur = 8;
      ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
      ctx.restore();
    }

    ctx.globalCompositeOperation = prev;
  }

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

      for (const wk of v.venue.workers) {
        const wx = ox + wk.x * TILE + 8;
        const base = oy + wk.y * TILE + 11;
        let dy = 0;
        let dx = 0;
        let dirIdx = 0; // 0 = down, 1 = up, 2 = side
        if (wk.doing === "type") {
          dy = Math.sin(t * 7 + wk.x) * 0.9;
          dirIdx = 1; // Facing up towards computer monitor
        } else if (wk.doing === "lift") {
          dy = Math.sin(t * 2.1 + wk.y) * 2.6;
          dirIdx = 0;
        } else if (wk.doing === "paint") {
          dx = Math.sin(t * 3.2 + wk.x) * 1.6;
          dirIdx = 1; // Facing up towards easel
        } else if (wk.doing === "serve") {
          dx = Math.sin(t * 1.5 + wk.y) * 2.4;
          dirIdx = 0; // Facing down towards counter
        } else {
          dy = Math.sin(t * 1.3 + wk.x) * 0.7;
        }

        ctx.fillStyle = "rgba(10,10,18,0.3)";
        ctx.beginPath();
        ctx.ellipse(wx, base + 4, 4.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        const frame = Math.floor(t * (wk.doing === "idle" ? 1.4 : 4)) % 2;
        const vIdx = (wk.variant ?? 0) % 8;
        const col = (vIdx * 6 + dirIdx * 2 + frame);
        const sx = col * NPC_CELL_W + 1;
        const sy = this.atlas.npcRowY;

        ctx.drawImage(
          this.atlas.canvas,
          sx,
          sy,
          NPC_CELL_W,
          NPC_CELL_H,
          Math.round(wx - NPC_CELL_W / 2 + dx),
          Math.round(base - 13 + dy),
          NPC_CELL_W,
          NPC_CELL_H
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
      ctx.fillStyle = this.isDay ? "rgba(15,20,35,0.25)" : "rgba(10,10,18,0.22)";
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

  /* 
    Enhanced Vehicles:
    Supports taxi, sports car, van, sedan, scooter, and parked vehicles.
  */
  private renderCars(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number
  ) {
    for (const car of this.world.cars) {
      if (car.x < camX - 36 || car.x > camX + vw + 36) continue;
      if (car.y < camY - 36 || car.y > camY + vh + 36) continue;

      const horiz = car.dx !== 0 || car.isParked;
      const type = car.type || "sedan";

      // Vehicle Dimensions
      const L = type === "van" ? 28 : type === "sports" ? 24 : type === "scooter" ? 14 : 22;
      const W = type === "van" ? 13 : type === "scooter" ? 8 : 11;
      const w = horiz ? L : W;
      const h = horiz ? W : L;
      const x = Math.round(car.x - w / 2);
      const y = Math.round(car.y - h / 2);

      // Contact shadow
      ctx.fillStyle = this.isDay ? "rgba(15,20,35,0.35)" : "rgba(6,8,16,0.38)";
      ctx.fillRect(x + 1, y + 2, w, h);

      // Wheels
      ctx.fillStyle = "#15171f";
      if (type === "scooter") {
        if (horiz) {
          ctx.fillRect(x + 1, y + 2, 3, h - 4);
          ctx.fillRect(x + w - 4, y + 2, 3, h - 4);
        } else {
          ctx.fillRect(x + 2, y + 1, w - 4, 3);
          ctx.fillRect(x + 2, y + h - 4, w - 4, 3);
        }
      } else if (horiz) {
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

      // Body base
      ctx.fillStyle = car.colour;
      ctx.fillRect(x, y, w, h);

      // Body rim/depth
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      if (horiz) {
        ctx.fillRect(x, y + h - 2, w, 2);
        ctx.fillRect(x, y, w, 1);
      } else {
        ctx.fillRect(x + w - 2, y, 2, h);
        ctx.fillRect(x, y, 1, h);
      }

      // Type-specific styling
      if (type === "taxi") {
        // Taxi black & white checker beltline
        ctx.fillStyle = "#1a1a24";
        if (horiz) {
          for (let cx = x + 3; cx < x + w - 3; cx += 4) {
            ctx.fillRect(cx, y + 2, 2, 2);
            ctx.fillRect(cx + 2, y + h - 4, 2, 2);
          }
        }
        // Roof Taxi sign
        ctx.fillStyle = "#ffffff";
        const txw = horiz ? 6 : 4;
        const txh = horiz ? 4 : 6;
        ctx.fillRect(Math.round(x + w / 2 - txw / 2), Math.round(y + h / 2 - txh / 2), txw, txh);
        ctx.fillStyle = "#f4c430";
        ctx.fillRect(Math.round(x + w / 2 - 1), Math.round(y + h / 2 - 1), 2, 2);
      } else if (type === "sports") {
        // Racing stripes
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        if (horiz) {
          ctx.fillRect(x, y + Math.floor(h / 2) - 1, w, 2);
        } else {
          ctx.fillRect(x + Math.floor(w / 2) - 1, y, 2, h);
        }
        // Rear spoiler
        ctx.fillStyle = "#1a1a24";
        if (horiz) {
          const sx = car.dx > 0 ? x : x + w - 2;
          ctx.fillRect(sx, y + 1, 2, h - 2);
        } else {
          const sy = car.dy > 0 ? y : y + h - 2;
          ctx.fillRect(x + 1, sy, w - 2, 2);
        }
      } else if (type === "police") {
        // NYPD Police Cruiser: White body, bold blue doors, rooftop flashing siren
        ctx.fillStyle = "#1d4ed8"; // police blue
        if (horiz) {
          ctx.fillRect(x + 5, y + 1, w - 10, h - 2);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x + 7, y + 2, w - 14, h - 4);
        } else {
          ctx.fillRect(x + 1, y + 5, w - 2, h - 10);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x + 2, y + 7, w - 4, h - 14);
        }
        // Roof siren bar
        const now = performance.now();
        const sirenTick = Math.floor(now / 150) % 2 === 0;
        const sirenLeft = sirenTick ? "#ef4444" : "#3b82f6";
        const sirenRight = sirenTick ? "#3b82f6" : "#ef4444";
        const sbw = horiz ? 8 : 4;
        const sbh = horiz ? 4 : 8;
        const sbx = Math.round(x + w / 2 - sbw / 2);
        const sby = Math.round(y + h / 2 - sbh / 2);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(sbx, sby, sbw, sbh);
        if (horiz) {
          ctx.fillStyle = sirenLeft;
          ctx.fillRect(sbx + 1, sby + 1, 3, 2);
          ctx.fillStyle = sirenRight;
          ctx.fillRect(sbx + 4, sby + 1, 3, 2);
        } else {
          ctx.fillStyle = sirenLeft;
          ctx.fillRect(sbx + 1, sby + 1, 2, 3);
          ctx.fillStyle = sirenRight;
          ctx.fillRect(sbx + 1, sby + 4, 2, 3);
        }
      } else if (type === "van") {
        // Cargo roof panel & rear doors
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        if (horiz) {
          ctx.fillRect(x + 4, y + 2, w - 8, h - 4);
          ctx.fillStyle = "#222";
          const rx = car.dx > 0 ? x : x + w - 1;
          ctx.fillRect(rx, y + 2, 1, h - 4);
        } else {
          ctx.fillRect(x + 2, y + 4, w - 4, h - 8);
          ctx.fillStyle = "#222";
          const ry = car.dy > 0 ? y : y + h - 1;
          ctx.fillRect(x + 2, ry, w - 4, 1);
        }
      }

      // Windshield & Glass
      const dark = "rgba(0,0,0,0.35)";
      const glass = this.isDay ? "rgba(180,225,245,0.9)" : "rgba(150,200,230,0.75)";

      if (type !== "scooter") {
        if (horiz) {
          ctx.fillStyle = dark;
          ctx.fillRect(x + 6, y + 1, w - 12, h - 2);
          ctx.fillStyle = glass;
          const frontX = car.dx > 0 ? x + w - 7 : x + 5;
          const rearX = car.dx > 0 ? x + 5 : x + w - 7;
          ctx.fillRect(frontX, y + 2, 2, h - 4);
          ctx.fillRect(rearX, y + 2, 2, h - 4);
        } else {
          ctx.fillStyle = dark;
          ctx.fillRect(x + 1, y + 6, w - 2, h - 12);
          ctx.fillStyle = glass;
          const frontY = car.dy > 0 ? y + h - 7 : y + 5;
          const rearY = car.dy > 0 ? y + 5 : y + h - 7;
          ctx.fillRect(x + 2, frontY, w - 4, 2);
          ctx.fillRect(x + 2, rearY, w - 4, 2);
        }
      } else {
        // Scooter rider
        ctx.fillStyle = "#f5cbaf"; // rider hands/face
        ctx.fillRect(Math.round(x + w / 2 - 2), Math.round(y + h / 2 - 2), 4, 4);
        ctx.fillStyle = car.colour; // helmet
        ctx.fillRect(Math.round(x + w / 2 - 3), Math.round(y + h / 2 - 3), 6, 6);
      }

      // Headlights & Taillights
      if (!car.isParked) {
        const headColor = this.isDay ? "#fffae8" : "#fff6d4";
        const tailColor = "#e63946";

        if (horiz) {
          const fx = car.dx > 0 ? x + w - 2 : x;
          const rx = car.dx > 0 ? x : x + w - 2;
          ctx.fillStyle = headColor;
          ctx.fillRect(fx, y + 1, 2, 2);
          ctx.fillRect(fx, y + h - 3, 2, 2);
          ctx.fillStyle = tailColor;
          ctx.fillRect(rx, y + 1, 2, 2);
          ctx.fillRect(rx, y + h - 3, 2, 2);
        } else {
          const fy = car.dy > 0 ? y + h - 2 : y;
          const ry = car.dy > 0 ? y : y + h - 2;
          ctx.fillStyle = headColor;
          ctx.fillRect(x + 1, fy, 2, 2);
          ctx.fillRect(x + w - 3, fy, 2, 2);
          ctx.fillStyle = tailColor;
          ctx.fillRect(x + 1, ry, 2, 2);
          ctx.fillRect(x + w - 3, ry, 2, 2);
        }
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

      // Realistic grounded pedestrian shadow
      ctx.fillStyle = this.isDay ? "rgba(15,20,35,0.32)" : "rgba(10,10,18,0.45)";
      ctx.beginPath();
      ctx.ellipse(Math.round(n.x), Math.round(n.y) + 3, 5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Determine facing direction: 0 = down, 1 = up, 2 = side
      let dirIdx = 0;
      let flipX = false;
      if (n.dy < -0.1) {
        dirIdx = 1; // Walking up
      } else if (n.dy > 0.1) {
        dirIdx = 0; // Walking down
      } else if (n.dx < -0.1) {
        dirIdx = 2; // Walking left
        flipX = true;
      } else if (n.dx > 0.1) {
        dirIdx = 2; // Walking right
        flipX = false;
      }

      const frame = Math.floor(n.t * 6) % 2;
      const v = (n.variant ?? 0) % 8;
      const col = v * 6 + dirIdx * 2 + frame;
      const sx = col * NPC_CELL_W + 1;
      const sy = this.atlas.npcRowY;

      if (flipX) {
        ctx.save();
        ctx.translate(Math.round(n.x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          this.atlas.canvas,
          sx,
          sy,
          NPC_CELL_W,
          NPC_CELL_H,
          -Math.round(NPC_CELL_W / 2),
          Math.round(n.y) - 13,
          NPC_CELL_W,
          NPC_CELL_H
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          this.atlas.canvas,
          sx,
          sy,
          NPC_CELL_W,
          NPC_CELL_H,
          Math.round(n.x) - Math.round(NPC_CELL_W / 2),
          Math.round(n.y) - 13,
          NPC_CELL_W,
          NPC_CELL_H
        );
      }
    }
  }

  /*
    High-Contrast Arcade Venue Markers:
    Luminous cyber badges with solid backing (never obscured by floor tiles),
    glowing status borders, pointer arrows, and floor landing targets.
  */
  private renderMarkers(ctx: CanvasRenderingContext2D) {
    const t = performance.now() / 1000;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const d of this.world.discoveries) {
      const cx = d.tx * TILE + TILE / 2;
      const cy = d.ty * TILE;
      const bob = Math.sin(t * 2.5 + d.tx) * 1.5;
      const done = this.found.has(d.id);
      const near = this.nearby?.id === d.id;

      ctx.save();
      ctx.font = "5px ui-monospace, monospace";
      const icon = done ? "✓" : near ? "▶" : "✦";
      const label = `${icon} ${d.label}`;
      const textMetrics = ctx.measureText(label);
      const w = textMetrics.width + 10;
      const py = cy - 14 + bob;
      const badgeH = 9;

      // 1. Subtle drop shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;

      // 2. Compact dark backing
      ctx.fillStyle = done
        ? "rgba(6, 12, 24, 0.88)"
        : near
          ? "rgba(10, 16, 36, 0.92)"
          : "rgba(8, 14, 28, 0.86)";
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, py - badgeH / 2, w, badgeH, 2.5);
      ctx.fill();

      // 3. Subtle border
      ctx.strokeStyle = done
        ? "rgba(34, 197, 94, 0.55)"
        : near
          ? "rgba(251, 191, 36, 0.7)"
          : "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 4. Clean text
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = done
        ? "#86efac"
        : near
          ? "#fef08a"
          : "#bae6fd";
      ctx.fillText(label, cx, py + 0.5);

      ctx.restore();
    }
  }

  private renderCompass(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number
  ) {
    // Disable compass direction arrows on mobile screens to prevent clutter
    if (vw < 480) return;

    const pad = 26;
    for (const d of this.world.discoveries) {
      if (this.found.has(d.id)) continue;
      const tx = d.tx * TILE + TILE / 2;
      const ty = d.ty * TILE;
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
      ctx.fillStyle = "rgba(89,232,255,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(`${dist}m`, cx, cy + 9);
    }
  }

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

    for (let y = 0; y < this.world.h; y++) {
      for (let x = 0; x < this.world.w; x++) {
        const cell = cellAt(this.world, x, y);
        if (!cell) continue;
        const id = cell.id;
        g.fillStyle =
          id.startsWith("road") || id.startsWith("zebra")
            ? this.isDay ? "#454958" : "#20242f"
            : id === "grass" || id === "tree"
              ? this.isDay ? "#4a9456" : "#2c5c3a"
              : this.isDay ? "#6c7385" : "#39404f";
        g.fillRect(x, y, 1, 1);
      }
    }

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
        g.fillStyle = lit ? (this.isDay ? "#a4acca" : "#7e86a6") : (this.isDay ? "#788099" : "#5b6179");
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

    const compact = vw < 260;
    const R = compact
      ? Math.max(20, Math.min(28, vw * 0.13))
      : Math.max(26, Math.min(46, Math.min(vw, vh) * 0.13));
    const SPAN = compact ? 18 : 22;
    const cx = camX + vw - R - (compact ? 8 : 16);
    const cy = camY + vh - R - (compact ? 8 : 16);
    const scale = (R * 2) / (SPAN * TILE);

    ctx.save();

    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 3, R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = this.isDay ? "rgba(18,24,38,0.88)" : "rgba(6,9,18,0.86)";
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

    ctx.fillStyle = "rgba(230,235,255,0.5)";
    for (const car of this.world.cars) {
      const bx = cx + (car.x - this.px) * scale;
      const by = cy + (car.y - this.py) * scale;
      if (Math.hypot(bx - cx, by - cy) > R - 4) continue;
      ctx.fillRect(bx - 1, by - 1, 2, 2);
    }

    const ang =
      this.dir === "up"
        ? -Math.PI / 2
        : this.dir === "down"
          ? Math.PI / 2
          : this.dir === "left"
            ? Math.PI
            : 0;
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

    ctx.restore();

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

/*
  Name a key by where it sits, not by what it prints.

  `e.key` is the character the layout produces, so on AZERTY the WASD
  block types z/q/s/d and the hero would not move; holding a modifier
  can change it mid-press, which strands a key in the down state.
  `e.code` is the physical key, identical on every layout, so WASD and
  the arrows both work for everyone. We fall back to `e.key` for the
  keys we read as characters (e, g, space).
*/
function keyName(e: KeyboardEvent): string {
  switch (e.code) {
    case "KeyW": return "w";
    case "KeyA": return "a";
    case "KeyS": return "s";
    case "KeyD": return "d";
    case "KeyE": return "e";
    case "KeyG": return "g";
    case "ArrowUp": return "arrowup";
    case "ArrowDown": return "arrowdown";
    case "ArrowLeft": return "arrowleft";
    case "ArrowRight": return "arrowright";
    case "Space": return " ";
    default: return e.key.toLowerCase();
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

function hash3(x: number, y: number, s: number): number {
  let n = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

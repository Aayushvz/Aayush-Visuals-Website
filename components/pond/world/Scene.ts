// Composes the whole diorama: it builds the parallax layer stack, populates each
// layer with environment pieces, and routes per-frame input (a click on the
// water sends out a ripple). Adding the frog, bugs and particles in later phases
// means dropping new elements into the `stage` layer — nothing here needs to
// change. Draw order is back-to-front by layer.

import { Layer } from "../engine/Layer";
import type { World } from "../engine/World";
import { makePondLayout, computePondLayout, type PondLayout } from "./PondLayout";

import { Sky } from "./environment/Sky";
import { Stars } from "./environment/Stars";
import { Moon } from "./environment/Moon";
import { Mountains } from "./environment/Mountains";
import { Bamboo } from "./environment/Bamboo";
import { Water } from "./environment/Water";
import { Reeds } from "./environment/Reeds";
import { LilyPads } from "./environment/LilyPads";
import { Flowers } from "./environment/Flowers";
import { Foreground } from "./environment/Foreground";
import { Vignette } from "./environment/Vignette";
import { Frog, type Effects } from "./frog/Frog";
import { Bugs } from "./bugs/Bugs";
import { Fireflies } from "./fx/Fireflies";
import { Particles } from "./fx/Particles";
import { Warmth } from "./fx/Warmth";
import { Fish } from "./critters/Fish";
import { Butterfly } from "./critters/Butterfly";
import type { Bug } from "./bugs/Bug";
import { ambience } from "../audio/Ambience";
import { BugTooltip } from "../ui/BugTooltip";
import { Cursor } from "../ui/Cursor";

const DOUBLE_CLICK_MS = 320;

const WATER_PARALLAX = 0.5;

interface MaybeRelayout {
  relayout?: () => void;
}

export class Scene {
  private readonly layers: Layer[] = [];
  private readonly layout: PondLayout = makePondLayout();
  private readonly water: Water;
  private readonly frog: Frog;
  private readonly bugs: Bugs;
  private readonly particles: Particles;
  private readonly fish: Fish;
  private readonly tooltip: BugTooltip;

  // Rapid-water-tap tracking → a fish jumps.
  private waterTaps = 0;
  private lastTapAt = -Infinity;

  // The bug the frog is currently going after — named in the tooltip until eaten.
  private targetedBug: Bug | null = null;

  constructor(world: World) {
    computePondLayout(this.layout, world.width, world.height);
    const rng = world.rng;

    const mk = (name: string, parallax: number): Layer => {
      const l = new Layer(name, parallax);
      this.layers.push(l);
      return l;
    };

    // Back to front. Distant layers barely move; the foreground swings widest.
    const sky = mk("sky", 0);
    const celestial = mk("celestial", 0.05);
    const mountains = mk("mountains", 0.12);
    const grove = mk("grove", 0.22);
    const farReeds = mk("farReeds", 0.4);
    const water = mk("water", WATER_PARALLAX);
    const fireflies = mk("fireflies", 0.85);
    const stage = mk("stage", 1.0);
    const bugsLayer = mk("bugs", 1.0);
    const critters = mk("critters", 1.0);
    const fxLayer = mk("fx", 1.0);
    const foreground = mk("foreground", 1.7);
    const overlay = mk("overlay", 0);

    sky.add(new Sky(this.layout));
    celestial.add(new Stars(this.layout, rng));
    celestial.add(new Moon(this.layout));
    mountains.add(new Mountains(this.layout, rng));
    grove.add(new Bamboo(this.layout, rng));

    // Dim reeds standing along the far bank.
    farReeds.add(
      new Reeds(this.layout, rng, {
        band: [0.04, 0.96],
        count: 16,
        heightFrac: [0.16, 0.4],
        amp: 2.2,
        lit: false,
        cattailChance: 0.22,
      })
    );

    this.water = water.add(new Water(this.layout, rng));

    // Fireflies drift in the mid-depth, behind the frog; more of them light up as
    // the pond flourishes.
    fireflies.add(new Fireflies(this.layout, rng));

    // Fish surface on their own now and then, and whenever the water is tapped
    // repeatedly. Each splash ripples the water and is heard.
    this.fish = critters.add(
      new Fish(this.layout, rng, (x, y, s) => {
        this.water.spawnRipple(x, y, s);
        ambience.splash(Math.min(1, s));
      })
    );

    // Catch flourishes (sparkles + hearts) live in front of the frog and bugs.
    this.particles = fxLayer.add(new Particles(rng));

    // The frog sends its catch flourishes here; the Scene routes them to the
    // particle pool and the water, so the frog knows nothing about either.
    const fx: Effects = {
      sparkle: (x, y, n) => this.particles.sparkle(x, y, n),
      heart: (x, y) => {
        this.particles.heart(x, y);
        ambience.eat(); // the soft gulp of a catch
      },
      ripple: (x, y, s) => this.water.spawnRipple(x, y, s),
      splash: (i) => ambience.splash(i),
    };

    // Boot the soundscape on the first user gesture (browsers require it).
    ambience.installUnlock();

    // The stage: everything resting on the near water. Bugs fly just above it in
    // their own layer; the frog reaches into it to catch them.
    // A few show at first; lotuses then unfurl one per bug, pads one per two.
    const lily = stage.add(new LilyPads(this.layout, rng, 11));
    stage.add(new Flowers(this.layout, rng, 14));
    this.bugs = bugsLayer.add(new Bugs(this.layout, rng));
    this.frog = stage.add(new Frog(this.layout, rng, lily, this.bugs, fx));

    // The butterfly perches on the frog, so it needs the frog to exist first.
    critters.add(new Butterfly(this.layout, rng, this.frog));
    stage.add(
      new Reeds(this.layout, rng, {
        band: [0.0, 0.13],
        count: 5,
        heightFrac: [0.5, 0.9],
        amp: 3.4,
        lit: true,
        cattailChance: 0.6,
      })
    );
    stage.add(
      new Reeds(this.layout, rng, {
        band: [0.87, 1.0],
        count: 5,
        heightFrac: [0.5, 0.9],
        amp: 3.4,
        lit: true,
        cattailChance: 0.6,
      })
    );

    foreground.add(new Foreground(this.layout, rng));

    overlay.add(new Warmth()); // warm wash grows with lushness, under the vignette
    overlay.add(new Vignette());
    this.tooltip = overlay.add(new BugTooltip());
    overlay.add(new Cursor());
  }

  /** Recompute layout and let size-dependent elements rebuild. */
  relayout(world: World): void {
    computePondLayout(this.layout, world.width, world.height);
    for (const layer of this.layers) {
      for (const item of layer.items) {
        (item as MaybeRelayout).relayout?.();
      }
    }
  }

  update(world: World): void {
    // Route taps, most specific first: bug → catch, frog → poke (double-tap →
    // big croak), water → ripple (repeated taps → fish jump).
    for (const c of world.input.takeClicks()) {
      const sx = c.x + world.camera.x; // stage/bug space (parallax 1.0)
      const sy = c.y + world.camera.y;

      const bug = this.bugs.pick(sx, sy);
      if (bug) {
        this.targetedBug = bug;
        this.frog.catch(bug);
        continue;
      }
      if (this.frog.hitTest(sx, sy)) {
        if (c.sincePrev <= DOUBLE_CLICK_MS) {
          this.frog.bigCroak();
          ambience.croak(true);
        } else {
          this.frog.poke();
          ambience.croak(false);
        }
        continue;
      }
      const wx = c.x + world.camera.x * WATER_PARALLAX;
      const wy = c.y + world.camera.y * WATER_PARALLAX;
      if (wy > this.layout.waterlineY) {
        this.water.spawnRipple(wx, wy, 0.85);
        ambience.splash(0.4);
        // A couple of quick taps in the water coax a fish up (it splashes itself).
        this.waterTaps = world.t - this.lastTapAt < 1.2 ? this.waterTaps + 1 : 1;
        this.lastTapAt = world.t;
        if (this.waterTaps >= 2) {
          this.fish.jump(wx, wy);
          this.waterTaps = 0;
        }
      }
    }

    // Name the bug under the cursor — or the one the frog is chasing — in the
    // pixel tooltip. It fades itself in and out.
    if (this.targetedBug && (!this.targetedBug.alive || this.targetedBug.caught)) {
      this.targetedBug = null;
    }
    const hoverX = world.input.x + world.camera.x;
    const hoverY = world.input.y + world.camera.y;
    let named: Bug | null = world.input.present ? this.bugs.pick(hoverX, hoverY) : null;
    if (!named) named = this.targetedBug;
    if (named) {
      this.tooltip.set(named.name, named.x - world.camera.x, named.y - world.camera.y);
    } else {
      this.tooltip.clear();
    }

    for (const layer of this.layers) layer.update(world);
  }

  render(world: World): void {
    for (const layer of this.layers) layer.render(world);
  }
}

"use client";

import { useEffect, useRef } from "react";
import { LIVE_COUNT } from "./experiments";

/*
  PlaygroundHero.

  The one drawn idea on this page: the word PLAYGROUND is not type sitting
  on a background, it is a floor. A handful of balls fall into the hero,
  land on the wordmark's top edge, roll along it and drop off the ends onto
  the bottom of the section. You can pick any of them up and throw it. Run
  the pointer along the letters and each one turns violet under it, the same
  per-letter hover the contact page uses on its heading.

  The balls are rendered as lit spheres rather than drawn circles. What
  actually sells that, in rough order of how much each one buys:

  - A fixed light. Every ball is lit from the same upper-left key, with a
    terminator falling away to the lower-right and a bounce crescent coming
    back off the floor. A radial fill alone reads as a disc; the bounce
    light is what separates the silhouette from the background.
  - A contact shadow that tightens and darkens as a ball nears a surface.
    A sphere with no shadow floats no matter how well it is shaded.
  - Rotating surface detail under fixed shading. The seam turns with the
    ball, the highlight does not, because the light does not travel with
    the object. Baking the highlight into the rotating layer is the single
    most common tell of a fake sphere.
  - Real rolling: angular velocity comes from the contact patch and decays
    with friction, so a ball that lands with sidespin skids before it rolls.
  - Squash along the collision normal on a hard hit, springing back out.

  Seven materials, one per ball, so "realistic" does not mean "seven of the
  same ball": lacquered leather, matte clay, polished steel, glass, cork,
  celluloid and dead rubber all take the same light differently, and the
  material table below is the only place that difference lives.

  Three things keep it cheap:

  - The loop SLEEPS. Once every ball has settled and nobody is pointing at
    the hero, the rAF is cancelled and the canvas holds its last frame. A
    canvas that clears and redraws forever keeps its compositor layer
    permanently invalid, which costs power on an idle tab and is a known
    way to hang headless capture.
  - It pauses entirely when the hero scrolls off screen.
  - Every gradient is built once per ball per size and reused, because they
    are declared in the ball's own local space and the ball is drawn
    translated into it. Rebuilding twenty-eight gradients a frame is the
    kind of thing that makes canvas look expensive when it is not.
  - Under prefers-reduced-motion nothing moves at all: the balls are placed
    at rest on the surfaces they would have fallen onto, drawn once.
*/

const TAU = Math.PI * 2;

type Finish = "seam" | "speckle" | "scratch" | "ring" | "swirl" | "plain";

type Material = {
  /* body: the three stops of the diffuse fill, brightest at the key */
  lit: string;
  base: string;
  dark: string;
  /* how hard the far side falls off, on top of the body fill */
  shade: number;
  /* the specular hot spot: strength, and how tight it is */
  spec: number;
  specR: number;
  /* light coming back off the floor onto the lower-right edge */
  rim: string;
  rimW: number;
  /* light passing through the body and pooling at the bottom (glass) */
  caustic: number;
  finish: Finish;
  detail: string;
};

/*
  The material table.

  Everything stays inside the site's palette - the violet accent, the cream,
  and the graphite of the hero - so this reads as one set of objects in one
  room rather than a bag of sports balls. The difference between them is
  finish, not hue: chrome gets a pinprick specular and a hard terminator,
  clay gets a broad soft one and almost no highlight at all, glass is dark
  where the others are light because it transmits instead of reflecting.
*/
const MATERIALS: Record<string, Material> = {
  /* the cricket ball, in the brand violet. The hero object of the set. */
  leather: {
    lit: "#c2a3ff",
    base: "#7c3aed",
    dark: "#25084f",
    shade: 0.62,
    spec: 0.6,
    specR: 0.36,
    rim: "rgba(178, 150, 255, 0.55)",
    rimW: 0.1,
    caustic: 0,
    finish: "seam",
    detail: "rgba(255, 252, 245, 0.78)",
  },
  /* matte clay. Nearly no specular, so it lives or dies on the terminator */
  clay: {
    lit: "#fbf7ee",
    base: "#d9d2c3",
    dark: "#6f685a",
    shade: 0.5,
    spec: 0.14,
    specR: 0.62,
    rim: "rgba(255, 246, 228, 0.34)",
    rimW: 0.13,
    caustic: 0,
    finish: "speckle",
    detail: "rgba(96, 88, 74, 0.22)",
  },
  /* polished steel: a hard terminator, a pinprick highlight, and a bright
     bounce line where the floor shows up in the reflection */
  steel: {
    lit: "#f6f7fa",
    base: "#63676d",
    dark: "#101215",
    shade: 0.78,
    spec: 1,
    specR: 0.15,
    rim: "rgba(226, 233, 246, 0.72)",
    rimW: 0.07,
    caustic: 0,
    finish: "scratch",
    detail: "rgba(255, 255, 255, 0.16)",
  },
  /* glass. Dark through the middle where it refracts the room away, bright
     at the bottom where the light it swallowed comes back out. */
  glass: {
    lit: "#d9d2f5",
    base: "#4b4468",
    dark: "#161327",
    shade: 0.42,
    spec: 0.92,
    specR: 0.17,
    rim: "rgba(214, 206, 255, 0.8)",
    rimW: 0.08,
    caustic: 0.5,
    finish: "swirl",
    detail: "rgba(232, 228, 255, 0.5)",
  },
  cork: {
    lit: "#ddc79f",
    base: "#a3854f",
    dark: "#3f3018",
    shade: 0.6,
    spec: 0.2,
    specR: 0.5,
    rim: "rgba(232, 197, 141, 0.4)",
    rimW: 0.12,
    caustic: 0,
    finish: "speckle",
    detail: "rgba(48, 34, 14, 0.3)",
  },
  /* thin celluloid: light gets through the shell, so the shadow side never
     goes properly dark and the whole ball glows a little */
  celluloid: {
    lit: "#ffffff",
    base: "#efeade",
    dark: "#a9a396",
    shade: 0.3,
    spec: 0.34,
    specR: 0.54,
    rim: "rgba(255, 250, 236, 0.5)",
    rimW: 0.16,
    caustic: 0.22,
    finish: "ring",
    detail: "rgba(120, 112, 96, 0.28)",
  },
  /* dead rubber. Eats the light. The quiet one that makes the rest read. */
  rubber: {
    lit: "#6c608a",
    base: "#2f2842",
    dark: "#0c0a14",
    shade: 0.72,
    spec: 0.12,
    specR: 0.46,
    rim: "rgba(150, 130, 200, 0.34)",
    rimW: 0.11,
    caustic: 0,
    finish: "plain",
    detail: "rgba(255, 255, 255, 0.07)",
  },
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /* orientation and angular velocity, in radians and radians/frame */
  a: number;
  w: number;
  /* squash amount and the axis it is squashed along */
  sq: number;
  sqA: number;
  sleeping: boolean;
  mat: Material;
  /* normalised surface flecks, generated once so they survive a resize */
  flecks: { x: number; y: number; r: number; a: number }[];
  /* gradients live in the ball's local space, so they are built per radius
     and reused every frame instead of per frame */
  cacheR: number;
  gBody: CanvasGradient | null;
  gShade: CanvasGradient | null;
  gSpec: CanvasGradient | null;
  gCaustic: CanvasGradient | null;
};

const GRAV = 0.42;
const REST = 0.62; /* bounce energy kept on a wall hit */
const ROLL = 0.988; /* horizontal drag while rolling on a surface */
const AIR = 0.998;
const SLEEP_V = 0.12; /* below this, and grounded, a ball stops simulating */
const FRICTION = 0.14; /* how fast a skidding contact patch becomes a roll */

/* the fixed key light, as a fraction of each ball's radius */
const LX = -0.36;
const LY = -0.42;

/* radii as a fraction of the hero's short side, so the toy scales with the
   section instead of being seven fixed pixel sizes that look wrong on a phone */
const SIZES = [0.062, 0.033, 0.046, 0.026, 0.053, 0.03, 0.04];
const MATS = ["leather", "clay", "steel", "glass", "cork", "celluloid", "rubber"];

/* a tiny deterministic generator, so a ball's flecks are its own and stay
   put across resizes instead of reshuffling every time the window moves */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function PlaygroundHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLElement | null>(null);
  const wordRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const word = wordRef.current;
    if (!canvas || !host || !word) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    /* the floor, which is the bottom of the section minus whatever the
       bottom labels occupy - see measure() */
    let floorY = 0;
    /* the wordmark's collision box in canvas space, refreshed on resize */
    let shelf = { x: 0, y: 0, w: 0, h: 0 };
    /* the full glyph box, used for the hover light rather than for physics */
    let wordBox = { x: 0, y: 0, w: 0, h: 0 };
    let balls: Ball[] = [];

    let raf = 0;
    let running = false;
    let visible = true;
    let held: Ball | null = null;
    let heldPrev = { x: 0, y: 0 };

    /* the wordmark, one box per glyph, for the per-letter hover */
    let letterEls: HTMLElement[] = [];
    let letterBoxes: { x: number; y: number; w: number; h: number }[] = [];
    let litLetter = -1;

    /* the hero follows the site's theme toggle, so the hairline that keeps a
       dark ball off a dark background has to know which way round it is */
    let light = document.documentElement.dataset.theme === "light";

    /* ---- layout ---------------------------------------------------- */

    /*
      Fit the wordmark to the measure.

      A clamp()ed vw font-size can only ever be approximately right: the rail
      inset clamps at both ends, the scrollbar eats width, and the glyph
      advance depends on which face actually loaded. Any of those turns "fills
      the column" into either a clipped final letter or a dead gap. So the CSS
      clamp is only the pre-hydration guess, and this measures the real thing:
      set a known probe size, read the natural advance, scale to the column.

      It matters more here than it would on a normal headline, because this
      wordmark is the level geometry - the balls land on its box.
    */
    const titleEl = word.parentElement as HTMLElement | null;
    const inner = host.querySelector(".pgHero__inner") as HTMLElement | null;
    const footEl = host.querySelector(".pgHero__foot") as HTMLElement | null;
    /* a throwaway context, used only to ask the font where its ink is */
    const metrics = document.createElement("canvas").getContext("2d");

    const fitTitle = () => {
      if (!titleEl || !inner) return;
      const cs = getComputedStyle(inner);
      const avail =
        inner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (avail <= 0) return;
      titleEl.style.fontSize = "100px";
      const natural = word.getBoundingClientRect().width;
      if (!natural) {
        titleEl.style.fontSize = "";
        return;
      }
      titleEl.style.fontSize = `${Math.max(28, (avail / natural) * 100)}px`;
    };

    const measure = () => {
      fitTitle();
      const b = host.getBoundingClientRect();
      const wb = word.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = b.width;
      h = b.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      wordBox = {
        x: wb.left - b.left,
        y: wb.top - b.top,
        w: wb.width,
        h: wb.height,
      };

      /* one box per glyph, in the same canvas space as the pointer, because
         the letters never get a pointer event of their own (see setLit) */
      letterBoxes = letterEls.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - b.left,
          y: r.top - b.top,
          w: r.width,
          h: r.height,
        };
      });

      /*
        The collision surface is the wordmark's INK, not its layout box.

        A text box is the line box: it carries the font's full ascent and
        descent plus half-leading, and with a line-height under 1 the glyphs
        actually overflow it at both ends. Balls landing on the box top hover
        above the letters; a hand-tuned fraction of the box height instead
        (which is what this used to be) is only right for one font at one
        size, and at 69px on a phone it dropped them a fifth of a letter into
        the type.

        So ask the font. actualBoundingBoxAscent/Descent are the ink extents
        of this exact string measured from the alphabetic baseline, and the
        baseline can be recovered from the box: box top, plus half-leading,
        plus the font's own ascent. The result is the cap line of "P" and the
        tail of "y", which is exactly the surface these balls should sit on.
      */
      let top = wordBox.y + wordBox.h * 0.3;
      let bottom = top + wordBox.h * 0.52;
      if (metrics) {
        const cs = getComputedStyle(word);
        metrics.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = metrics.measureText(word.textContent || "");
        const fbA = m.fontBoundingBoxAscent;
        const fbD = m.fontBoundingBoxDescent;
        const abA = m.actualBoundingBoxAscent;
        const abD = m.actualBoundingBoxDescent;
        if (fbA && abA) {
          const baseline = wordBox.y + (wordBox.h - (fbA + fbD)) / 2 + fbA;
          top = baseline - abA;
          bottom = baseline + abD;
        }
      }

      shelf = {
        x: wordBox.x,
        y: top,
        w: wordBox.w,
        h: Math.max(2, bottom - top),
      };

      /*
        The floor stops above the bottom labels rather than at the section's
        edge. Balls settling on the true bottom end up sitting behind "grab
        one, throw it" and the live count, which on a phone is most of the
        space under the wordmark - the toy and the type were fighting over
        the same 50 pixels.
      */
      floorY = h;
      if (footEl) {
        const fr = footEl.getBoundingClientRect();
        floorY = Math.min(h, fr.top - b.top - 10);
      }
      floorY = Math.max(floorY, shelf.y + shelf.h + 30);
    };

    /*
      The scale the balls are sized off.

      Min of the two sides, so the set never outgrows the section - except on
      a portrait phone, where the short side is the width and sizing off it
      alone leaves seven small balls rattling around a very tall room. Past
      a 1.4 aspect the basis is nudged up so the toy still has presence on a
      screen that is mostly height.
    */
    const shortSide = () => {
      const s = Math.min(w, h);
      return h > w * 1.4 ? s * 1.24 : s;
    };

    /* ---- material set-up --------------------------------------------- */

    /*
      Build the four gradients a ball needs, in its own local space with the
      centre at the origin. They only change when the radius does, which is
      why the ball is drawn translated rather than the gradients being built
      at its current position every frame.
    */
    const buildGradients = (b: Ball) => {
      const { r, mat } = b;
      b.cacheR = r;

      const body = ctx.createRadialGradient(LX * r, LY * r, r * 0.04, 0, 0, r * 1.32);
      body.addColorStop(0, mat.lit);
      body.addColorStop(0.42, mat.base);
      body.addColorStop(1, mat.dark);
      b.gBody = body;

      /* the terminator, laid over the rotating detail so the seam on the
         dark side is in shadow too */
      const shade = ctx.createRadialGradient(
        LX * r * 0.8,
        LY * r * 0.8,
        r * 0.1,
        0,
        0,
        r * 1.06
      );
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(0.5, "rgba(0,0,0,0)");
      shade.addColorStop(0.82, `rgba(0,0,0,${mat.shade * 0.42})`);
      shade.addColorStop(1, `rgba(0,0,0,${mat.shade})`);
      b.gShade = shade;

      const sx = LX * r;
      const sy = LY * r;
      const spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * mat.specR);
      spec.addColorStop(0, `rgba(255,255,255,${mat.spec})`);
      spec.addColorStop(0.42, `rgba(255,255,255,${mat.spec * 0.22})`);
      spec.addColorStop(1, "rgba(255,255,255,0)");
      b.gSpec = spec;

      if (mat.caustic > 0) {
        const c = ctx.createRadialGradient(0, r * 0.5, 0, 0, r * 0.5, r * 0.72);
        c.addColorStop(0, `rgba(236,232,255,${mat.caustic})`);
        c.addColorStop(1, "rgba(236,232,255,0)");
        b.gCaustic = c;
      } else {
        b.gCaustic = null;
      }
    };

    const seed = () => {
      const s = shortSide();
      balls = SIZES.map((f, i) => {
        const r = Math.max(11, f * s);
        const rnd = lcg(i * 9176 + 17);
        /* half start above the shelf so they land on the word, half start
           in the gap below it so the floor gets used too */
        const onWord = i % 2 === 0;
        const x = w * (0.1 + 0.13 * i) + (i % 3) * 18;
        const y = onWord
          ? shelf.y - r - (60 + i * 46)
          : shelf.y + shelf.h + r + 20 + (i % 3) * 14;

        /* rejection-free disc sampling: the sqrt keeps flecks evenly spread
           over the face instead of clustering in the middle */
        const flecks = Array.from({ length: 26 }, () => {
          const t = rnd() * TAU;
          const d = Math.sqrt(rnd()) * 0.88;
          return {
            x: Math.cos(t) * d,
            y: Math.sin(t) * d,
            r: 0.018 + rnd() * 0.05,
            a: 0.3 + rnd() * 0.7,
          };
        });

        const ball: Ball = {
          x: Math.min(w - r - 4, Math.max(r + 4, x)),
          y,
          vx: reduced ? 0 : (i % 2 ? -1 : 1) * (0.4 + (i % 3) * 0.25),
          vy: 0,
          r,
          a: rnd() * TAU,
          w: 0,
          sq: 0,
          sqA: 0,
          sleeping: false,
          mat: MATERIALS[MATS[i]],
          flecks,
          cacheR: -1,
          gBody: null,
          gShade: null,
          gSpec: null,
          gCaustic: null,
        };
        buildGradients(ball);
        return ball;
      });

      if (reduced) {
        /* place everything at rest instead of simulating a fall */
        for (const b of balls) {
          const over = b.x > shelf.x && b.x < shelf.x + shelf.w;
          const restY = b.y < shelf.y && over ? shelf.y - b.r : floorY - b.r - 2;
          b.y = restY;
          b.vx = 0;
          b.w = 0;
          b.sleeping = true;
        }
      }
    };

    /* ---- simulation -------------------------------------------------- */

    /* a hit hard enough to see deforms the ball along the contact normal
       and springs back; anything gentle is ignored so a resting ball is
       never subtly oval */
    const impact = (b: Ball, speed: number, normal: number) => {
      const s = Math.min(0.26, Math.abs(speed) / 58);
      if (s <= b.sq) return;
      b.sq = s;
      b.sqA = normal;
    };

    /*
      Rolling contact. The surface under the ball is stationary, so the
      contact patch moves at vx - w*r; friction bleeds that difference away
      until it is zero, which is the definition of rolling without slipping.
      Doing it this way (rather than setting w = vx/r outright) is what makes
      a thrown ball skid for a moment before it starts to roll.
    */
    const contact = (b: Ball) => {
      const slip = b.vx - b.w * b.r;
      const dw = (slip * FRICTION) / b.r;
      b.w += dw;
      b.vx -= dw * b.r * 0.42;
    };

    const collideWalls = (b: Ball) => {
      if (b.x - b.r < 0) {
        b.x = b.r;
        impact(b, b.vx, 0);
        b.vx = Math.abs(b.vx) * REST;
        b.w *= 0.86;
      } else if (b.x + b.r > w) {
        b.x = w - b.r;
        impact(b, b.vx, 0);
        b.vx = -Math.abs(b.vx) * REST;
        b.w *= 0.86;
      }
      if (b.y + b.r > floorY) {
        b.y = floorY - b.r;
        impact(b, b.vy, Math.PI / 2);
        b.vy = -Math.abs(b.vy) * REST;
        b.vx *= ROLL;
        contact(b);
      } else if (b.y - b.r < 0) {
        b.y = b.r;
        impact(b, b.vy, Math.PI / 2);
        b.vy = Math.abs(b.vy) * REST;
      }
    };

    /*
      Circle against the wordmark's rectangle, resolved on the axis of least
      penetration. Approaching from the top is the common case and the one
      that has to look right, so the vertical branch also applies rolling
      drag; the side branches just push the ball back out.
    */
    const collideShelf = (b: Ball) => {
      if (shelf.w <= 0) return;
      const cx = Math.max(shelf.x, Math.min(b.x, shelf.x + shelf.w));
      const cy = Math.max(shelf.y, Math.min(b.y, shelf.y + shelf.h));
      const dx = b.x - cx;
      const dy = b.y - cy;
      if (dx * dx + dy * dy > b.r * b.r) return;

      const fromTop = b.y < shelf.y + shelf.h / 2;
      const penY = fromTop ? shelf.y - (b.y + b.r) : shelf.y + shelf.h - (b.y - b.r);
      const fromLeft = b.x < shelf.x + shelf.w / 2;
      const penX = fromLeft ? shelf.x - (b.x + b.r) : shelf.x + shelf.w - (b.x - b.r);

      if (Math.abs(penY) <= Math.abs(penX)) {
        b.y += penY;
        impact(b, b.vy, Math.PI / 2);
        b.vy = -b.vy * REST;
        b.vx *= ROLL;
        contact(b);
      } else {
        b.x += penX;
        impact(b, b.vx, 0);
        b.vx = -b.vx * REST;
        b.w *= 0.86;
      }
    };

    /* Pair response. Seven balls is 21 pairs, which is nothing, so the
       naive double loop is the right call here. */
    const collidePairs = () => {
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const min = a.r + b.r;
          if (d === 0 || d >= min) continue;
          const nx = dx / d;
          const ny = dy / d;
          const push = (min - d) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel > 0) continue;
          /* mass scales with area, so the big leather ball shoves the small
             ones aside instead of trading momentum with them evenly */
          const ma = a.r * a.r;
          const mb = b.r * b.r;
          const imp = (-(1 + 0.5) * rel) / (1 / ma + 1 / mb);
          a.vx -= (imp * nx) / ma;
          a.vy -= (imp * ny) / ma;
          b.vx += (imp * nx) / mb;
          b.vy += (imp * ny) / mb;
          const n = Math.atan2(ny, nx);
          impact(a, rel, n);
          impact(b, rel, n);
          a.sleeping = false;
          b.sleeping = false;
        }
      }
    };

    const step = () => {
      for (const b of balls) {
        b.sq *= 0.84;
        if (b === held || b.sleeping) continue;
        b.vy += GRAV;
        b.vx *= AIR;
        b.x += b.vx;
        b.y += b.vy;
        collideWalls(b);
        collideShelf(b);
        /* spin decays in the air too, just far more slowly than on a surface */
        b.w *= 0.995;
        b.a += b.w;
      }
      collidePairs();

      /* settle test: grounded, slow, and not being thrown */
      for (const b of balls) {
        if (b === held) continue;
        const onFloor = b.y + b.r >= floorY - 0.8;
        const onShelf =
          Math.abs(b.y + b.r - shelf.y) < 1.2 &&
          b.x > shelf.x - b.r &&
          b.x < shelf.x + shelf.w + b.r;
        if (
          (onFloor || onShelf) &&
          Math.abs(b.vy) < 1 &&
          Math.abs(b.vx) < SLEEP_V &&
          Math.abs(b.w) < 0.012 &&
          b.sq < 0.01
        ) {
          b.vx = 0;
          b.vy = 0;
          b.w = 0;
          b.sq = 0;
          b.sleeping = true;
        }
      }
    };

    /* ---- paint -------------------------------------------------------- */

    /*
      The surface, drawn in the ball's rotating frame. Nothing in here knows
      where the light is; that is the whole point. The shading pass goes on
      top afterwards in the fixed frame.
    */
    const drawFinish = (b: Ball) => {
      const { r, mat } = b;
      switch (mat.finish) {
        case "seam": {
          /* a real seam is a raised welt with rows of stitches either side
             of it, so it gets a dark trench first and the thread on top */
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.6, r * 0.95, 0, 0, TAU);
          ctx.strokeStyle = "rgba(26, 6, 58, 0.5)";
          ctx.lineWidth = r * 0.1;
          ctx.stroke();

          ctx.strokeStyle = mat.detail;
          ctx.lineWidth = Math.max(0.8, r * 0.05);
          ctx.lineCap = "round";
          ctx.setLineDash([r * 0.1, r * 0.14]);
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.53, r * 0.88, 0, 0, TAU);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.67, r * 1.0, 0, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineCap = "butt";
          break;
        }
        case "ring": {
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.32, r * 0.98, 0, 0, TAU);
          ctx.strokeStyle = mat.detail;
          ctx.lineWidth = Math.max(0.6, r * 0.035);
          ctx.stroke();
          break;
        }
        case "speckle": {
          ctx.fillStyle = mat.detail;
          for (const f of b.flecks) {
            ctx.globalAlpha = f.a;
            ctx.beginPath();
            ctx.arc(f.x * r, f.y * r, f.r * r, 0, TAU);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "scratch": {
          ctx.strokeStyle = mat.detail;
          ctx.lineWidth = Math.max(0.5, r * 0.016);
          for (let i = 0; i < 5; i++) {
            const f = b.flecks[i];
            ctx.beginPath();
            ctx.arc(
              f.x * r * 2.4,
              f.y * r * 2.4,
              r * (0.9 + f.r * 6),
              0.2,
              0.2 + f.a * 0.6
            );
            ctx.stroke();
          }
          break;
        }
        case "swirl": {
          /* two bubbles and a faint internal flaw: enough to say the sphere
             has an inside, which is the only thing that separates glass
             from a dark plastic ball */
          ctx.strokeStyle = mat.detail;
          ctx.lineWidth = Math.max(0.6, r * 0.026);
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.46, 0.6, 2.4);
          ctx.stroke();
          ctx.fillStyle = mat.detail;
          ctx.beginPath();
          ctx.arc(r * 0.24, -r * 0.12, r * 0.055, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-r * 0.18, r * 0.3, r * 0.038, 0, TAU);
          ctx.fill();
          break;
        }
        default:
          break;
      }
    };

    /* the crescent of light bounced back up off the floor. Three passes at
       falling alpha stand in for a blur, which would cost a filter and a
       whole extra surface for something this small. */
    const drawRim = (b: Ball) => {
      const { r, mat } = b;
      ctx.strokeStyle = mat.rim;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.5 - i * 0.14;
        ctx.lineWidth = r * mat.rimW * (1 + i * 0.85);
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.97 - i * 0.03), Math.PI * 0.1, Math.PI * 0.82);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    /*
      The contact shadow.

      Physically the penumbra widens and the core lightens as the caster
      lifts away, so both move together off one distance term. Without this
      a perfectly shaded sphere still floats, and it is the only cue that
      tells you a ball is resting ON the letters rather than in front of them.
    */
    const drawShadow = (b: Ball) => {
      const over = b.x > shelf.x - b.r * 0.4 && b.x < shelf.x + shelf.w + b.r * 0.4;
      const below = over && b.y + b.r <= shelf.y + 2 ? shelf.y : floorY;
      const gap = below - (b.y + b.r);
      const reach = b.r * 2.6;
      if (gap > reach || gap < -b.r) return;

      const t = Math.max(0, Math.min(1, gap / reach));
      const alpha = (1 - t) * (1 - t) * 0.5;
      if (alpha < 0.004) return;
      const rx = b.r * (0.9 + t * 0.7);

      ctx.save();
      ctx.translate(b.x, below + 1);
      ctx.scale(1, 0.24);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(8, 4, 20, ${alpha})`);
      g.addColorStop(0.55, `rgba(8, 4, 20, ${alpha * 0.52})`);
      g.addColorStop(1, "rgba(8, 4, 20, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, TAU);
      ctx.fill();
      ctx.restore();
    };

    /* squash is applied inside the clip, so the shading and the silhouette
       deform together rather than the fill sliding inside a round outline */
    const deform = (b: Ball) => {
      ctx.translate(b.x, b.y);
      if (b.sq > 0.004) {
        ctx.rotate(b.sqA);
        ctx.scale(1 - b.sq, 1 + b.sq);
        ctx.rotate(-b.sqA);
      }
    };

    const drawBall = (b: Ball) => {
      const r = b.r;
      if (b.cacheR !== r) buildGradients(b);

      ctx.save();
      deform(b);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.clip();

      /* 1. the lit body */
      ctx.fillStyle = b.gBody!;
      ctx.fillRect(-r, -r, r * 2, r * 2);

      /* 2. surface detail, in the rotating frame */
      ctx.save();
      ctx.rotate(b.a);
      drawFinish(b);
      ctx.restore();

      /* 3. the light, in the fixed frame, over the detail */
      ctx.fillStyle = b.gShade!;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      if (b.gCaustic) {
        ctx.fillStyle = b.gCaustic;
        ctx.fillRect(-r, -r, r * 2, r * 2);
      }
      drawRim(b);
      ctx.fillStyle = b.gSpec!;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();

      /* 4. a hairline on the silhouette, so a dark ball still has an edge
            against a dark room instead of dissolving into it */
      ctx.save();
      deform(b);
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.5, 0, TAU);
      ctx.strokeStyle = b === held
        ? light
          ? "rgba(31,31,31,0.42)"
          : "rgba(255,255,255,0.5)"
        : light
          ? "rgba(31,31,31,0.16)"
          : "rgba(255,255,255,0.13)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      /* every shadow before every ball, so a ball can never be painted
         under the shadow of the one next to it */
      for (const b of balls) drawShadow(b);
      for (const b of balls) drawBall(b);
    };

    /* ---- loop, with a real off switch ---------------------------------- */

    const allAsleep = () => !held && balls.every((b) => b.sleeping);

    const frame = () => {
      step();
      draw();
      if (allAsleep()) {
        running = false;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (reduced || running || !visible) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    /* ---- pointer ------------------------------------------------------- */

    const local = (e: PointerEvent) => {
      const b = host.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };

    /*
      The per-letter hover has to be driven from here.

      The canvas covers the whole hero and sits above the type so the balls
      can rest on the letters, which means the letters never receive a
      pointer event of their own and the plain CSS :hover the contact page
      uses on its heading would never fire here. So the hit test is done by
      hand against the measured glyph boxes and only the class is handed
      back to CSS, which still owns what "lit" looks like.

      Colour only, no lift: on the contact page the letters are decoration
      and a 4px rise costs nothing, but here the wordmark is the collision
      surface, and a letter that moves out from under a resting ball leaves
      it hanging in the air.
    */
    const setLit = (i: number) => {
      if (i === litLetter) return;
      letterEls[litLetter]?.classList.remove("pgHero__letter--lit");
      letterEls[i]?.classList.add("pgHero__letter--lit");
      litLetter = i;
    };

    const letterAt = (p: { x: number; y: number }) => {
      for (let i = 0; i < letterBoxes.length; i++) {
        const l = letterBoxes[i];
        /* the glyph box carries the font's full ascent and descent, so the
           band is trimmed to roughly the letters you can actually see */
        if (
          p.x >= l.x &&
          p.x <= l.x + l.w &&
          p.y >= l.y + l.h * 0.12 &&
          p.y <= l.y + l.h * 0.92
        ) {
          return i;
        }
      }
      return -1;
    };

    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      const p = local(e);
      let best: Ball | null = null;
      let bestD = Infinity;
      for (const b of balls) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < b.r + 14 && d < bestD) {
          best = b;
          bestD = d;
        }
      }
      if (!best) return;
      held = best;
      held.sleeping = false;
      heldPrev = { x: p.x, y: p.y };
      canvas.classList.add("pgHero__toys--holding");
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      /* a grab is a deliberate gesture on a canvas that otherwise lets the
         page scroll straight past it, so only then is the default suppressed */
      e.preventDefault();
      wake();
    };

    const onMove = (e: PointerEvent) => {
      const p = local(e);
      /* a finger is not a hover. On touch the pointer only exists while it
         is pressed, so lighting letters under it would leave one stuck lit
         at wherever the drag ended. */
      setLit(held || e.pointerType === "touch" ? -1 : letterAt(p));
      if (reduced) return;

      if (held) {
        held.x = p.x;
        held.y = p.y;
        held.vx = p.x - heldPrev.x;
        held.vy = p.y - heldPrev.y;
        /* a carried ball turns with the hand, which is what stops a dragged
           sphere from looking like a decal stuck to the cursor */
        held.w += ((held.vx / held.r) * 0.2 - held.w) * 0.25;
        held.a += held.w;
        heldPrev = { x: p.x, y: p.y };
        wake();
        return;
      }

      /* a passing cursor only disturbs what it actually touches, so moving
         across the hero does not restart the whole simulation */
      for (const b of balls) {
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < b.r + 26) {
          const k = (b.r + 26 - d) / (b.r + 26);
          b.vx += ((b.x - p.x) / (d || 1)) * k * 2.2;
          b.vy += ((b.y - p.y) / (d || 1)) * k * 2.2 - 0.6;
          b.sleeping = false;
          wake();
        }
      }
    };

    const onLeave = () => setLit(-1);

    const release = (e?: PointerEvent) => {
      setLit(-1);
      if (!held) return;
      /* cap the throw so a fast flick cannot tunnel a ball out of the box */
      held.vx = Math.max(-38, Math.min(38, held.vx));
      held.vy = Math.max(-38, Math.min(38, held.vy));
      held = null;
      canvas.classList.remove("pgHero__toys--holding");
      if (e) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
      wake();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerleave", onLeave);

    /* ---- lifecycle ----------------------------------------------------- */

    letterEls = Array.from(
      word.querySelectorAll<HTMLElement>(".pgHero__letter")
    );

    measure();
    seed();
    draw();
    if (!reduced) wake();

    /* the fitted size depends on which face actually loaded, so refit once
       the real one is in rather than leaving the wordmark, and therefore the
       collision box, sized to the fallback */
    let dead = false;
    document.fonts?.ready.then(() => {
      if (dead) return;
      measure();
      for (const b of balls) b.sleeping = false;
      draw();
      if (!reduced) wake();
    });

    const ro = new ResizeObserver(() => {
      const prev = { w, h };
      measure();
      if (!prev.w || !prev.h) {
        seed();
      } else {
        /* keep the toys where they are proportionally rather than dropping
           a fresh set every time a mobile browser bar hides */
        const sx = w / prev.w;
        const sy = h / prev.h;
        const s = shortSide();
        balls.forEach((b, i) => {
          b.x *= sx;
          b.y *= sy;
          b.r = Math.max(11, SIZES[i] * s);
          b.sleeping = false;
        });
      }
      draw();
      if (!reduced) wake();
    });
    ro.observe(host);

    /* the hero now sits on the site's theme-reactive surface, so the one
       colour the canvas cannot take from CSS has to be re-read on a toggle */
    const themeObserver = new MutationObserver(() => {
      const next = document.documentElement.dataset.theme === "light";
      if (next === light) return;
      light = next;
      draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          running = false;
        } else if (!reduced && !allAsleep()) {
          wake();
        }
      },
      { threshold: 0 }
    );
    io.observe(host);

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section className="pgHero" ref={hostRef}>
      {/* the site's hero surface, unchanged: two nested fade masks multiply
          so all four edges of the ruled grid dissolve into the background */}
      <div className="pgField" aria-hidden>
        <div className="pgField__v">
          <div className="pgField__pattern" />
        </div>
      </div>

      <div className="pgHero__inner">
        <h1 className="pgHero__title">
          {/* the heading a screen reader gets. The split below is one span
              per glyph so each can be lit on its own, and letter-by-letter
              spans are read out letter by letter by some readers, so the
              visual wordmark is hidden from them entirely. */}
          <span className="pgHero__sr">Playground</span>
          <span className="pgHero__word" ref={wordRef} aria-hidden>
            {"Playground".split("").map((ch, i) => (
              <span key={i} className="pgHero__letter">
                {ch}
              </span>
            ))}
          </span>
        </h1>
      </div>

      {/*
        Above the type on purpose: the balls have to be able to sit on the
        wordmark's edge, and a ball drawn behind the letters reads as a
        background pattern rather than as an object resting on them.
      */}
      <canvas className="pgHero__toys" ref={canvasRef} aria-hidden />

      <div className="pgHero__foot">
        <p className="pgHero__hint" aria-hidden>
          Grab one. Throw it.
        </p>
        <p className="pgHero__count">
          <span className="pgHero__countNum">
            {String(LIVE_COUNT).padStart(2, "0")}
          </span>
          <span className="pgHero__countLabel">
            live experiment{LIVE_COUNT === 1 ? "" : "s"}
          </span>
        </p>
      </div>
    </section>
  );
}

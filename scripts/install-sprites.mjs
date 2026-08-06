/*
  Takes the numbered output of cut-sprites.mjs, gives every frame the name
  the game will ask for it by, copies it into public/, and writes the
  TypeScript manifest the renderer imports.

  The index → name maps below were read off a labelled contact sheet, not
  guessed from the sheet's caption row. Those two disagree: the bowler sheet
  prints seven captions over nine reaction poses, so a caption-driven map
  would have silently mislabelled two of them. Each name here describes what
  the frame actually shows.

  Generating the manifest rather than hand-writing it matters for one field
  in particular. `ax` is the horizontal foot anchor, measured from the alpha
  channel, and it is the number that keeps a figure planted when its
  bounding box changes shape between poses — a dive is 269px wide and an
  idle is 128, and centring both would slide the fielder across the ground
  every time the pose changed.
*/

import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");

const SHEETS = [
  {
    src: path.join(REPO, ".sprite-cut", "bowler"),
    outDir: path.join(REPO, "public", "cricket", "panthers", "bowler"),
    module: path.join(REPO, "components", "cricket", "bowlerSprites.ts"),
    typeName: "BowlerPose",
    constName: "BOWLER_FRAMES",
    urlBase: "/cricket/panthers/bowler",
    /* the pose the whole sheet is scaled against — see the module header */
    referenceFrame: "idle",
    names: [
      /* 0-8  the nine-phase delivery cycle, in order */
      "start", "runup", "accelerate", "bound", "plant",
      "rotate", "release", "follow", "recover",
      /* 9-16  delivery variations */
      "fast", "outswing", "inswing", "yorker",
      "slower", "bouncer", "offbreak", "legbreak",
      /* 17-20  front views */
      "idle", "walk", "focus", "ready",
      /* 21-29  reactions and celebrations */
      "celebrate", "appeal", "fistpump", "roar", "pointCrowd",
      "calm", "encourage", "headInHand", "dejected",
      /* 30-33  back views, for the run-up seen from behind the bowler */
      "backIdle", "backRunup", "backDelivery", "backFollow",
    ],
  },
  {
    src: path.join(REPO, ".sprite-cut", "fielder"),
    outDir: path.join(REPO, "public", "cricket", "panthers", "fielder"),
    module: path.join(REPO, "components", "cricket", "fielderSprites.ts"),
    typeName: "FielderPose",
    constName: "FIELDER_FRAMES",
    urlBase: "/cricket/panthers/fielder",
    referenceFrame: "idleHips",
    names: [
      /* 0-5  idle and aware */
      "idleHips", "idleArms", "idleHands", "idleCrouch", "idleCap", "idleBack",
      /* 6-11  movement and reactions */
      "sprint", "sprintTurn", "gather", "chase", "dive", "slide",
      /* 12-17  catching */
      "catchReady", "catchHigh", "catchLeap", "catchLow", "catchKnee", "caught",
      /* 18-23  special */
      "celebrate", "point", "diveStop", "appeal", "missed", "dejected",
    ],
  },
  {
    src: path.join(REPO, ".sprite-cut", "keeper"),
    /* this sheet was drawn in the Flow Falcons kit, so blue is the source
       here and the Panthers set is the one generated from it */
    outDir: path.join(REPO, "public", "cricket", "falcons", "keeper"),
    module: path.join(REPO, "components", "cricket", "keeperSprites.ts"),
    typeName: "KeeperPose",
    constName: "KEEPER_FRAMES",
    urlBase: "/cricket/falcons/keeper",
    referenceFrame: "idle",
    /*
      Named by PANEL, not by reading order. The lower half of this sheet is
      three panels side by side (diving / catching / stances), each two rows
      deep, so scanning left-to-right across the full width interleaves all
      three. These were assigned from the cut coordinates: diving is x<480,
      catching 480-880, stances x>=880.

      29 frames, not 30: the sheet's ONE HAND CATCH did not survive
      detection, and the four catching poses that did are enough to cover
      what the game asks for.
    */
    names: [
      /* 0-5  standing front and back views */
      "standFront", "standPortrait", "standGloves",
      "standBack", "standBackPortrait", "standBackGloves",
      /* 6-13  idle animations */
      "idle", "lookLeft", "lookRight", "adjustGloves",
      "tapKnees", "stretch", "shakeHands", "communicate",
      /* 14-15  diving, top row */
      "diveLeft", "diveRight",
      /* 16-18  catching, top row */
      "catchHigh", "catchStanding", "catchLow",
      /* 19-21  stances, top row */
      "stanceWide", "stanceNarrow", "stanceUpClose",
      /* 22-23  diving, bottom row */
      "diveFull", "getUp",
      /* 24-25  catching, bottom row */
      "behindStumps", "catchSquat",
      /* 26-28  stances, bottom row */
      "stepLeft", "stepRight", "quickRecover",
    ],
  },
];

for (const sheet of SHEETS) {
  const manifest = JSON.parse(
    await readFile(path.join(sheet.src, "manifest.json"), "utf8")
  );

  if (manifest.length !== sheet.names.length) {
    throw new Error(
      `${path.basename(sheet.src)}: cut produced ${manifest.length} frames but ` +
        `${sheet.names.length} names are defined. The name map is written against ` +
        `a specific cut — re-check the contact sheet before renaming.`
    );
  }

  /* a stale frame from an earlier cut would sit in public/ forever */
  await rm(sheet.outDir, { recursive: true, force: true });
  await mkdir(sheet.outDir, { recursive: true });

  const rows = [];
  for (let i = 0; i < manifest.length; i++) {
    const m = manifest[i];
    const name = sheet.names[i];
    const buf = await readFile(path.join(sheet.src, `${m.name}.png`));
    await writeFile(path.join(sheet.outDir, `${name}.webp`), buf);
    rows.push({ name, w: m.w, h: m.h, ax: m.ax, bytes: buf.length });
  }

  const ref = rows.find((r) => r.name === sheet.referenceFrame);
  if (!ref) throw new Error(`reference frame "${sheet.referenceFrame}" is not in the name map`);

  const total = rows.reduce((n, r) => n + r.bytes, 0);
  const longest = Math.max(...rows.map((r) => r.name.length));

  const body = rows
    .map(
      (r) =>
        `  ${(r.name + ":").padEnd(longest + 2)}{ w: ${String(r.w).padStart(3)}, ` +
        `h: ${String(r.h).padStart(3)}, ax: ${r.ax.toFixed(4)} },`
    )
    .join("\n");

  const src = `/*
  ${path.basename(sheet.outDir)} artwork: ${rows.length} frames cut from the approved
  character sheet.

  GENERATED by scripts/install-sprites.mjs. Edit the name map in that script
  rather than this file — the numbers below are measured from the PNGs and
  will be overwritten on the next run.

  Two numbers per frame matter for placement:

  - \`h\` is measured against ${sheet.referenceFrame.toUpperCase()}_H below. Frames are NOT normalised
    to a common height: a raised arm makes a frame taller without making the
    player taller, so scaling each to fit would shrink the body exactly when
    the action is biggest. Every frame uses the one scale derived from the
    reference pose, and limbs are free to leave the top.
  - \`ax\` is where the feet sit horizontally, as a fraction of frame width.
    An outstretched dive stretches the bounding box, so centring the box
    would slide the body across the ground between frames. Anchoring on the
    feet keeps the player planted. Measured from the alpha channel of the
    bottom 7% of each frame.
*/

export type ${sheet.typeName} =
${rows.map((r) => `  | "${r.name}"`).join("\n")};

import { kitFrame, kitReady, preloadKit, type TeamKit } from "./spriteKit";

type FrameMeta = { w: number; h: number; ax: number };

/** the reference pose's pixel height — the scale every frame is drawn at */
export const ${sheet.referenceFrame.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()}_H = ${ref.h};

export const ${sheet.constName}: Record<${sheet.typeName}, FrameMeta> = {
${body}
};

export const ${sheet.constName.replace("_FRAMES", "_POSES")} = Object.keys(${sheet.constName}) as ${sheet.typeName}[];

/** Kick off loading for one side. Safe to call repeatedly. */
export function preload${sheet.typeName.replace("Pose", "")}(team: TeamKit) {
  preloadKit(team, "${path.basename(sheet.outDir)}", ${sheet.constName.replace("_FRAMES", "_POSES")});
}

/** A frame, or null while it is still loading — callers fall back to the
    procedural figure so the field is never empty on the first ball. */
export function ${sheet.typeName.replace("Pose", "").toLowerCase()}Frame(team: TeamKit, pose: ${sheet.typeName}) {
  return kitFrame(team, "${path.basename(sheet.outDir)}", pose, ${sheet.constName}[pose]);
}

export function ${sheet.typeName.replace("Pose", "").toLowerCase()}Ready(team: TeamKit) {
  return kitReady(team, "${path.basename(sheet.outDir)}", ${sheet.constName.replace("_FRAMES", "_POSES")});
}
`;

  await writeFile(sheet.module, src);

  console.log(
    `${path.basename(sheet.outDir).padEnd(8)} ${rows.length} frames  ` +
      `${(total / 1024).toFixed(0)}KB  ->  ${path.relative(REPO, sheet.outDir)} + ` +
      `${path.relative(REPO, sheet.module)}`
  );
}

console.log("\ndone");

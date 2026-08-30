// The soul of the look: one small, hand-tuned night palette. Ghibli-ish dusk —
// deep navy and purple, teal water, moonlit silver, firefly yellow, and
// the occasional soft pink highlight. Every sprite pulls from these names so
// the whole pond stays colour-harmonious and easy to re-tune from one file.

export const C = {
  // ── Sky (top → horizon) ───────────────────────────────────────────────
  skyDeep: "#0b1022", // clear colour / very top of sky
  skyHigh: "#141a34",
  skyMid: "#1e2348",
  skyLow: "#2a2b55", // purple
  skyHorizon: "#3b3f6b", // indigo band
  skyGlow: "#574a6e", // dusky purple near the hills
  horizonPink: "#7c5872", // muted mauve breath of warmth
  skyTeal: "#3f5d70", // cool band just above the water

  // ── Celestial ─────────────────────────────────────────────────────────
  moon: "#f5eccb",
  moonShade: "#ddd1a6",
  moonSea: "#e4d8ad", // subtle mare markings
  moonHalo: "#aebbe0",
  star: "#c7d2f2",
  starBright: "#ffffff",

  // ── Mountains (far → near) ────────────────────────────────────────────
  mtnFar: "#242c50",
  mtnMid: "#1c2344",
  mtnNear: "#161c38",
  mtnMist: "#2d3660",

  // ── Bamboo grove (far silhouettes) ────────────────────────────────────
  bambooDark: "#192740",
  bambooLit: "#243651",
  bambooNode: "#2e4762",
  bambooLeaf: "#20364e",

  // ── Water ─────────────────────────────────────────────────────────────
  waterDeep: "#0e1b30",
  waterMid: "#123049",
  waterNear: "#164a54",
  waterHi: "#2f6f79",
  waterHi2: "#54a0a6",
  moonPath: "#b3bfe0",

  // ── Reeds & cattails ──────────────────────────────────────────────────
  reedDark: "#1e3a2c",
  reedMid: "#2f573c",
  reedLit: "#487e4c",
  reedTip: "#6aa85e",
  cattail: "#5a3f2a",
  cattailLit: "#79553a",

  // ── Lily pads ─────────────────────────────────────────────────────────
  padDark: "#1f3f2e",
  padBase: "#2f5a3f",
  padLit: "#437052",
  padRim: "#5c9160",

  // ── Lotus & bank flowers ──────────────────────────────────────────────
  lotusPink: "#e79ab0",
  lotusPinkLit: "#f4bcca",
  lotusPinkDeep: "#c67894",
  lotusCore: "#f6d98a",
  lotusWhite: "#ece7f2",
  lotusWhiteShade: "#c8c5dd",

  // ── Frog ──────────────────────────────────────────────────────────────
  frogBody: "#7cbf74",
  frogBodyShade: "#5f9d5c",
  frogBodyLit: "#9bd68c",
  frogBelly: "#f2ead0",
  frogBellyShade: "#dfcfa8",
  frogCheek: "#e79ab0",
  frogEye: "#232f3a",
  frogEyeHi: "#eaf2ff",
  frogMouth: "#3a4a3f",
  frogTongue: "#e8879b",
  frogTongueLit: "#f4a9b8",

  // ── Bugs (the little pests the frog catches) ──────────────────────────
  bugWing: "#e8f4ff",
  bugLeg: "#2a2f38",
  bugMosquito: "#a49cc0",
  bugDragonfly: "#6fd6c8",
  bugDragonflyLit: "#a6efe6",
  bugMergeA: "#e08a8a",
  bugMergeB: "#86cf86",
  bugSyntax: "#e6b25f",
  bugSyntaxDark: "#8a5a2a",
  bugMoth: "#d9cfb4",
  bugMothDark: "#a89a78",
  bugLoop: "#7fa8e6",
  bugLoopLit: "#b3cdf2",
  bugGlow: "#cfe8ff",

  // ── Friendly visitors (fish jump, butterfly) ─────────────────────────
  fish: "#e9ddc4",
  fishShade: "#b9a988",
  fishSpot: "#e08a5a",
  butterflyA: "#e7a6d0",
  butterflyB: "#b7a6e7",
  butterflyBody: "#2a2f38",
  warmth: "#ffcf8a",

  // ── Light, particles, cursor ──────────────────────────────────────────
  firefly: "#ffe9a3",
  fireflyCore: "#fffbe0",
  petal: "#f2b8c6",
  petalLit: "#f8d2dc",
  heart: "#f27a94",
  cursorGlow: "#bfe6e0",

  // ── Foreground foliage silhouettes ────────────────────────────────────
  foliageFg: "#0f1f1a",
  foliageFgLit: "#1a3025",
  foliageFgEdge: "#26463218",
} as const;

export type ColorName = keyof typeof C;

/** Ordered ramps for procedural shading. */
export const RAMP = {
  water: [C.waterDeep, C.waterMid, C.waterNear] as const,
  mountains: [C.mtnFar, C.mtnMid, C.mtnNear] as const,
  sky: [C.skyDeep, C.skyHigh, C.skyMid, C.skyLow, C.skyHorizon, C.skyGlow] as const,
};

import { ACTS } from "./path.ts";

/*
  The eight cards the descent reveals, in the order it reveals them.

  The experiment data is passed in rather than imported. experiments.ts
  reaches into ./covers, a .tsx module full of JSX, and the test runner
  strips types but cannot transform JSX — so importing it here would make
  this module untestable. The page hands over the real EXPERIMENTS and
  TypeScript checks the shape at that call site.
*/

/** The slice of an experiment entry a card needs. */
export type ExperimentSource = {
  id: string;
  title: string;
  kind: string;
  href: string;
  blurb: string;
};

export type DescentCard = {
  id: string;
  title: string;
  kind: string;
  href: string;
  blurb: string;
  poster?: string;
  video?: string;
  act: "chasm" | "forge";
  stop: number;
};

/*
  Which cards hang in the chasm and which wait in the forge.

  Order is the journey's order, not the shelf's: the three on the chasm
  walls are the ones that read at speed while the camera is falling, and
  the five in the forge are the ones worth stopping at.
*/
const CHASM_IDS = ["pond", "cat", "invoice"] as const;
const FORGE_IDS = ["dpl", "contract", "yantra", "mike-tyson-invitational", "dropby"] as const;

/* The three portfolio projects live in sphere/entries.ts rather than
   experiments.ts. Their card copy is declared here instead of coupling
   this module to the sphere's own shape — they are a fixed set of three,
   and the case studies they link to are not going to be renamed by an
   edit to the playground data. */
const PROJECT_CARDS: Record<
  string,
  { title: string; kind: string; href: string; blurb: string; poster?: string; video?: string }
> = {
  yantra: {
    title: "Yantra",
    kind: "Product design",
    href: "/work/yantra",
    blurb: "A festival platform, designed end to end.",
    poster: "/playground/yantra-live.webp",
    video: "/playground/yantra-live.mp4",
  },
  "mike-tyson-invitational": {
    title: "Mike Tyson Invitational",
    kind: "UI/UX design",
    href: "/work/mike-tyson-invitational",
    blurb: "The Iron Forge brand as a ticketing and fight-card interface.",
    poster: "/playground/mike-tyson-live.webp",
    video: "/playground/mike-tyson-live.mp4",
  },
  dropby: {
    title: "DropBy",
    kind: "Brand identity",
    href: "/work/dropby",
    blurb: "An identity built to live out in the world.",
    poster: "/playground/reel/dropby-statement.webp",
  },
};

/*
  Artwork for the five experiments.

  The experiment entries carry drawn cover *components*, which this module
  cannot touch — they are JSX, and this file has to stay loadable by the
  test runner. These are the real screenshots and capture loops already in
  /public/playground, referenced by path instead.

  "cat" has no capture in /public/playground, so it has no poster and the
  overlay falls back to type alone. That is a real gap, not an oversight:
  the asset does not exist yet.
*/
const EXPERIMENT_ART: Record<string, { poster?: string; video?: string }> = {
  pond: { poster: "/playground/pond-live.webp", video: "/playground/pond-live.mp4" },
  dpl: { poster: "/playground/dpl-gameplay.webp", video: "/playground/dpl-gameplay.mp4" },
  contract: { poster: "/playground/contract-builder.webp" },
  invoice: { poster: "/playground/invoice-ui.png" },
};

/** Evenly spaced inside the act, inset from both boundaries. */
function stopsFor(actId: "chasm" | "forge", count: number): number[] {
  const act = ACTS.find((a) => a.id === actId)!;
  const span = act.to - act.from;
  const inset = span * 0.14;
  const usable = span - inset * 2;
  if (count === 1) return [act.from + span / 2];
  return Array.from({ length: count }, (_, i) => act.from + inset + (usable * i) / (count - 1));
}

export function descentCards(experiments: readonly ExperimentSource[]): DescentCard[] {
  const chasmStops = stopsFor("chasm", CHASM_IDS.length);
  const forgeStops = stopsFor("forge", FORGE_IDS.length);

  const build = (id: string, act: "chasm" | "forge", stop: number): DescentCard => {
    const project = PROJECT_CARDS[id];
    if (project) return { id, act, stop, ...project };

    const e = experiments.find((x) => x.id === id);
    /* Loudly, rather than quietly dropping a card: a renamed experiment
       should break the build, not silently shrink the journey to seven. */
    if (!e) throw new Error(`descentCards: no experiment "${id}"`);
    return {
      id,
      act,
      stop,
      title: e.title,
      kind: e.kind,
      href: e.href,
      blurb: e.blurb,
      ...EXPERIMENT_ART[id],
    };
  };

  return [
    ...CHASM_IDS.map((id, i) => build(id, "chasm", chasmStops[i])),
    ...FORGE_IDS.map((id, i) => build(id, "forge", forgeStops[i])),
  ];
}

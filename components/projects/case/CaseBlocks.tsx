import type { CSSProperties, ReactNode } from "react";
import { IMAGE_DIMS } from "@/components/projects/imageDims";
import {
  isStripShot,
  type CaseBlock,
  type Project,
  type ProjectShot,
} from "@/components/projects/projectData";

/*
  What a project page says, and how little of it.

  The pages used to render every authored block, which on the deepest project
  came to sixteen numbered sections. That is an archive, not a portfolio: the
  person reading it is a recruiter or a hiring manager giving the page two
  minutes, and a page that needs twenty loses them before the work does any
  arguing.

  So the data is no longer rendered, it is SELECTED. Every project is reduced
  to the same five beats, which is also the shape of the reference comp:

    (01) About      one sentence, inverted, saying what this is
    (02) Details    what was wrong and what was done, beside the screens
    (03) Highlights the two or three decisions worth a name
    (04) Results    what happened, as figures
    (05) Other      two more projects

  Long-form work keeps more of itself than a straight project does, which is
  the `deep` allowance below, but nothing gets to run unbounded. Everything
  that does not fit a beat is dropped from the page rather than parked at the
  bottom of it.
*/

type Pair = { label: string; body: string[] };
type Media = { src: string; alt: string };

export type Highlight = { name: string; body: string[]; media: Media[] };

export type Story = {
  statement: { lead: string; rest: string } | null;
  intro: string[];
  about: string[];
  details: { pairs: Pair[]; media: Media[] } | null;
  highlights: Highlight[];
  /* when non-empty these replace the Highlights beat, one section each */
  chapters: Chapter[];
  results: { items: ResultItem[]; note?: string } | null;
  gallery: Media[];
};

type ResultItem = {
  value: string;
  label: string;
  note?: string;
  projected?: boolean;
};

/*
  Inline emphasis for the words an argument turns on.

  The copy is written with `**like this**`, so the renderer has to resolve it
  or the asterisks ship as literal text. It renders as <b> rather than
  <strong> deliberately: this is emphasis for an eye scanning a page, not a
  claim that the phrase outranks the sentence around it, and promoting forty
  words a page to <strong> would leave a screen reader shouting most of the
  document.
*/
export function marked(text: string): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>,
    );
}

/*
  Keep the first few sentences and drop the rest.

  Cutting on a sentence boundary rather than a character count is the whole
  point: a paragraph clipped mid-clause reads as broken, while the same
  paragraph two sentences shorter just reads as tighter. The emphasis markers
  survive because the split never looks inside them.
*/
function trimTo(text: string, sentences: number): string {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  const kept =
    !parts || parts.length <= sentences
      ? text
      : parts.slice(0, sentences).join("");
  return balanceEmphasis(kept.trim());
}

/*
  Close, or drop, an emphasis marker the trim cut in half.

  A `**marked phrase**` can straddle a sentence boundary, so keeping the first
  two sentences of a four-sentence paragraph can keep an opener whose closer
  is gone, or a closer whose opener is. Either way the count goes odd, the
  parser has nothing to pair, and the asterisks ship as visible text. Dropping
  the last one restores the pairing in both directions; losing one phrase's
  emphasis is invisible, where losing it to literal asterisks is not.
*/
function balanceEmphasis(text: string): string {
  const marks = text.match(/\*\*/g);
  if (!marks || marks.length % 2 === 0) return text;
  const at = text.lastIndexOf("**");
  return text.slice(0, at) + text.slice(at + 2);
}

/* ---------- reading the data ---------- */

function shotSources(shot: ProjectShot): string[] {
  return isStripShot(shot) ? shot.strip : [shot.src];
}

function mediaOf(block: CaseBlock): Media[] {
  switch (block.kind) {
    case "figure":
      return shotSources(block.shot).map((src) => ({
        src,
        alt: block.shot.alt,
      }));
    case "grid":
    case "gallery":
    case "directions":
    case "step":
    case "screens":
    case "mockup":
      return block.items.map((i) => ({ src: i.src, alt: i.alt }));
    default:
      return [];
  }
}

function allBlocks(project: Project): CaseBlock[] {
  return (project.sections ?? []).flatMap((s) => s.blocks);
}

/*
  The Details beat is always the same two points: Challenge, then Solution.

  Every project has those two, whatever its author called them, and naming
  them the same way on every page is what lets a reader who has opened three
  of these know where to look on the fourth. The labels in the data are all
  over the place ("The problem", "Problem", "The constraint", "Key decisions",
  "The idea"), so they are matched on meaning rather than on string equality.

  These two are deliberately NOT held to the short sentence budget the rest of
  the page runs on. Everything else was cut because it was repeating the work
  the pictures already do; these two are the argument itself, and a challenge
  explained in one sentence is not explained. The reference gives each of them
  a full paragraph, and so does this.
*/
const CHALLENGE = /problem|challenge|constraint|brief|issue/i;
const SOLUTION =
  /solution|approach|decision|idea|system|move|response|what i did/i;

/* the section names that belong to each point; see proseFrom() below */
const CHALLENGE_SECTION = /problem|challenge|constraint/i;
const SOLUTION_SECTION =
  /approach|solution|decision|insight|essence|structure/i;

function detailPairs(project: Project): Pair[] {
  /* written copy wins over anything assembled from the blocks: it exists
     precisely because the assembly could not do the job for this project */
  if (project.challenge?.length || project.solution?.length) {
    const out: Pair[] = [];
    if (project.challenge?.length)
      out.push({ label: "Challenge", body: project.challenge });
    if (project.solution?.length)
      out.push({ label: "Solution", body: project.solution });
    return out;
  }

  const blocks = allBlocks(project);
  const labelled: { label: string; body: string }[] = [];

  for (const block of blocks) {
    if (block.kind === "brief") {
      for (const it of block.items) {
        if (!it.wide) labelled.push({ label: it.label, body: it.body });
      }
    }
    if (block.kind === "numbered" || block.kind === "decisions") {
      for (const it of block.items)
        labelled.push({ label: it.label, body: it.body });
    }
  }

  const pick = (re: RegExp) => labelled.find((x) => re.test(x.label));
  const challenge = pick(CHALLENGE);
  const solution = pick(SOLUTION);

  /*
    Where the rest of each point comes from.

    Not "the next paragraph in the file". Padding by proximity produced a
    Challenge whose third paragraph was "Round one: three display faces, same
    sample, nothing else on the card", which is about type trials: longer, and
    nonsense. Length is worthless if the paragraph under (Challenge) is not
    about the challenge.

    Sections already carry the topic in their name, so affinity is read from
    there. A section called "problem" or "constraints" belongs to the
    Challenge; one called "approach", "decisions" or "insight" belongs to the
    Solution. A project whose sections say neither contributes nothing, and
    the point stays as short as its data actually is, which is honest.
  */
  const proseFrom = (re: RegExp): string[] => {
    const out: string[] = [];
    for (const section of project.sections ?? []) {
      if (!re.test(section.name)) continue;
      for (const block of section.blocks) {
        if (block.kind === "prose") out.push(...block.body);
      }
    }
    return out;
  };

  const used = new Set<string>();
  const build = (seed: string | undefined, pool: string[]): string[] => {
    const parts: string[] = [];
    if (seed) {
      parts.push(seed);
      used.add(seed);
    }
    for (const para of pool) {
      if (words(parts.join(" ")) >= 85 || parts.length >= 3) break;
      if (used.has(para)) continue;
      used.add(para);
      parts.push(para);
    }
    return parts;
  };

  const out: Pair[] = [];
  const challengeBody = build(challenge?.body, proseFrom(CHALLENGE_SECTION));
  const solutionBody = build(solution?.body, proseFrom(SOLUTION_SECTION));

  if (challengeBody.length)
    out.push({ label: "Challenge", body: challengeBody });
  if (solutionBody.length) out.push({ label: "Solution", body: solutionBody });
  return out;
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/*
  The decisions worth naming, each with the screens it produced.

  Like Challenge and Solution, these keep their full explanation rather than
  the two-sentence budget the rest of the page runs on. A named feature with
  one sentence under it is a caption; the point of the beat is that somebody
  can read WHY the thing works the way it does. What stays capped is how MANY
  of them a page gets, which is the part that made the old pages long.
*/
function highlights(
  project: Project,
  limit: number,
  family: Budget,
  perFamily: number,
): Highlight[] {
  return highlightsIn(allBlocks(project), limit, family, perFamily);
}

function highlightsIn(
  blocks: CaseBlock[],
  limit: number,
  family: Budget,
  perFamily: number,
): Highlight[] {
  const out: Highlight[] = [];

  for (const block of blocks) {
    if (out.length >= limit) break;

    if (block.kind === "step" && block.body.length) {
      out.push({
        name: block.title ?? block.items[0]?.label ?? "",
        body: block.body.slice(0, 2),
        media: mediaOf(block)
          .filter((m) => affordable(family, m.src, perFamily))
          .slice(0, 4),
      });
      continue;
    }

    if (block.kind === "mockup" || block.kind === "screens") {
      for (const item of block.items) {
        if (out.length >= limit) break;
        out.push({
          name: item.title,
          body: [item.body],
          media: affordable(family, item.src, perFamily)
            ? [{ src: item.src, alt: item.alt }]
            : [],
        });
      }
    }
  }

  return out.filter((h) => h.name).slice(0, limit);
}

/*
  One beat per surface, instead of one beat for the whole product.

  The five-beat page assumes a project is one thing, and puts every named
  screen in a single Highlights run. That is right for a project with one
  interface. It is wrong for a product that is four separate interfaces used
  by four different people: nineteen screens in one undifferentiated list
  makes a reader work out for themselves where the traveller's app stops and
  the kitchen's portal starts, which is the one piece of structure the work
  actually has.

  So a project can opt in with `caseChapters`, and every section carrying a
  walkthrough becomes its own numbered beat, titled by that section's own
  heading, with its intro paragraph above the screens. The budget is shared
  across all of them rather than per chapter, so opting in cannot quietly
  make a page four times longer than the limit it declared.
*/
export type Chapter = { name: string; intro: string[]; items: Highlight[] };

function chapters(
  project: Project,
  budget: number,
  family: Budget,
  perFamily: number,
  claim: (t?: string | null) => string | null,
): Chapter[] {
  const out: Chapter[] = [];
  let left = budget;

  for (const section of project.sections ?? []) {
    if (left <= 0) break;
    const items = highlightsIn(section.blocks, left, family, perFamily);
    if (!items.length) continue;
    left -= items.length;

    /*
      Only the prose that OPENS the section. A walkthrough section usually
      also carries a closing paragraph or two, and those belong to the
      screens they follow rather than to the heading; hoisting them above
      the first screen would make the chapter argue its conclusion first.
    */
    const intro: string[] = [];
    for (const block of section.blocks) {
      if (block.kind !== "prose") continue;
      for (const para of block.body) {
        if (intro.length >= 2) break;
        const taken = claim(para);
        if (taken) intro.push(taken);
      }
      break;
    }

    out.push({ name: section.heading ?? section.name, intro, items });
  }

  return out;
}

/*
  What the beat called Results is allowed to show.

  A `results` block anywhere on the project outranks a `stats` block that
  happens to appear earlier. Taking whichever came first put the grievance
  project's SCALE under the heading "Results": 20 lakh grievances a year and
  90+ ministries are facts about the system that existed before the work, and
  presenting them as an outcome of it is the kind of borrowed credit a
  portfolio should not take. `stats` stays as the fallback for the projects
  that have no outcome figures at all.
*/
function resultsOf(project: Project): Story["results"] {
  const blocks = allBlocks(project);
  for (const block of blocks) {
    if (block.kind === "results")
      return { items: block.items, note: block.caption };
  }
  for (const block of blocks) {
    if (block.kind === "stats") return { items: block.items };
  }
  return null;
}

/*
  The images the Details beat shows, minus anything a Highlight already owns.

  Without the subtraction the same laptop mockup appears twice on the page,
  once beside the challenge and once beside the feature it illustrates, which
  reads as padding.
*/
/*
  One motif cannot eat the page.

  On the grievance project eleven of the twenty-five images were the same
  mascot: seven poses plus four variants, 44% of the page given to one
  drawing, while not a single phone screen made it in. The budget had simply
  been spent before the interface got a turn.

  Files are grouped by their stem, so mascot-a through mascot-g and
  mascot-v1 through mascot-v4 are all one family, and a family is allowed
  two. The cap is what produces the variety: with mascots held to two, the
  remaining slots fill with desktop screens, phone screens and components
  instead of more of the same.
*/
function familyOf(src: string): string {
  const file = (src.split("/").pop() ?? src).replace(/\.\w+$/, "");
  return file
    .replace(/[-_]v?\d+$/, "")
    .replace(/-[a-z]$/, "")
    .replace(/-v$/, "");
}

/*
  The budget is page-wide, not per beat.

  Capping only the gallery left the Highlights beat free to spend the same
  motif again, which is how eight near-identical desktop captures and four
  more mascot variants survived a cap that was supposed to stop exactly that.
  One counter, shared by everything that picks an image.
*/
export type Budget = Map<string, number>;

/*
  How many of one family the page can afford, which depends on how many
  families it has.

  A flat cap of two was right for the grievance project, where eleven of
  twenty-five images were the same mascot, and catastrophic for the poster
  project, where all forty-one images ARE one family: it went from
  twenty-eight images on the page to three. The cap exists to stop one motif
  crowding out the others, so where there are no others it has nothing to do.

  The budget is simply divided by the number of families present, with two as
  the floor. Eight families on a page gets two each; one family gets all of
  it.
*/
function perFamilyFor(project: Project, limit: number): number {
  const families = new Set<string>();
  for (const block of allBlocks(project)) {
    if (
      ![
        "figure",
        "grid",
        "gallery",
        "directions",
        "step",
        "screens",
        "mockup",
      ].includes(block.kind)
    )
      continue;
    for (const m of mediaOf(block)) families.add(familyOf(m.src));
  }
  /* the cap exists to create variety, so where there is no variety to create
     it does not apply: a project made of one or two families shows as much of
     them as the beat's own limit allows */
  if (families.size <= 2) return Number.MAX_SAFE_INTEGER;
  return Math.max(2, Math.ceil(limit / families.size));
}

function affordable(family: Budget, src: string, perFamily: number): boolean {
  const stem = familyOf(src);
  const seen = family.get(stem) ?? 0;
  if (seen >= perFamily) return false;
  family.set(stem, seen + 1);
  return true;
}

/*
  Sections whose pictures are artwork rather than interface.

  The column beside the Challenge and Solution was filling with mascot
  portraits, because it takes the first images it finds and the mascot
  section comes early in the file. Beside a paragraph about a 15-field form,
  the evidence a reader wants is the form.

  Section names already carry this: a section called "samadhan didi" or
  "logo" or "colour" is about identity, everything else is about the product.
  Art is not excluded, only deferred, so it still reaches the gallery.
*/
const ART_SECTION =
  /mascot|didi|logo|colour|color|brand|identity|typeface|typography|palette|essence|exploration/i;

function pickMedia(
  project: Project,
  used: Set<string>,
  limit: number,
  family: Budget,
  perFamily: number,
): Media[] {
  const sections = project.sections ?? [];
  /* interface first, artwork after, order preserved within each */
  const ordered = [
    ...sections.filter((sec) => !ART_SECTION.test(sec.name)),
    ...sections.filter((sec) => ART_SECTION.test(sec.name)),
  ];

  const out: Media[] = [];
  for (const section of ordered) {
    for (const block of section.blocks) {
      if (!["figure", "grid", "gallery", "directions"].includes(block.kind))
        continue;
      for (const m of mediaOf(block)) {
        if (used.has(m.src)) continue;
        if (!affordable(family, m.src, perFamily)) continue;
        used.add(m.src);
        out.push(m);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/*
  Rows hold one shape at a time.

  The assets on a single project run from 0.46 phone screens to 1.99 desktop
  captures. Pairing those and cutting both to a median ratio is how a phone
  screen loses its top and bottom, so the row is grouped by proportion first
  and only then paired: phones with phones, desktops with desktops. Once a
  row is one shape, matching the heights costs nothing, because the images
  already agree.
*/
function groupByShape(media: Media[]): Media[][] {
  const groups: Media[][] = [];
  for (const m of media) {
    const b = bucketOf(m);
    const last = groups[groups.length - 1];
    if (last && bucketOf(last[0]) === b) last.push(m);
    else groups.push([m]);
  }
  return groups;
}

/*
  Every row full, no matter how many pictures the set has.

  A shape group used to be one grid at a fixed column count, so any set whose
  size did not divide by that count ended on a short row: four mascot
  directions in a three-column grid put three on a line and left the fourth
  alone beside two thirds of a screen of white, and the two component sheets
  landed in a four-column row with half of it empty. That was a deliberate
  choice once, on the reasoning that an orphan reads as the end of a set. It
  does not. It reads as a missing image.

  So the group is cut into rows FIRST and each row is then given exactly as
  many columns as it has pictures. The row count is chosen to keep every row
  within one column of the shape's own preference and never below two, which
  is what stops the fix trading a hole for a single image blown up to the
  width of the page. A set of five desktop captures comes out three then two
  rather than two, two and a gap.
*/
function balancedRows(media: Media[]): Media[][] {
  const n = media.length;
  const preferred = preferredCols(media);
  if (n <= preferred) return [media];

  let bestRows = 0;
  let bestScore = Infinity;
  for (let rows = 1; rows <= n; rows++) {
    const base = Math.floor(n / rows);
    const rem = n % rows;
    const widest = rem ? base + 1 : base;
    /* two is the floor: a lone picture takes the single-column class and
       goes full width, which is the monolith this is trying to avoid */
    if (base < 2 || widest > preferred + 1) continue;
    /*
      Closest to the shape's own column count wins. The +rows tie-break is
      what keeps four square mascots on one line of four instead of two lines
      of two: both are one column off the preference, and the fewer, larger
      rows are the ones that read as a set.
    */
    const score = Math.abs(widest - preferred) * 10 + rows;
    if (score < bestScore) {
      bestScore = score;
      bestRows = rows;
    }
  }

  /* a prime count with no arrangement inside the tolerance keeps the old
     behaviour rather than inventing a worse one */
  if (!bestRows) return [media];

  const base = Math.floor(n / bestRows);
  const rem = n % bestRows;
  const out: Media[][] = [];
  let at = 0;
  for (let i = 0; i < bestRows; i++) {
    const size = base + (i < rem ? 1 : 0);
    out.push(media.slice(at, at + size));
    at += size;
  }
  return out;
}

/*
  Which shelf a picture belongs on.

  This was a tight ratio tolerance, and it split things that belong together:
  a component sheet at 0.26 and the phone screens at 0.46 are both TALL, but
  12% apart is 12% apart, so the sheet was put in a row of its own and stood
  there as a lone 453px column with half a screen of white beside it.

  Buckets by orientation instead. The sheet now sits in the row with the
  phone screens at the same cell size, which is where a reader expects a
  component to be: next to the interface it came out of. Being narrower than
  the phones, it keeps its own width inside that cell rather than stretching,
  which is the whole point of `contain`.
*/
function bucketOf(m: Media): number {
  const r = ratioOf(m) ?? 1.6;
  if (r < 0.75) return 0; /* phone screens, component strips */
  if (r < 1.15) return 1; /* mascots, square art */
  if (r < 1.6) return 2; /* 4:3 captures */
  return 3; /* wide desktop captures */
}

function ratioOf(m: Media): number | null {
  const dims = IMAGE_DIMS[m.src];
  return dims ? dims[0] / dims[1] : null;
}

/*
  One paragraph, one place on the page.

  Everything here reads from the same few fields, so without a claim check the
  same sentence surfaced twice: the hero intro and the inverted band both fell
  back to `description`, which put the identical text under the title and
  then again, four times the size, one scroll later. It was doing that on
  eight of the eleven projects. A softer version of the same fault had an
  About paragraph repeating one the Details beat was already using.

  So text is CLAIMED. The first beat to want a paragraph gets it and later
  beats have to find their own, and the order below is by importance rather
  than by position on the page: the argument outranks the summary. Comparison
  is on a normalised prefix, not equality, because the same source trimmed to
  two sentences and to three is still the same paragraph to a reader.
*/
export function buildStory(project: Project): Story {
  /* long-form work keeps more of itself; a straight project stays short */
  const deep = project.kind === "case-study" || project.alsoCaseStudy === true;

  const claimed = new Set<string>();
  const key = (t: string) =>
    t
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 60);
  const claim = (t: string | undefined | null): string | null => {
    if (!t) return null;
    const k = key(t);
    if (!k || claimed.has(k)) return null;
    claimed.add(k);
    return t;
  };

  /* the band speaks first: it is the largest type on the page */
  const statement = pickStatement(project, claim);
  const intro = introParagraphs(project, claim);

  /* the argument outranks the summary, so Details claims before About does */
  const pairs = detailPairs(project);
  for (const pair of pairs) for (const para of pair.body) claim(para);

  /* one image budget for the whole page, spent in beat order, sized so that
     a project made of a single family is not capped down to nothing */
  const limits = project.caseLimits;
  const family: Budget = new Map();
  const perFamily = perFamilyFor(project, limits?.images ?? (deep ? 20 : 16));

  /*
    The named screens are spent FIRST, and a project that names its own limit
    gets it. Four is the right number for work whose argument is two or three
    decisions; a product documented screen by screen has fifteen or sixteen
    things to say, and truncating that at four leaves the page claiming the
    flow ends where the budget did.
  */
  const budget = limits?.highlights ?? (deep ? 4 : 3);
  const chs = project.caseChapters
    ? chapters(project, budget, family, perFamily, claim)
    : [];
  const hl = chs.length ? [] : highlights(project, budget, family, perFamily);

  const named = chs.length ? chs.flatMap((c) => c.items) : hl;
  for (const h of named) for (const para of h.body) claim(para);

  const usedMedia = new Set<string>(
    named.flatMap((h) => h.media.map((m) => m.src)),
  );

  /*
    Authored evidence beats picked evidence.

    `detailMedia` is not filtered by the family budget: it is four images the
    project has named as the ones this argument needs, and quietly dropping
    one of them for being the fourth screenshot of a chat window would be the
    heuristic overruling the author. They are marked used so the gallery does
    not show them a second time.
  */
  const media = project.detailMedia?.length
    ? project.detailMedia.slice(0, deep ? 4 : 3)
    : pickMedia(project, usedMedia, deep ? 4 : 3, family, perFamily);
  for (const m of media) usedMedia.add(m.src);

  const results = resultsOf(project);

  /*
    Whatever is left over becomes the gallery.

    Trimming the prose hard was the point; trimming the PICTURES hard was a
    mistake, and it showed on the poster project, which is forty-one posters
    and arrived on the page as two. Work whose argument is visual gets a wall
    rather than a column, so a project with nothing else to say (no named
    decisions, no figures) is allowed twice the room.
  */
  const visualOnly = !named.length && !results;
  const gallery = pickMedia(
    project,
    usedMedia,
    limits?.gallery ?? (visualOnly ? 24 : 14),
    family,
    perFamily,
  );

  return {
    statement,
    intro,
    about: aboutParagraphs(project, claim),
    details: pairs.length || media.length ? { pairs, media } : null,
    highlights: hl,
    chapters: chs,
    results,
    gallery,
  };
}

/* ---------- rendering ---------- */

function Img({
  src,
  alt,
  className = "csShot",
  capWidth = false,
}: {
  src: string;
  alt: string;
  className?: string;
  /** stop a small asset being blown up; only where there is no sized cell */
  capWidth?: boolean;
}) {
  /*
    min() of the two, not the natural width alone.

    An inline style outranks the stylesheet, so capping at the natural width
    threw away the `max-width: 100%` that was keeping the image inside its
    column. Only the height cap was left, which sized a 1.99 screenshot to
    1251px inside a 615px column: it overflowed by more than its own column
    again, and `overflow-x: clip` on the page meant it was silently cut off
    rather than showing up as a scrollbar in any of my overflow checks.
  */
  const dims = capWidth ? IMAGE_DIMS[src] : undefined;
  const cap = dims
    ? ({ maxWidth: `min(100%, ${dims[0]}px)` } as CSSProperties)
    : undefined;
  /* a .webm in an <img> renders nothing, so a moving asset gets a video that
     behaves like an image: no controls, no sound, and no reason to notice it
     is a video until it moves */
  if (src.endsWith(".webm") || src.endsWith(".mp4")) {
    return (
      <video
        className={className}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        aria-label={alt}
      />
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      style={cap}
      loading="lazy"
      decoding="async"
    />
  );
}

function rowClass(n: number): string {
  /* one, or two across. Everything wider produced a ragged row of unequal
     heights, and a website mockup three to a row is a thumbnail. */
  return n === 1 ? "csRow csRow--single" : "csRow csRow--pair";
}

/*
  What shape to cut a row of screens to.

  A fixed 16/10 was right for the mockups and wrong for the poster project,
  which is forty-one portraits and lost a third of each one to the crop. So
  the row is measured rather than assumed: IMAGE_DIMS already carries every
  asset's intrinsic size, so the row takes the median of its own images and
  a wall of posters comes out portrait while a wall of laptops comes out
  landscape, with no per-project flag to keep in sync.

  The MEDIAN, not the mean, because one odd frame in a row of eight should
  not drag the shape of the other seven. On an even count it takes the wider
  of the middle two: in a mixed row somebody gets cropped either way, and
  losing the top of a poster costs less than losing the side of a screenshot,
  where the cropped part is interface.

  Clamped, because the phone screens are 644x1399. Honoured literally, two of
  those side by side would be 1400px tall on a desktop, which is a monolith
  rather than a pair.
*/
/*
  How many across, decided by shape rather than fixed at two.

  Two was right for a desktop capture and badly wrong for a phone screen. A
  644x1399 export two-up on a desktop column is 1300px tall, so the ratio was
  being clamped to stop that, and the clamp is what produced 52% letterboxing:
  a 0.46 image sitting in a 0.7 box.

  Narrow things simply want more columns. Four phone screens across are 290px
  wide and 630px tall, which is how a case study actually shows a flow. With
  the column count doing the work the ratio needs no clamp at all, so the cell
  matches the image exactly and nothing is cropped OR letterboxed.
*/
/* the median ratio of a row, which is what decides both its shape and how
   many of it fit across; null when nothing in it is a sized asset */
function medianRatio(media: Media[]): number | null {
  const ratios = media
    .map((m) => IMAGE_DIMS[m.src])
    .filter(Boolean)
    .map(([w, h]) => w / h)
    .sort((a, b) => a - b);
  return ratios.length ? ratios[Math.floor(ratios.length / 2)] : null;
}

/* narrow things want more across: four phone screens, three squares, two
   desktop captures. See rowShape() for why this is not a fixed two. */
function preferredCols(media: Media[]): number {
  const mid = medianRatio(media) ?? 1.6;
  return mid < 0.75 ? 4 : mid < 1.15 ? 3 : 2;
}

function rowShape(
  media: Media[],
  /* balancedRows() hands each row a count it is guaranteed to fill, which
     the shape's own preference must not override or the hole comes back */
  colsOverride?: number,
): { ratio: string; cols: number; max: string } | undefined {
  const dims = media.map((m) => IMAGE_DIMS[m.src]).filter(Boolean);
  if (!dims.length) return undefined;

  const ratios = dims.map(([w, h]) => w / h).sort((a, b) => a - b);
  const widths = dims.map(([w]) => w).sort((a, b) => a - b);
  const mid = ratios[Math.floor(ratios.length / 2)];
  const cols = colsOverride ?? (mid < 0.75 ? 4 : mid < 1.15 ? 3 : 2);

  /*
    And never wider than the asset actually is.

    Some of these are components rather than screens: a mic button exported
    at 400px was being stretched across a 1232px column, which is both soft
    and a lie about the thing's size, since in the interface it is a control
    you tap. Capping the ROW at its images' own width keeps every cell at or
    under natural size while the cells themselves stay full, which is what
    capping each image inside an aspect-ratio cell would not do: that just
    leaves a hole around it.
  */
  const natural = widths[Math.floor(widths.length / 2)];
  /*
    The cap has to count the columns the row will ACTUALLY use, not the
    columns its shape would like. A lone component sheet takes the
    single-column class whatever its ratio says, so sizing the cap for four
    columns left it unbound and the sheet rendered at 1281px from a 453px
    source: a 183% upscale of a control that is a few hundred pixels wide in
    the interface it belongs to.
  */
  const used = Math.min(cols, media.length);
  return {
    ratio: mid.toFixed(3),
    cols,
    max: `${used * natural + (used - 1) * 24}px`,
  };
}

/* one row per shape, so nothing has to be cut to sit beside its neighbour,
   then cut again so no row ends short */
export function MediaRows({ media }: { media: Media[] }) {
  const rows = groupByShape(media).flatMap(balancedRows);
  return (
    <div className="csRows">
      {rows.map((row, i) => (
        <MediaRow media={row} cols={row.length} key={i} />
      ))}
    </div>
  );
}

export function MediaRow({ media, cols }: { media: Media[]; cols?: number }) {
  const shape = rowShape(media, cols);
  return (
    <div
      className={rowClass(media.length)}
      style={
        shape
          ? ({
              "--cs-shot-ratio": shape.ratio,
              "--cs-shot-cols": shape.cols,
              "--cs-row-max": shape.max,
            } as CSSProperties)
          : undefined
      }
    >
      {media.map((m, i) => (
        <Img key={m.src + i} src={m.src} alt={m.alt} />
      ))}
    </div>
  );
}

export function Details({ pairs, media }: { pairs: Pair[]; media: Media[] }) {
  return (
    <div className="csDetails">
      {/* one sticky block, so the whole argument holds while its evidence
          scrolls past on the right */}
      <div className="csDetails__pin">
        {pairs.map((pair, i) => (
          <div className="csDetails__pair" key={i}>
            <p className="csDetails__label">({pair.label})</p>
            <div className="csDetails__text">
              {pair.body.map((para, k) => (
                <p className="cs__body" key={k}>
                  {marked(para)}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
      {media.length ? (
        <div className="csDetails__media">
          {media.map((m, i) => (
            <Img key={m.src + i} src={m.src} alt={m.alt} capWidth />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FeatureBlock({ item }: { item: Highlight }) {
  return (
    <div className="csFeature">
      <div className="csFeature__head">
        <p className="csFeature__name">{item.name}</p>
        <div>
          {item.body.map((p, i) => (
            <p className="cs__body" key={i}>
              {marked(p)}
            </p>
          ))}
        </div>
      </div>
      {item.media.length ? (
        <div className="csFeature__media">
          <MediaRow media={item.media} />
        </div>
      ) : null}
    </div>
  );
}

export function ResultRows({
  items,
  note,
}: {
  items: ResultItem[];
  note?: string;
}) {
  return (
    <div className="csResults">
      {items.map((it, i) => (
        <div className="csResults__row" key={i}>
          <span className="csResults__label">{marked(it.label)}</span>
          <span className="csResults__value">
            {it.value}
            {it.projected ? " (projected)" : ""}
          </span>
        </div>
      ))}
      {note ? <p className="csResults__note">{note}</p> : null}
    </div>
  );
}

/*
  The flat gallery, for projects that never got a written case study.

  A strip is one enormous export cut into slices because WebP tops out at
  16383px a side, so the pieces stack with nothing between them: any gap or
  border would draw a line across what is meant to read as one image.
*/
export function ShotStack({ shots }: { shots: ProjectShot[] }) {
  return (
    <div className="csStack">
      {shots.map((shot, si) => (
        <figure className="csFig" key={si}>
          <div className="csStack__strip">
            {shotSources(shot).map((src, i) => (
              <Img
                key={src}
                src={src}
                alt={i === 0 ? shot.alt : ""}
                className="csStack__slice"
              />
            ))}
          </div>
          {shot.caption ? (
            <figcaption className="csFig__cap">{shot.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

/* ---------- hero content ---------- */

/*
  The inverted band says what the project is in one sentence, split so the
  claim carries in white and the qualification follows in grey. The split is
  made at a clause boundary rather than a word count, because breaking
  mid-thought puts the emphasis on an arbitrary half.
*/
export function pickStatement(
  project: Project,
  claim: (t?: string | null) => string | null,
): { lead: string; rest: string } | null {
  const explicit = allBlocks(project).find((b) => b.kind === "statement") as
    { kind: "statement"; text: string } | undefined;

  const brief = allBlocks(project).find((b) => b.kind === "brief") as
    | {
        kind: "brief";
        items: { label: string; body: string; wide?: boolean }[];
      }
    | undefined;

  /* in order of how well each reads at display size, falling through to the
     next when one has already been claimed */
  const text =
    claim(explicit?.text) ??
    claim(brief?.items.find((i) => i.wide)?.body) ??
    claim(project.description);
  if (!text) return null;

  /*
    The emphasis markers come off before the split.

    This band already has emphasis: the claim is white and the rest is grey.
    Leaving the ** in caused a real bug as well as a redundant one, because
    the split looks for a clause boundary and the first comma often sits
    INSIDE a marked phrase. Each half then carried one unpaired **, which the
    parser cannot close, and the asterisks shipped as visible text.
  */
  const clean = trimTo(text, 2).split("**").join("");
  const cut = clean.indexOf(", ");
  if (cut > 20 && cut < clean.length - 20) {
    return { lead: clean.slice(0, cut + 1), rest: clean.slice(cut + 2) };
  }
  const words = clean.split(" ");
  const at = Math.max(3, Math.round(words.length * 0.42));
  return {
    lead: words.slice(0, at).join(" "),
    rest: words.slice(at).join(" "),
  };
}

/* One paragraph under the title. Two was already too many to read standing up. */
export function introParagraphs(
  project: Project,
  claim: (t?: string | null) => string | null,
): string[] {
  const brief = allBlocks(project).find((b) => b.kind === "brief") as
    | {
        kind: "brief";
        items: { label: string; body: string; wide?: boolean }[];
      }
    | undefined;

  /* whichever summary the band did not take */
  const text =
    claim(project.description) ?? claim(brief?.items.find((i) => i.wide)?.body);
  return text ? [trimTo(text, 2)] : [];
}

/*
  The supporting paragraphs under the statement.

  The inverted band is a whole screen holding one sentence, which left most of
  it empty. These fill it without turning it back into prose: two short
  paragraphs, side by side, that say what the sentence above assumes.

  They deliberately avoid whatever the hero already used. Repeating the
  description here would make the reader check whether they had scrolled at
  all, so the overview line and the opening prose are taken in that order and
  anything matching the intro is dropped.
*/
export function aboutParagraphs(
  project: Project,
  claim: (t?: string | null) => string | null,
): string[] {
  const out: string[] = [];
  for (const block of allBlocks(project)) {
    if (out.length >= 2) break;
    if (block.kind !== "prose") continue;
    for (const para of block.body) {
      if (out.length >= 2) break;
      const taken = claim(para);
      if (taken) out.push(trimTo(taken, 3));
    }
  }
  return out;
}

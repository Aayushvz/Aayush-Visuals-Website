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
function highlights(project: Project, limit: number): Highlight[] {
  const out: Highlight[] = [];

  for (const block of allBlocks(project)) {
    if (out.length >= limit) break;

    if (block.kind === "step" && block.body.length) {
      out.push({
        name: block.items[0]?.label ?? "",
        body: block.body.slice(0, 2),
        media: mediaOf(block).slice(0, 4),
      });
      continue;
    }

    if (block.kind === "mockup" || block.kind === "screens") {
      for (const item of block.items) {
        if (out.length >= limit) break;
        out.push({
          name: item.title,
          body: [item.body],
          media: [{ src: item.src, alt: item.alt }],
        });
      }
    }
  }

  return out.filter((h) => h.name).slice(0, limit);
}

function resultsOf(project: Project): Story["results"] {
  for (const block of allBlocks(project)) {
    if (block.kind === "results")
      return { items: block.items, note: block.caption };
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
function pickMedia(
  project: Project,
  used: Set<string>,
  limit: number,
): Media[] {
  const out: Media[] = [];
  for (const block of allBlocks(project)) {
    if (!["figure", "grid", "gallery", "directions"].includes(block.kind))
      continue;
    for (const m of mediaOf(block)) {
      if (used.has(m.src)) continue;
      used.add(m.src);
      out.push(m);
      if (out.length >= limit) return out;
    }
  }
  return out;
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

  const hl = highlights(project, deep ? 4 : 3);
  for (const h of hl) for (const para of h.body) claim(para);

  const usedMedia = new Set<string>(
    hl.flatMap((h) => h.media.map((m) => m.src)),
  );
  const media = pickMedia(project, usedMedia, deep ? 4 : 3);
  const results = resultsOf(project);

  /*
    Whatever is left over becomes the gallery.

    Trimming the prose hard was the point; trimming the PICTURES hard was a
    mistake, and it showed on the poster project, which is forty-one posters
    and arrived on the page as two. Work whose argument is visual gets a wall
    rather than a column, so a project with nothing else to say (no named
    decisions, no figures) is allowed twice the room.
  */
  const visualOnly = !hl.length && !results;
  const gallery = pickMedia(project, usedMedia, visualOnly ? 24 : 12);

  return {
    statement,
    intro,
    about: aboutParagraphs(project, claim),
    details: pairs.length || media.length ? { pairs, media } : null,
    highlights: hl,
    results,
    gallery,
  };
}

/* ---------- rendering ---------- */

function Img({
  src,
  alt,
  className = "csShot",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
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
function rowRatio(media: Media[]): string | undefined {
  const ratios = media
    .map((m) => IMAGE_DIMS[m.src])
    .filter(Boolean)
    .map(([w, h]) => w / h)
    .sort((a, b) => a - b);

  if (!ratios.length) return undefined;
  const mid = ratios[Math.floor(ratios.length / 2)];
  const clamped = Math.min(1.9, Math.max(0.7, mid));
  return clamped.toFixed(3);
}

export function MediaRow({ media }: { media: Media[] }) {
  const ratio = rowRatio(media);
  return (
    <div
      className={rowClass(media.length)}
      style={
        ratio ? ({ "--cs-shot-ratio": ratio } as CSSProperties) : undefined
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
            <Img key={m.src + i} src={m.src} alt={m.alt} />
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

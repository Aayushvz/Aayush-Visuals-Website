import type { ReactNode } from "react";
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

type Pair = { label: string; body: string };
type Media = { src: string; alt: string };

export type Highlight = { name: string; body: string[]; media: Media[] };

export type Story = {
  statement: { lead: string; rest: string } | null;
  intro: string[];
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
  The pairs that answer "what was wrong" and "what did you do".

  `brief` is preferred because it was authored as the summary already: one
  label, one or two lines. `numbered` is the fallback, since findings carry
  their own labels too. Plain prose is last, and only its opening paragraph,
  because unlabelled running text is the thing this page is trying to have
  less of.
*/
function detailPairs(
  project: Project,
  limit: number,
  sentences: number,
): Pair[] {
  const blocks = allBlocks(project);
  const out: Pair[] = [];

  const brief = blocks.find((b) => b.kind === "brief");
  if (brief && brief.kind === "brief") {
    for (const item of brief.items) {
      if (item.wide) continue; /* the overview already ran in the hero */
      out.push({ label: item.label, body: trimTo(item.body, sentences) });
    }
  }

  if (out.length < limit) {
    const numbered = blocks.find((b) => b.kind === "numbered");
    if (numbered && numbered.kind === "numbered") {
      for (const item of numbered.items) {
        out.push({ label: item.label, body: trimTo(item.body, sentences) });
      }
    }
  }

  if (!out.length) {
    const prose = blocks.find((b) => b.kind === "prose");
    if (prose && prose.kind === "prose" && prose.body.length) {
      out.push({ label: "Overview", body: trimTo(prose.body[0], sentences) });
    }
  }

  return out.slice(0, limit);
}

/* The decisions worth naming, each with the screens it produced. */
function highlights(
  project: Project,
  limit: number,
  sentences: number,
): Highlight[] {
  const out: Highlight[] = [];

  for (const block of allBlocks(project)) {
    if (out.length >= limit) break;

    if (block.kind === "step" && block.body.length) {
      out.push({
        name: block.items[0]?.label ?? "",
        body: [trimTo(block.body[0], sentences)],
        media: mediaOf(block).slice(0, 2),
      });
      continue;
    }

    if (block.kind === "mockup" || block.kind === "screens") {
      for (const item of block.items) {
        if (out.length >= limit) break;
        out.push({
          name: item.title,
          body: [trimTo(item.body, sentences)],
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

export function buildStory(project: Project): Story {
  /* long-form work keeps more of itself; a straight project stays short */
  const deep = project.kind === "case-study" || project.alsoCaseStudy === true;

  const hl = highlights(project, deep ? 4 : 3, deep ? 3 : 2);
  const used = new Set<string>(hl.flatMap((h) => h.media.map((m) => m.src)));

  const pairs = detailPairs(project, deep ? 4 : 2, deep ? 3 : 2);
  const media = pickMedia(project, used, deep ? 4 : 3);
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
  const gallery = pickMedia(project, used, visualOnly ? 24 : 12);

  return {
    statement: pickStatement(project),
    intro: introParagraphs(project),
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
  if (n === 1) return "csRow csRow--single";
  if (n === 2) return "csRow csRow--pair";
  return "csRow csRow--many";
}

export function MediaRow({ media }: { media: Media[] }) {
  return (
    <div className={rowClass(media.length)}>
      {media.map((m, i) => (
        <Img key={m.src + i} src={m.src} alt={m.alt} />
      ))}
    </div>
  );
}

export function Details({ pairs, media }: { pairs: Pair[]; media: Media[] }) {
  return (
    <div className="csDetails">
      {pairs.map((pair, i) => (
        <Pairing key={i} pair={pair} />
      ))}
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

function Pairing({ pair }: { pair: Pair }) {
  return (
    <>
      <p className="csDetails__label">{pair.label}</p>
      <div className="csDetails__text">
        <p className="cs__body">{marked(pair.body)}</p>
      </div>
    </>
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
): { lead: string; rest: string } | null {
  const explicit = allBlocks(project).find((b) => b.kind === "statement") as
    { kind: "statement"; text: string } | undefined;

  /*
    The emphasis markers come off before the split.

    This band already has emphasis: the claim is white and the rest is grey.
    Leaving the ** in caused a real bug as well as a redundant one, because
    the split looks for a clause boundary and the first comma often sits
    INSIDE a marked phrase. Each half then carried one unpaired **, which the
    parser cannot close, and the asterisks shipped as visible text.
  */
  const text = trimTo(explicit?.text ?? project.description, 2)
    .split("**")
    .join("");
  if (!text) return null;

  const cut = text.indexOf(", ");
  if (cut > 20 && cut < text.length - 20) {
    return { lead: text.slice(0, cut + 1), rest: text.slice(cut + 2) };
  }
  const words = text.split(" ");
  const at = Math.max(3, Math.round(words.length * 0.42));
  return {
    lead: words.slice(0, at).join(" "),
    rest: words.slice(at).join(" "),
  };
}

/* One paragraph under the title. Two was already too many to read standing up. */
export function introParagraphs(project: Project): string[] {
  return [trimTo(project.description, 2)].filter(Boolean);
}

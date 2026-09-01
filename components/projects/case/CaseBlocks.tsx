import type { ReactNode } from "react";
import {
  isStripShot,
  type CaseBlock,
  type Project,
  type ProjectShot,
} from "@/components/projects/projectData";

/*
  The reference comp speaks a deliberately small vocabulary:

    a label beside a paragraph, with images stacked alongside   (Details)
    an accent-coloured feature name over a wide paragraph,
      then the screens that feature produced                    (New Additions)
    label/value rows under hairlines                            (Results)

  The project data speaks a much larger one, twenty-odd block kinds built for
  a page that had room to be discursive. Rather than invent a new visual
  treatment per kind and end up with twenty dialects, everything is sorted
  into those three shapes plus plain media. A block whose content is a label
  and a body becomes a Details pair whatever it was called; a block that is
  images with an explanation attached becomes a Feature; numbers become
  Results.

  This is what makes the pages read as one family, and it is also why they
  got shorter: several of the old kinds were different renderings of the same
  underlying thing.
*/

type Pair = { label: string; body: string };
type Media = { src: string; alt: string };

/*
  Inline emphasis for the words an argument turns on.

  The copy in projectData marks them as `**like this**`, so the renderer has
  to resolve them or the asterisks ship as literal text. It renders as <b>
  rather than <strong> deliberately: this is emphasis for an eye scanning a
  long page, not a claim that the phrase outranks the sentence around it, and
  promoting forty words a page to <strong> would leave a screen reader
  shouting most of the document.

  The smallest parser that does the job: one delimiter, no nesting. Taking a
  Markdown dependency to resolve two asterisks would be the wrong trade.
*/
export function marked(text: string): ReactNode[] {
  /* splitting on one capture group alternates plain, marked, plain ... */
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>));
}

const TEXT_KINDS = new Set(["prose", "numbered", "decisions", "lessons", "brief"]);
const MEDIA_KINDS = new Set(["figure", "grid", "gallery", "directions"]);
const FEATURE_KINDS = new Set(["step", "mockup", "screens"]);

/* ---------- media ---------- */

function shotSources(shot: ProjectShot): string[] {
  return isStripShot(shot) ? shot.strip : [shot.src];
}

function Img({ src, alt, className = "csShot" }: { src: string; alt: string; className?: string }) {
  /* a .webm in an <img> renders nothing, so a moving asset gets a video that
     behaves like an image: no controls, no sound, and no reason to notice it
     is a video until it moves */
  if (src.endsWith(".webm") || src.endsWith(".mp4")) {
    return (
      <video className={className} src={src} muted loop playsInline autoPlay aria-label={alt} />
    );
  }
  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async" />;
}

/* Every picture a block wants to show, flattened. The stacked column in the
   Details layout does not care whether one arrived as a figure, a grid or a
   gallery: it is a column of pictures. */
function mediaOf(block: CaseBlock): Media[] {
  switch (block.kind) {
    case "figure":
      return shotSources(block.shot).map((src) => ({ src, alt: block.shot.alt }));
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

/*
  The flat gallery, for projects that never got a written case study.

  A strip is one enormous export cut into slices because WebP tops out at
  16383px a side, so the pieces have to be stacked with nothing between them:
  any gap, border or rounding would draw a line across what is meant to read
  as a single continuous image.
*/
export function ShotStack({ shots }: { shots: ProjectShot[] }) {
  return (
    <div className="csStack">
      {shots.map((shot, si) => (
        <figure className="csFig" key={si}>
          <div className="csStack__strip">
            {shotSources(shot).map((src, i) => (
              <Img key={src} src={src} alt={i === 0 ? shot.alt : ""} className="csStack__slice" />
            ))}
          </div>
          {shot.caption ? <figcaption className="csFig__cap">{shot.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

function rowClass(n: number): string {
  if (n === 1) return "csRow csRow--single";
  if (n >= 3) return "csRow csRow--three";
  return "csRow csRow--pair";
}

function MediaRow({ media }: { media: Media[] }) {
  return (
    <div className={rowClass(media.length)}>
      {media.map((m, i) => (
        <Img key={m.src + i} src={m.src} alt={m.alt} />
      ))}
    </div>
  );
}

/* ---------- text ---------- */

function pairsOf(block: CaseBlock): Pair[] {
  switch (block.kind) {
    case "numbered":
    case "decisions":
    case "brief":
      return block.items.map((i) => ({ label: i.label, body: i.body }));
    case "lessons":
      return block.items.map((i) => ({ label: i.title, body: i.body }));
    case "prose":
      /* running text has no label of its own; it inherits the section's */
      return [{ label: "", body: block.body.join("\n\n") }];
    default:
      return [];
  }
}

/* ---------- the three shapes ---------- */

function Details({ pairs, media }: { pairs: Pair[]; media: Media[] }) {
  return (
    <div className="csDetails">
      {pairs.map((p, i) => (
        <Pairing key={i} pair={p} />
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
      <p className="csDetails__label">{pair.label ? marked("(" + pair.label + ")") : ""}</p>
      <div className="csDetails__text">
        {pair.body.split("\n\n").map((para, i) => (
          <p className="cs__body" key={i}>
            {marked(para)}
          </p>
        ))}
      </div>
    </>
  );
}

function Feature({ name, body, media }: { name: string; body: string[]; media: Media[] }) {
  return (
    <div className="csFeature">
      <div className="csFeature__head">
        <p className="csFeature__name">{name}</p>
        <div>
          {body.map((p, i) => (
            <p className="cs__body" key={i}>
              {marked(p)}
            </p>
          ))}
        </div>
      </div>
      {media.length ? (
        <div className="csFeature__media">
          <MediaRow media={media} />
        </div>
      ) : null}
    </div>
  );
}

function Results({
  items,
  note,
}: {
  items: { value: string; label: string; note?: string; projected?: boolean }[];
  note?: string;
}) {
  /* two columns, filled down then across, the way the reference reads */
  const half = Math.ceil(items.length / 2);
  const cols = [items.slice(0, half), items.slice(half)];
  return (
    <div className="csResults">
      {cols.map((col, ci) => (
        <div className="csResults__col" key={ci}>
          {col.map((it, i) => (
            <div className="csResults__row" key={i}>
              <span className="csResults__label">{marked(it.label)}</span>
              <span className="csResults__value">
                {it.value}
                {it.projected ? " (projected)" : ""}
              </span>
            </div>
          ))}
        </div>
      ))}
      {note ? <p className="csResults__note">*{note}</p> : null}
    </div>
  );
}

/* ---------- section renderer ---------- */

export function CaseSectionBody({ blocks, project }: { blocks: CaseBlock[]; project: Project }) {
  const out: ReactNode[] = [];
  let pairs: Pair[] = [];
  let media: Media[] = [];

  const flush = (key: string) => {
    if (!pairs.length && !media.length) return;
    if (!pairs.length) {
      /* pictures with nothing to say about them get the full width rather
         than being stranded in a third of it */
      out.push(<MediaRow key={key} media={media} />);
    } else {
      out.push(<Details key={key} pairs={pairs} media={media} />);
    }
    pairs = [];
    media = [];
  };

  blocks.forEach((block, bi) => {
    const key = block.kind + "-" + bi;

    if (TEXT_KINDS.has(block.kind)) {
      pairs = pairs.concat(pairsOf(block));
      return;
    }
    if (MEDIA_KINDS.has(block.kind)) {
      media = media.concat(mediaOf(block));
      return;
    }

    flush("group-" + bi);

    if (block.kind === "step") {
      out.push(
        <Feature
          key={key}
          name={block.items[0]?.label ?? project.title}
          body={block.body}
          media={mediaOf(block)}
        />
      );
      return;
    }

    if (block.kind === "mockup" || block.kind === "screens") {
      /* these carry a title and a paragraph per image, so each item is its
         own feature rather than one feature with a row under it */
      block.items.forEach((it, i) => {
        out.push(
          <Feature
            key={key + "-" + i}
            name={it.title}
            body={[it.body]}
            media={[{ src: it.src, alt: it.alt }]}
          />
        );
      });
      return;
    }

    switch (block.kind) {
      case "results":
        out.push(<Results key={key} items={block.items} note={block.caption} />);
        break;
      case "stats":
        out.push(<Results key={key} items={block.items} />);
        break;
      case "statement":
        out.push(
          <p className="csStatement csStatement--light" key={key}>
            {marked(block.text)}
          </p>
        );
        break;
      case "palette":
        out.push(
          <div className="csPalette" key={key}>
            {block.items.map((c) => (
              <div className="csPalette__chip" key={c.hex}>
                <span className="csPalette__swatch" style={{ background: c.hex }} />
                <span className="csPalette__name">{c.name}</span>
                <span className="csPalette__hex">{c.hex}</span>
              </div>
            ))}
          </div>
        );
        break;
      default:
        /* Kinds the reference has no shape for: flow boards, bar charts,
           coverage grids, wireframes, sitemaps, type trials, spec tables.
           They are diagrams, and a diagram redrawn badly is worse than the
           sentence it came from, so what survives is the labelled claim each
           was making, as Details pairs. */
        pairs = pairs.concat(fallbackPairs(block));
        break;
    }
  });

  flush("group-tail");
  return <>{out}</>;
}

function fallbackPairs(block: CaseBlock): Pair[] {
  switch (block.kind) {
    case "compare":
      return block.lanes.map((l) => ({
        label: l.label,
        body: [l.note, l.steps.join(" / ")].filter(Boolean).join("\n\n"),
      }));
    case "flow":
      return [{ label: "Flow", body: block.steps.map((s) => s.label).join(" / ") }];
    case "bars":
      return block.items.map((i) => ({ label: i.label, body: i.display }));
    case "coverage":
      return [
        {
          label: block.label,
          body: [block.filled + " of " + block.total, block.note].filter(Boolean).join(". "),
        },
      ];
    case "wireframes":
      return block.items.map((i) => ({ label: i.label, body: i.note }));
    case "specs":
      return block.items.map((i) => ({
        label: i.name,
        body: [i.value, i.note].filter(Boolean).join(". "),
      }));
    case "typeset":
      return block.items.map((i) => ({ label: i.name, body: i.family + ". " + i.use }));
    default:
      return [];
  }
}

/* ---------- hero content ---------- */

/*
  The inverted band states what the project is in one sentence, split so the
  first clause carries in white and the qualification follows in grey.

  The split is made at a clause boundary rather than a word count, because
  breaking mid-thought puts the emphasis on an arbitrary half. Failing that it
  falls back to roughly the first two fifths, which is what the reference does
  by eye.
*/
export function pickStatement(project: Project): { lead: string; rest: string } | null {
  const explicit = project.sections
    ?.flatMap((s) => s.blocks)
    .find((b) => b.kind === "statement") as { kind: "statement"; text: string } | undefined;

  const text = explicit?.text ?? project.description;
  if (!text) return null;

  const cut = text.indexOf(", ");
  if (cut > 24 && cut < text.length - 24) {
    return { lead: text.slice(0, cut + 1), rest: text.slice(cut + 2) };
  }
  const words = text.split(" ");
  const at = Math.max(4, Math.round(words.length * 0.42));
  return { lead: words.slice(0, at).join(" "), rest: words.slice(at).join(" ") };
}

export function introParagraphs(project: Project): string[] {
  const out = [project.description].filter(Boolean);
  const overview = project.sections
    ?.flatMap((s) => s.blocks)
    .find((b) => b.kind === "brief") as
    | { kind: "brief"; items: { label: string; body: string; wide?: boolean }[] }
    | undefined;
  const wide = overview?.items.find((i) => i.wide)?.body;
  if (wide && wide !== project.description) out.push(wide);
  return out.slice(0, 2);
}

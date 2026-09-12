import type { CSSProperties } from "react";
import { marked } from "./CaseBlocks";
import { IMAGE_DIMS } from "@/components/projects/imageDims";
import type { CaseBlock } from "@/components/projects/projectData";

/*
  The blocks the five-beat page used to throw away.

  projectData defines twenty-four content block types. Until now the page
  rendered ten of them, and the twelve it dropped were not incidental: the
  directions boards, the type trials, the before/after lanes and the
  wireframes ARE the iteration archive; the palette, the typeset and the
  specs ARE the UI system; the lessons ARE the reflection. All of it was
  written, sitting in the file, and never reaching a reader.

  These renderers existed once, in the Figma-framed version of this page
  that was replaced (FigmaCaseSections.tsx, deleted in 848e399). This is a
  port rather than a restore: the originals were wired to framer-motion
  whileInView reveals, to data attributes feeding a fake layers panel, and
  to a five-thousand-line stylesheet none of which survives. What carries
  over is the markup structure and the reasoning; the motion now runs on the
  page's own scroll-timeline convention, and the styling is the current
  minimal language.
*/

/* the page's reveal: position-driven, and visible if it never runs */
const rise = (i?: number) =>
  ({ "data-rise": "", style: i === undefined ? undefined : ({ "--i": i } as CSSProperties) });

/*
  A vector specimen, drawn as a mask rather than an <img>.

  An SVG loaded through <img> is its own document and cannot see the page's
  `color`, so `currentColor` inside it resolves to black and a specimen
  disappears into a dark card. A mask takes its shape from the file and its
  colour from `background`, which is the only way one file works on both
  grounds and in both chosen and unchosen states. A mask has no intrinsic
  size, hence the explicit ratio.
*/
function Outlines({
  src,
  ratio,
  label,
  className,
}: {
  src: string;
  ratio: number;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={className ? `csOutline ${className}` : "csOutline"}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      style={
        {
          "--mask": `url("${src}")`,
          aspectRatio: String(ratio),
        } as CSSProperties
      }
    />
  );
}

/* Low-fidelity layouts, drawn in CSS. Wireframes are the one artefact that
   never survives a project - they are thrown away the moment visual design
   starts - so redrawing them as greyboxes is both honest and better than a
   screenshot, because structure reads without the palette arguing over it. */
function WireFrame({ layout }: { layout: "entry" | "listen" | "chat" | "review" }) {
  const bar = (w: string, h = 8) => (
    <span className="csWire__bar" style={{ width: w, height: h }} />
  );
  if (layout === "entry")
    return (
      <span className="csWire__art">
        {bar("52%", 12)}
        {bar("78%")}
        <span className="csWire__blockLg" />
        {bar("40%")}
      </span>
    );
  if (layout === "listen")
    return (
      <span className="csWire__art csWire__art--centre">
        <span className="csWire__disc" />
        {bar("56%")}
        {bar("34%")}
      </span>
    );
  if (layout === "chat")
    return (
      <span className="csWire__art">
        <span className="csWire__bubble csWire__bubble--in" />
        <span className="csWire__bubble csWire__bubble--out" />
        <span className="csWire__bubble csWire__bubble--in" />
        {bar("100%", 20)}
      </span>
    );
  return (
    <span className="csWire__art">
      {bar("64%", 12)}
      <span className="csWire__rows">
        <span />
        <span />
        <span />
      </span>
      {bar("46%", 18)}
    </span>
  );
}

/*
  One block, rendered.

  Returns null for every kind the five-beat page already handles, so this
  can be pointed at a whole section without double-rendering what
  buildStory has already selected.
*/
export function Block({ block }: { block: CaseBlock }) {
  switch (block.kind) {
    /* ---------- iteration archive ---------- */

    case "directions":
      return (
        <figure className="csFig csDirs__fig">
          <div className="csDirs">
            {block.items.map((item, i) => (
              <div
                className={`csDir${item.chosen ? " csDir--chosen" : ""}`}
                key={item.src}
                {...rise(i)}
              >
                <span className="csDir__frame">
                  <img
                    className="csDir__shot"
                    src={item.src}
                    alt={item.alt}
                    width={IMAGE_DIMS[item.src]?.[0]}
                    height={IMAGE_DIMS[item.src]?.[1]}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="csDir__head">
                  <span className="csDir__label">{item.label}</span>
                  {/* the ring already says it; this is the same fact for a
                      reader who is not seeing the ring */}
                  {item.chosen && <span className="csDir__tag">Chosen</span>}
                </span>
                <span className="csDir__note">{marked(item.note)}</span>
              </div>
            ))}
          </div>
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    case "typetrial":
      return (
        <figure className={`csFig csTrials csTrials--${block.variant}`}>
          {block.items.map((t, i) => (
            <div
              className={`csTrial${t.chosen ? " csTrial--chosen" : ""}`}
              key={t.face}
              {...rise(i)}
            >
              {block.variant === "display" ? (
                <div className="csTrial__grid">
                  <span className="csTrial__head">
                    {t.svg ? (
                      <Outlines
                        src={t.svg}
                        ratio={t.ratio ?? 2.5}
                        label={`Headlines set in ${t.face}`}
                      />
                    ) : (
                      <span
                        className="csTrial__live"
                        style={t.stack ? { fontFamily: t.stack } : undefined}
                      >
                        Forged in legacy
                      </span>
                    )}
                  </span>
                  <span className="csTrial__side">
                    <span className="csTrial__face">{t.face}</span>
                    {t.numerals ? (
                      <Outlines
                        src={t.numerals}
                        ratio={t.numeralsRatio ?? 1.8}
                        label={`Numerals in ${t.face}`}
                        className="csTrial__num"
                      />
                    ) : (
                      <span
                        className="csTrial__numLive"
                        style={t.stack ? { fontFamily: t.stack } : undefined}
                      >
                        721
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="csTrial__pair">
                  <span className="csTrial__face">{t.face}</span>
                  <Outlines
                    src="/projects/mike-tyson/face-legend.svg"
                    ratio={2.5686}
                    label=""
                    className="csTrial__pairHead"
                  />
                  {/* real copy from the site this pairing was chosen for,
                      not lorem: a body face is being judged on how it reads
                      under the headline, and filler cannot be read */}
                  <p
                    className="csTrial__body"
                    style={t.bodyStack ? { fontFamily: t.bodyStack } : undefined}
                  >
                    Three nights of amateur boxing in Las Vegas. Tickets,
                    fighter registration, sponsorship and donations, across
                    ten pages built end to end.
                  </p>
                </div>
              )}
              {t.note ? <span className="csTrial__note">{marked(t.note)}</span> : null}
            </div>
          ))}
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    case "compare":
      return (
        <figure className="csFig">
          <div className="csCompare">
            {block.lanes.map((lane, i) => (
              <div className={`csLane csLane--${lane.tone}`} key={lane.label} {...rise(i)}>
                <div className="csLane__head">
                  <span className="csLane__label">{lane.label}</span>
                  <span className="csLane__count">{lane.steps.length}</span>
                </div>
                {lane.note ? (
                  <p className="csLane__note">{marked(lane.note)}</p>
                ) : null}
                <ol className="csLane__steps">
                  {lane.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    case "wireframes":
      return (
        <figure className="csFig">
          <div className="csWires">
            {block.items.map((item, i) => (
              <div className="csWire" key={item.label} {...rise(i)}>
                <WireFrame layout={item.layout} />
                <span className="csWire__label">{item.label}</span>
                <span className="csWire__note">{marked(item.note)}</span>
              </div>
            ))}
          </div>
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    /* ---------- research, tied to the decisions it drove ---------- */

    case "bars":
      return (
        <figure className="csFig">
          <dl className="csBars">
            {block.items.map((b, i) => (
              <div className={`csBar csBar--${b.tone ?? "bad"}`} key={b.label} {...rise(i)}>
                <dt className="csBar__label">{b.label}</dt>
                <dd className="csBar__row">
                  {/* the track is the remaining share, so the eye reads the
                      gap as much as the fill */}
                  <span className="csBar__track">
                    <span
                      className="csBar__fill"
                      style={{ width: `${b.value}%` }}
                    />
                  </span>
                  <span className="csBar__value">{b.display}</span>
                </dd>
              </div>
            ))}
          </dl>
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    case "coverage":
      return (
        <figure className="csFig csCoverage" {...rise()}>
          <div
            className="csCoverage__grid"
            role="img"
            aria-label={`${block.filled} of ${block.total}: ${block.label}`}
          >
            {Array.from({ length: block.total }, (_, i) => (
              <span className={`csCell${i < block.filled ? " is-on" : ""}`} key={i} />
            ))}
          </div>
          <figcaption className="csCoverage__meta">
            <span className="csCoverage__count">
              {block.filled} of {block.total}
            </span>
            <span className="csCoverage__label">{block.label}</span>
            {block.note ? (
              <span className="csCoverage__note">{marked(block.note)}</span>
            ) : null}
          </figcaption>
        </figure>
      );

    case "flow":
      return (
        <figure className="csFig">
          {/* an ordered list, so a screen reader gets the sequence without
              having to interpret the arrows */}
          <ol className="csFlow">
            {block.steps.map((step, i) => (
              <li
                className={`csFlow__step${step.decision ? " csFlow__step--decision" : ""}`}
                key={step.label}
                {...rise(i)}
              >
                <span className="csFlow__index" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="csFlow__label">{step.label}</span>
                {step.sub ? (
                  <span className="csFlow__sub">
                    {step.sub.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    /* ---------- the UI system ---------- */

    case "palette":
      return (
        <figure className="csFig">
          <div className="csPalette">
            {block.items.map((c, i) => (
              <div className="csSwatch" key={c.hex} {...rise(i)}>
                {/* the colour itself is the tile and the hex rides inside it,
                    so the value and the thing it names never separate */}
                <span className="csSwatch__chip" style={{ background: c.hex }}>
                  <span className="csSwatch__hex">{c.hex}</span>
                </span>
                <span className="csSwatch__name">{c.name}</span>
                <span className="csSwatch__use">{c.use}</span>
              </div>
            ))}
          </div>
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    case "typeset":
      return (
        <figure className="csFig">
          <div className="csTypeset">
            {block.items.map((t, i) => (
              <div className="csType" key={t.name} {...rise(i)}>
                <span className="csType__meta">
                  <span className="csType__role">{t.name}</span>
                  <span className="csType__family">{t.family}</span>
                </span>
                {/* set in the face it describes wherever the site can reach
                    it; the stack falls back rather than faking the shapes */}
                <span
                  className="csType__sample"
                  style={t.stack ? { fontFamily: t.stack } : undefined}
                >
                  {t.sample}
                </span>
                <span className="csType__use">{t.use}</span>
              </div>
            ))}
          </div>
          {block.caption ? (
            <figcaption className="csFig__cap">{marked(block.caption)}</figcaption>
          ) : null}
        </figure>
      );

    case "specs":
      return (
        <dl className="csSpecs" {...rise()}>
          {block.items.map((row) => (
            <div className="csSpec" key={row.name}>
              <dt className="csSpec__name">{row.name}</dt>
              <dd className="csSpec__val">
                <span className="csSpec__value">
                  {row.swatch ? (
                    <span
                      className="csSpec__swatch"
                      style={{ background: row.swatch }}
                      aria-hidden
                    />
                  ) : null}
                  {row.value}
                </span>
                {row.note ? <span className="csSpec__note">{row.note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      );

    /* ---------- reflection ---------- */

    case "lessons":
      return (
        <div className="csLessons">
          {block.items.map((l, i) => (
            <section className="csLesson" key={l.title} {...rise(i)}>
              <span className="csLesson__index" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="csLesson__title">{marked(l.title)}</h3>
              <p className="csLesson__body">{marked(l.body)}</p>
            </section>
          ))}
        </div>
      );

    default:
      return null;
  }
}

export function Blocks({ blocks }: { blocks: CaseBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <Block block={b} key={`${b.kind}-${i}`} />
      ))}
    </>
  );
}

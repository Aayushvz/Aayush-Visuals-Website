"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { CaseBlock, ProjectSection, ProjectShot } from "@/components/projects/projectData";
import { isStripShot } from "@/components/projects/projectData";
import { dimsFor } from "@/components/projects/imageDims";
import { layerId } from "./FigmaProjectPage";

/*
  The long-form body of a case study, rendered as a run of named frames on
  the canvas. Each section carries the same `data-figp-node` contract the
  gallery frames use, so the properties panel keeps reporting whatever the
  cursor is over, and its name matches its row in the Layers tree — hovering
  a section and reading the sidebar should agree.

  The small grey caption above each section is the frame label Figma draws
  above an artboard. It is the cheapest possible way to make a wall of prose
  still read as a design file rather than a blog post.
*/
const EASE = [0.22, 1, 0.36, 1] as const;

export default function FigmaCaseSections({
  sections,
  pin,
}: {
  sections: ProjectSection[];
  /* the page's second comment pin. In the flat gallery it sits on the first
     frame; here the first frame is buried inside a section, so the page
     hands the pin down and we place it on whichever figure comes first. */
  pin?: React.ReactNode;
}) {
  const firstFigure = findFirstFigure(sections);

  return (
    <div className="figp-sections">
      {sections.map((section, si) => (
        <motion.section
          className="figp-section"
          key={section.name}
          data-figp-node={section.name}
          data-figp-layer={layerId(section.name)}
          data-figp-fill="var(--figp-body-text)"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {/*
            The section's name and heading ride a rail down the left, and
            everything else takes the width that was previously empty beside
            a 62ch column. The rail sticks while the section scrolls, so a
            reader dropping into the middle of a long frame can always see
            which one they are in.
          */}
          <header className="figp-section-rail">
            <span className="figp-frame-label" aria-hidden="true">
              {section.name}
            </span>

            {section.heading && <h2 className="figp-section-head">{section.heading}</h2>}
          </header>

          <div className="figp-section-body">
            {section.blocks.map((block, i) => (
              <Block
                block={block}
                key={i}
                pin={firstFigure && firstFigure.s === si && firstFigure.b === i ? pin : undefined}
              />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}

/*
  Inline emphasis for the words the argument turns on.

  A case study this long is an even wall of grey, and the terms actually
  carrying it — the UX vocabulary, the numbers a paragraph exists to
  deliver — read the same as the connective tissue around them. `**like
  this**` in the source marks one.

  It renders as a <b> rather than <strong> on purpose. This is emphasis for
  an eye scanning the page, not a claim that the phrase is more important
  than the sentence around it, and promoting forty words a page to <strong>
  would leave a screen reader shouting most of the document.

  Deliberately the smallest parser that does the job: one delimiter, no
  nesting, no escape hatch. A Markdown dependency to resolve two asterisks
  in copy written by the same person who reads it would be the wrong trade.
*/
function marked(text: string) {
  /* splitting on one capture group alternates plain, marked, plain … */
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 ? (
        <b className="figp-term" key={i}>
          {part}
        </b>
      ) : (
        part
      )
    );
}

function Block({ block, pin }: { block: CaseBlock; pin?: React.ReactNode }) {
  switch (block.kind) {
    case "prose":
      return (
        <div className="figp-prose">
          {block.body.map((p) => (
            <p key={p}>{marked(p)}</p>
          ))}
        </div>
      );

    /* the label is generated from position rather than authored, so
       reordering the source array can never leave a stale 03 behind */
    case "numbered":
      return (
        <motion.ol
          className="figp-numbered"
          variants={revealParent}
          initial="hidden"
          whileInView="shown"
          viewport={inView}
        >
          {block.items.map((item, i) => (
            <motion.li key={item.label} variants={revealChild}>
              <span className="figp-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="figp-num-body">
                <strong>{marked(item.label)}</strong>
                <span>{marked(item.body)}</span>
              </span>
            </motion.li>
          ))}
        </motion.ol>
      );

    case "stats":
      return (
        <motion.div
          className="figp-stats"
          variants={revealParent}
          initial="hidden"
          whileInView="shown"
          viewport={inView}
        >
          {block.items.map((s) => (
            <motion.div className="figp-stat" key={s.label} variants={revealChild}>
              <span className="figp-stat-value">
                <CountUp value={s.value} />
              </span>
              <span className="figp-stat-label">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      );

    case "statement":
      return <p className="figp-statement">{marked(block.text)}</p>;

    case "figure":
      return <Figure shot={block.shot} pin={pin} />;

    case "gallery":
      return (
        <figure className={`figp-gallery-fig${block.compact ? " figp-gallery-fig--compact" : ""}`}>
          <motion.div
            className={`figp-gallery${block.compact ? " figp-gallery--compact" : ""}`}
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((item) => (
              <motion.span className="figp-gallery-item" key={item.src} variants={revealChild}>
                <span
                  className="figp-gallery-frame"
                  data-figp-node={shotNodeName(item.src)}
                  data-figp-fill={`image:${item.src}`}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    {...dimsFor(item.src)}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </span>
                {item.label && <span className="figp-gallery-label">{item.label}</span>}
              </motion.span>
            ))}
          </motion.div>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "grid":
      return (
        <figure className="figp-grid-fig">
          <motion.div
            className="figp-grid"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((item) => (
              <motion.span
                className={`figp-grid-item${item.small ? " figp-grid-item--small" : ""}`}
                key={item.src}
                variants={revealChild}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  {...dimsFor(item.src)}
                  data-figp-node={shotNodeName(item.src)}
                  data-figp-fill={`image:${item.src}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                {item.label && <span className="figp-grid-label">{item.label}</span>}
              </motion.span>
            ))}
          </motion.div>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    /* an ordered list underneath, so a screen reader gets the sequence
       without having to interpret the arrows */
    case "flow":
      return (
        <figure className="figp-flow-fig">
          <motion.ol
            className="figp-flow"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.steps.map((step, i) => (
              <motion.li
                className={`figp-flow-step${step.decision ? " figp-flow-step--decision" : ""}`}
                key={step.label}
                variants={revealChild}
              >
                <span className="figp-flow-index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="figp-flow-label">{step.label}</span>
                {step.sub && (
                  <span className="figp-flow-sub">
                    {step.sub.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </span>
                )}
              </motion.li>
            ))}
          </motion.ol>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "compare":
      return (
        <figure className="figp-compare-fig">
          <div className="figp-compare">
            {block.lanes.map((lane) => (
              <div className={`figp-lane figp-lane--${lane.tone}`} key={lane.label}>
                <div className="figp-lane-head">
                  <span className="figp-lane-label">{lane.label}</span>
                  <span className="figp-lane-count">
                    <CountUp value={String(lane.steps.length)} />
                  </span>
                </div>
                {lane.note && <p className="figp-lane-note">{marked(lane.note)}</p>}
                <motion.ol
                  className="figp-lane-steps"
                  variants={revealParent}
                  initial="hidden"
                  whileInView="shown"
                  viewport={inView}
                >
                  {lane.steps.map((s) => (
                    <motion.li key={s} variants={revealChild}>
                      {s}
                    </motion.li>
                  ))}
                </motion.ol>
              </div>
            ))}
          </div>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "bars":
      return (
        <figure className="figp-bars-fig">
          <motion.dl
            className="figp-bars"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((b) => (
              <motion.div
                className={`figp-bar figp-bar--${b.tone ?? "bad"}`}
                key={b.label}
                variants={revealChild}
              >
                <dt>{b.label}</dt>
                <dd>
                  {/* the track is the remaining share, so the eye reads the
                      gap as much as the fill */}
                  <span className="figp-bar-track">
                    {/* scaleX rather than width: width relayouts every frame,
                        transform is composited */}
                    <motion.span
                      className="figp-bar-fill"
                      style={{ width: `${b.value}%`, transformOrigin: "left" }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={inView}
                      transition={{ type: "spring", bounce: 0, duration: 0.7, delay: 0.1 }}
                    />
                  </span>
                  <span className="figp-bar-value">
                    <CountUp value={b.display} />
                  </span>
                </dd>
              </motion.div>
            ))}
          </motion.dl>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "coverage":
      return (
        <figure className="figp-cover-fig">
          <motion.div
            className="figp-cover-grid"
            role="img"
            aria-label={`${block.filled} of ${block.total}: ${block.label}`}
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.018 } } }}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {Array.from({ length: block.total }, (_, i) => (
              <motion.span
                className={`figp-cell${i < block.filled ? " is-on" : ""}`}
                key={i}
                variants={{
                  hidden: { opacity: 0, scale: 0.7 },
                  shown: {
                    opacity: 1,
                    scale: 1,
                    transition: { type: "spring", bounce: 0, duration: 0.3 },
                  },
                }}
              />
            ))}
          </motion.div>
          <figcaption>
            <strong>
              <CountUp value={String(block.filled)} /> of <CountUp value={String(block.total)} />
            </strong>{" "}
            {block.label}
            {block.note && <span className="figp-cover-note">{block.note}</span>}
          </figcaption>
        </figure>
      );

    case "screens":
      return (
        <div className="figp-screens">
          {block.items.map((item) => (
            <motion.section
              className="figp-screen"
              key={item.src}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ type: "spring", bounce: 0, duration: 0.45 }}
            >
              <header className="figp-screen-head">
                <span className="figp-screen-step">{item.step}</span>
                <h3 className="figp-screen-title">{item.title}</h3>
                <p className="figp-screen-body">{marked(item.body)}</p>
              </header>
              <img
                src={item.src}
                alt={item.alt}
                {...dimsFor(item.src)}
                data-figp-node={shotNodeName(item.src)}
                data-figp-fill={`image:${item.src}`}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </motion.section>
          ))}
        </div>
      );

    case "wireframes":
      return (
        <figure className="figp-wires-fig">
          <motion.div
            className="figp-wires"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((item) => (
              <motion.div className="figp-wire" key={item.label} variants={revealChild}>
                <div className="figp-wire-art" aria-hidden="true">
                  <WireFrame layout={item.layout} />
                </div>
                <span className="figp-wire-label">{item.label}</span>
                <span className="figp-wire-note">{marked(item.note)}</span>
              </motion.div>
            ))}
          </motion.div>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "compare":
      return (
        <figure className="figp-compare-fig">
          <div className="figp-compare">
            {block.lanes.map((lane) => (
              <div className={`figp-lane figp-lane--${lane.tone}`} key={lane.label}>
                <div className="figp-lane-head">
                  <span className="figp-lane-label">{lane.label}</span>
                  <span className="figp-lane-count">{lane.steps.length}</span>
                </div>
                {lane.note && <p className="figp-lane-note">{lane.note}</p>}
                <ol className="figp-lane-steps">
                  {lane.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case "bars":
      return (
        <figure className="figp-bars-fig">
          <dl className="figp-bars">
            {block.items.map((b) => (
              <div className={`figp-bar figp-bar--${b.tone ?? "bad"}`} key={b.label}>
                <dt>{b.label}</dt>
                <dd>
                  {/* the track is the remaining share, so the eye reads the
                      gap as much as the fill */}
                  <span className="figp-bar-track">
                    <span className="figp-bar-fill" style={{ width: `${b.value}%` }} />
                  </span>
                  <span className="figp-bar-value">{b.display}</span>
                </dd>
              </div>
            ))}
          </dl>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case "coverage":
      return (
        <figure className="figp-cover-fig">
          <div
            className="figp-cover-grid"
            role="img"
            aria-label={`${block.filled} of ${block.total}: ${block.label}`}
          >
            {Array.from({ length: block.total }, (_, i) => (
              <span className={`figp-cell${i < block.filled ? " is-on" : ""}`} key={i} />
            ))}
          </div>
          <figcaption>
            <strong>
              {block.filled} of {block.total}
            </strong>{" "}
            {block.label}
            {block.note && <span className="figp-cover-note">{block.note}</span>}
          </figcaption>
        </figure>
      );

    case "screens":
      return (
        <div className="figp-screens">
          {block.items.map((item) => (
            <section className="figp-screen" key={item.src}>
              <header className="figp-screen-head">
                <span className="figp-screen-step">{item.step}</span>
                <h3 className="figp-screen-title">{item.title}</h3>
                <p className="figp-screen-body">{item.body}</p>
              </header>
              <img
                src={item.src}
                alt={item.alt}
                {...dimsFor(item.src)}
                data-figp-node={shotNodeName(item.src)}
                data-figp-fill={`image:${item.src}`}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </section>
          ))}
        </div>
      );

    case "specs":
      return (
        <dl className="figp-specs">
          {block.items.map((row) => (
            <div className="figp-spec" key={row.name}>
              <dt>{row.name}</dt>
              <dd>
                <span className="figp-spec-value">
                  {row.swatch && (
                    <span
                      className="figp-spec-swatch"
                      style={{ background: row.swatch }}
                      aria-hidden="true"
                    />
                  )}
                  {row.value}
                </span>
                {row.note && <span className="figp-spec-note">{row.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      );

    case "brief":
      return (
        <motion.dl
          className="figp-brief"
          variants={revealParent}
          initial="hidden"
          whileInView="shown"
          viewport={inView}
        >
          {block.items.map((item) => (
            <motion.div
              className={`figp-brief-card${item.wide ? " figp-brief-card--wide" : ""}`}
              key={item.label}
              variants={revealChild}
            >
              <dt>{item.label}</dt>
              <dd>{marked(item.body)}</dd>
            </motion.div>
          ))}
        </motion.dl>
      );

    case "step":
      return (
        <section className="figp-step">
          <motion.div
            className="figp-step-shots"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((item) => (
              <motion.span className="figp-step-shot" key={item.src} variants={revealChild}>
                <img
                  src={item.src}
                  alt={item.alt}
                  {...dimsFor(item.src)}
                  data-figp-node={shotNodeName(item.src)}
                  data-figp-fill={`image:${item.src}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                {item.label && <span className="figp-step-label">{item.label}</span>}
              </motion.span>
            ))}
          </motion.div>

          <div className="figp-step-body">
            {block.body.map((p) => (
              <p key={p}>{marked(p)}</p>
            ))}
          </div>
        </section>
      );

    case "decisions":
      return (
        <motion.ol
          className="figp-decisions"
          variants={revealParent}
          initial="hidden"
          whileInView="shown"
          viewport={inView}
        >
          {block.items.map((item, i) => (
            <motion.li className="figp-decision" key={item.label} variants={revealChild}>
              <span className="figp-decision-head">
                {/* watermark-scale: it orders the cards without competing
                    with the ruling for the reader's first look */}
                <span className="figp-decision-index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.tag && <span className="figp-decision-tag">{item.tag}</span>}
              </span>
              <h3 className="figp-decision-label">{marked(item.label)}</h3>
              <p className="figp-decision-body">{marked(item.body)}</p>
            </motion.li>
          ))}
        </motion.ol>
      );

    case "palette":
      return (
        <figure className="figp-palette-fig">
          <motion.div
            className="figp-palette"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((c) => (
              <motion.div className="figp-swatch" key={c.hex} variants={revealChild}>
                {/* the colour itself is the tile, and the hex rides inside
                    it, so the value and the thing it names never separate */}
                <span className="figp-swatch-chip" style={{ background: c.hex }}>
                  <span className="figp-swatch-hex">{c.hex}</span>
                </span>
                <span className="figp-swatch-name">{c.name}</span>
                <span className="figp-swatch-use">{c.use}</span>
              </motion.div>
            ))}
          </motion.div>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "typeset":
      return (
        <figure className="figp-typeset-fig">
          <motion.div
            className="figp-typeset"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((t) => (
              <motion.div className="figp-type" key={t.name} variants={revealChild}>
                <span className="figp-type-meta">
                  <span className="figp-type-role">{t.name}</span>
                  <span className="figp-type-family">{t.family}</span>
                </span>
                {/* set in the face it describes wherever the site can reach
                    it; the stack falls back rather than faking the shapes */}
                <span
                  className="figp-type-sample"
                  style={t.stack ? { fontFamily: t.stack } : undefined}
                >
                  {t.sample}
                </span>
                <span className="figp-type-use">{t.use}</span>
              </motion.div>
            ))}
          </motion.div>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "results":
      return (
        <figure className="figp-results-fig">
          <motion.div
            className="figp-results"
            variants={revealParent}
            initial="hidden"
            whileInView="shown"
            viewport={inView}
          >
            {block.items.map((r) => (
              <motion.div
                className={`figp-result${r.projected ? " figp-result--projected" : ""}`}
                key={r.label}
                variants={revealChild}
              >
                <span className="figp-result-value">
                  <CountUp value={r.value} />
                </span>
                <span className="figp-result-label">{r.label}</span>
                {r.note && <span className="figp-result-note">{r.note}</span>}
                {/* the provenance sits ON the number rather than in a
                    footnote — a projection printed at result size is the lie */}
                {r.projected && <span className="figp-result-flag">Projected, not measured</span>}
              </motion.div>
            ))}
          </motion.div>
          {block.caption && <figcaption>{marked(block.caption)}</figcaption>}
        </figure>
      );

    case "lessons":
      return (
        <motion.div
          className="figp-lessons"
          variants={revealParent}
          initial="hidden"
          whileInView="shown"
          viewport={inView}
        >
          {block.items.map((l, i) => (
            <motion.section className="figp-lesson" key={l.title} variants={revealChild}>
              <span className="figp-lesson-index" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="figp-lesson-title">{marked(l.title)}</h3>
              <p className="figp-lesson-body">{marked(l.body)}</p>
            </motion.section>
          ))}
        </motion.div>
      );
  }
}

/*
  Same markup as the flat gallery's frames. Inside a section the image is
  evidence for the paragraph above it rather than a headline of its own, so
  it sits inset by default and only goes full width when the shot asks.
*/
function Figure({ shot, pin }: { shot: ProjectShot; pin?: React.ReactNode }) {
  const src = isStripShot(shot) ? shot.strip[0] : shot.src;

  return (
    <figure
      className={`figp-shot figp-shot--in-section${
        shot.narrow ? " figp-shot--narrow" : shot.wide ? "" : " figp-shot--inset"
      }`}
      data-figp-node={shotNodeName(src)}
      data-figp-fill={`image:${src}`}
    >
      {pin}

      {isStripShot(shot) ? (
        <span className="figp-strip">
          {shot.strip.map((slice, si) => (
            <img
              key={slice}
              src={slice}
              alt={si === 0 ? shot.alt : ""}
              aria-hidden={si === 0 ? undefined : true}
              width={shot.sliceW}
              height={si === shot.strip.length - 1 ? shot.lastSliceH : shot.sliceH}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ))}
        </span>
      ) : (
        <img
          src={shot.src}
          alt={shot.alt}
          {...dimsFor(shot.src)}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}

      {shot.caption && <figcaption>{shot.caption}</figcaption>}
    </figure>
  );
}

/*
  The greyboxes. Every wireframe shares the same shell (sidebar, header,
  canvas) so the differences between them read as decisions rather than as
  four unrelated drawings. `b` is a generic block, `l` a text line.
*/
function WireFrame({ layout }: { layout: "entry" | "listen" | "chat" | "review" }) {
  return (
    <div className="wf">
      <div className="wf-rail">
        <span className="wf-b wf-b--pill" />
        <span className="wf-l" />
        <span className="wf-l wf-l--short" />
        <span className="wf-l wf-l--short" />
      </div>
      <div className="wf-main">
        <div className="wf-head">
          <span className="wf-b wf-b--sq" />
          <span className="wf-l wf-l--title" />
        </div>

        {layout === "entry" && (
          <div className="wf-body wf-body--center">
            <span className="wf-l wf-l--wide" />
            <span className="wf-mic" />
            <span className="wf-l wf-l--short" />
            <span className="wf-input" />
          </div>
        )}

        {layout === "listen" && (
          <div className="wf-body wf-body--center">
            <span className="wf-mic wf-mic--live" />
            <span className="wf-wave">
              {Array.from({ length: 14 }, (_, i) => (
                <i key={i} style={{ height: `${20 + ((i * 37) % 60)}%` }} />
              ))}
            </span>
            <span className="wf-l wf-l--short" />
          </div>
        )}

        {layout === "chat" && (
          <div className="wf-body">
            <span className="wf-bubble wf-bubble--me" />
            <span className="wf-bubble wf-bubble--bot" />
            <span className="wf-bubble wf-bubble--me wf-bubble--sm" />
            <span className="wf-input" />
          </div>
        )}

        {layout === "review" && (
          <div className="wf-body wf-body--center">
            <span className="wf-card">
              <i className="wf-tag" />
              <i className="wf-l" />
              <i className="wf-l wf-l--short" />
              <i className="wf-actions">
                <b />
                <b />
              </i>
            </span>
            <span className="wf-l wf-l--short" />
          </div>
        )}
      </div>
    </div>
  );
}

/*
  A number that counts up the first time it is scrolled to.

  Renders the final string on the server and on first paint, so there is no
  hydration mismatch and no-JS still reads correctly. It only drops to zero
  at the moment it enters view, which is also the moment its section is
  fading in, so the reset is never seen.

  Eases out rather than running linear: a linear counter reads like a
  loading spinner, an eased one reads like a value settling.
*/
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* find the first number inside strings like "20L+", "$5.71B", "60%" */
    const match = value.match(/-?[\d.,]+/);
    if (!match || match.index === undefined) return;
    const raw = match[0].replace(/,/g, "");
    const target = parseFloat(raw);
    if (!Number.isFinite(target)) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const decimals = (raw.split(".")[1] ?? "").length;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice(match.index + match[0].length);

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const started = performance.now();
        const run = (now: number) => {
          const p = Math.min(1, (now - started) / 900);
          const eased = 1 - Math.pow(1 - p, 3);
          setShown(prefix + (target * eased).toFixed(decimals) + suffix);
          if (p < 1) raf = requestAnimationFrame(run);
          /* land on the authored string, not a formatted approximation */
          else setShown(value);
        };
        raf = requestAnimationFrame(run);
      },
      { rootMargin: "0px 0px -12% 0px" }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{shown}</span>;
}

/*
  One reveal used by every staggered list on the page. Critically damped
  with no overshoot: these are arrivals, not throws, and bounce on something
  the user did not fling reads as decoration.
*/
const revealParent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06 } },
};

const revealChild = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, bounce: 0, duration: 0.42 },
  },
};

const inView = { once: true, margin: "-12%" } as const;

function shotNodeName(src: string) {
  return src.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") || "frame";
}

/* position of the first figure in the body, so the comment pin lands on a
   real frame however the sections are ordered */
function findFirstFigure(sections: ProjectSection[]) {
  for (let s = 0; s < sections.length; s++) {
    const b = sections[s].blocks.findIndex((block) => block.kind === "figure");
    if (b !== -1) return { s, b };
  }
  return null;
}

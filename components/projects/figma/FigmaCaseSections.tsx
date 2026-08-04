"use client";

import { motion } from "framer-motion";
import type { CaseBlock, ProjectSection, ProjectShot } from "@/components/projects/projectData";
import { isStripShot } from "@/components/projects/projectData";
import { dimsFor } from "@/components/projects/imageDims";

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
          data-figp-fill="var(--figp-body-text)"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <span className="figp-frame-label" aria-hidden="true">
            {section.name}
          </span>

          {section.heading && <h2 className="figp-section-head">{section.heading}</h2>}

          {section.blocks.map((block, i) => (
            <Block
              block={block}
              key={i}
              pin={firstFigure && firstFigure.s === si && firstFigure.b === i ? pin : undefined}
            />
          ))}
        </motion.section>
      ))}
    </div>
  );
}

function Block({ block, pin }: { block: CaseBlock; pin?: React.ReactNode }) {
  switch (block.kind) {
    case "prose":
      return (
        <div className="figp-prose">
          {block.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      );

    /* the label is generated from position rather than authored, so
       reordering the source array can never leave a stale 03 behind */
    case "numbered":
      return (
        <ol className="figp-numbered">
          {block.items.map((item, i) => (
            <li key={item.label}>
              <span className="figp-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="figp-num-body">
                <strong>{item.label}</strong>
                <span>{item.body}</span>
              </span>
            </li>
          ))}
        </ol>
      );

    case "stats":
      return (
        <div className="figp-stats">
          {block.items.map((s) => (
            <div className="figp-stat" key={s.label}>
              <span className="figp-stat-value">{s.value}</span>
              <span className="figp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      );

    case "statement":
      return <p className="figp-statement">{block.text}</p>;

    case "figure":
      return <Figure shot={block.shot} pin={pin} />;

    case "gallery":
      return (
        <figure className="figp-gallery-fig">
          <div className="figp-gallery">
            {block.items.map((item) => (
              <span className="figp-gallery-item" key={item.src}>
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
              </span>
            ))}
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case "grid":
      return (
        <figure className="figp-grid-fig">
          <div className="figp-grid">
            {block.items.map((item) => (
              <span className="figp-grid-item" key={item.src}>
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
              </span>
            ))}
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    /* an ordered list underneath, so a screen reader gets the sequence
       without having to interpret the arrows */
    case "flow":
      return (
        <figure className="figp-flow-fig">
          <ol className="figp-flow">
            {block.steps.map((step, i) => (
              <li
                className={`figp-flow-step${step.decision ? " figp-flow-step--decision" : ""}`}
                key={step.label}
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
              </li>
            ))}
          </ol>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
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

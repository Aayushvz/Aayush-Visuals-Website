"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageLink from "@/components/PageLink";
import type { Project } from "@/components/projects/projectData";
import { PROJECTS, isStripShot } from "@/components/projects/projectData";
import { readOrigin, armRestore, FALLBACK_ORIGIN } from "@/lib/navOrigin";
import FigmaTabBar from "./FigmaTabBar";
import FigmaLayersPanel from "./FigmaLayersPanel";
import FigmaPropertiesPanel from "./FigmaPropertiesPanel";
import FigmaCursorTag from "./FigmaCursorTag";
import FigmaDock from "./FigmaDock";
import FigmaShareDialog from "./FigmaShareDialog";
import FigmaCaseSections from "./FigmaCaseSections";
import CommentPin from "./CommentPin";
import "./figma-project.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const EMAIL = "mailto:aayushrajvz@gmail.com";
const CHROME_KEY = "figp:chrome";

/** layer name -> the id its anchor carries, so both sides can't drift */
export function layerId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/*
  A full page of the "design file": the tab bar, the Pages/Layers sidebar,
  the properties panel and the collaborator cursor all stay mounted here —
  this is the same app with a different page open, not a separate place.
  Only the canvas content (this project's case study) changes per project.
*/
export default function FigmaProjectPage({ project }: { project: Project }) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  /*
    Whether the two sidebars and the tab bar are showing. Starts true on both
    server and client — reading localStorage during render would either
    hydrate-mismatch or force everything below into a client-only tree, and
    the far more common case is a first-time visitor with nothing stored.
    The effect below corrects it a frame later for people who collapsed it.
  */
  const [chromeOn, setChromeOn] = useState(true);
  /** the layer row to highlight: whichever section is on screen */
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  /*
    Where "back" goes. Resolved after mount, not during render: it comes from
    sessionStorage, which doesn't exist on the server, and rendering a
    different href on the client than the server sent would be a hydration
    mismatch. Until it resolves, the control points at the fallback — which is
    also exactly what a direct visitor with no recorded origin should get.
  */
  const [backHref, setBackHref] = useState(FALLBACK_ORIGIN.path);

  useEffect(() => {
    const origin = readOrigin();
    if (origin) setBackHref(origin.path);
  }, []);

  /* arm the scroll restore as the click happens, so ScrollRestore can apply
     it once the destination lays out */
  const onBack = () => {
    armRestore();
  };

  const backLabel = backHref === "/" ? "Selected projects" : "Selected work";

  useEffect(() => {
    if (!layersOpen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setLayersOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [layersOpen]);

  /* the collapse survives moving between projects, the way Figma remembers */
  useEffect(() => {
    if (localStorage.getItem(CHROME_KEY) === "off") setChromeOn(false);
  }, []);

  const toggleChrome = () => {
    setChromeOn((on) => {
      localStorage.setItem(CHROME_KEY, on ? "off" : "on");
      return !on;
    });
  };

  /*
    Highlight whichever section is being read. The bottom margin shrinks the
    observed band to the top third of the viewport: without it, a tall
    section and the short one after it are both "intersecting" for thousands
    of pixels and the highlight flickers between them.
  */
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-figp-layer]"));
    if (!nodes.length) return;

    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.figpLayer;
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        /* document order decides, so scrolling into a section's tail doesn't
           hand the highlight to the one starting below it */
        const first = nodes.find((n) => n.dataset.figpLayer && visible.has(n.dataset.figpLayer));
        setActiveLayer(first?.dataset.figpLayer ?? null);
      },
      { rootMargin: "-56px 0px -68% 0px" }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [project.id]);

  /*
    Selecting a layer jumps, it does not glide. Two reasons: the page is
    ~29,000px, so smooth-scrolling from the top to "admin portal" is a
    ten-second animation nobody asked for, and Figma's own layer selection
    is instant. "instant" rather than "auto" is load-bearing — this site
    sets `scroll-behavior: smooth` globally, which "auto" inherits.
  */
  const goToLayer = (id: string) => {
    setLayersOpen(false);
    /* the cover is the page itself, not an element inside it */
    if (id === "cover") {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-figp-layer="${CSS.escape(id)}"]`);
    if (!el) return;
    /* clear the fixed tab bar, which only occupies space while chrome is on */
    const offset = chromeOn ? 60 : 24;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - offset,
      behavior: "instant",
    });
  };

  const fileLabel = `${project.id}.fig`;
  const ctaHref = previewHref(project);

  const facts: [string, string][] = [
    ["Role", project.role],
    ["Category", project.category],
    ["Year", project.year],
    ...(project.extraFacts ?? []),
  ];

  /* a long-form project puts its images inside the sections that argue for
     them, so the flat gallery stands down entirely */
  const sections = project.sections?.length ? project.sections : null;

  /* a project with a real gallery shows it; everything else still gets the
     single cover frame it had before */
  const shots = project.shots?.length
    ? project.shots
    : [{ src: project.cover, alt: project.title, caption: "", wide: true }];

  /* the Layers tree is the page's table of contents: the fixed blocks every
     project has, then one row per case-study section in scroll order */
  const layers: { icon: "image" | "text" | "component" | "frame"; name: string }[] = [
    { icon: "image", name: "cover" },
    { icon: "text", name: "summary" },
    { icon: "component", name: "facts" },
    ...(project.highlights.length ? [{ icon: "component" as const, name: "highlights" }] : []),
    ...(sections ?? []).map((s) => ({ icon: "frame" as const, name: s.name })),
  ];

  /*
    Pages, grouped the way the /work listing groups them: deep dives first,
    then the rest. Derived from the same two predicates worksData uses rather
    than a hand-kept list, so the sidebar can't drift from the real split.
    A project can be in both arrays (`alsoCaseStudy`), so the projects group
    subtracts the case studies to avoid listing it twice.
  */
  const caseStudies = PROJECTS.filter((p) => p.kind === "case-study" || p.alsoCaseStudy);
  const caseIds = new Set(caseStudies.map((p) => p.id));
  const pageGroups = [
    { label: "Case studies", items: caseStudies },
    {
      label: "Projects",
      items: PROJECTS.filter((p) => p.kind !== "case-study" && !caseIds.has(p.id)),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div
      className="figp"
      data-chrome={chromeOn ? "on" : "off"}
      style={
        project.accent
          ? ({
              "--figp-accent-dark": project.accent.dark,
              "--figp-accent-light": project.accent.light,
            } as React.CSSProperties)
          : undefined
      }
    >
      <FigmaCursorTag />
      <FigmaTabBar
        fileLabel={fileLabel}
        chromeOn={chromeOn}
        onToggleChrome={toggleChrome}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
        onShare={() => setShareOpen(true)}
        shareOpen={shareOpen}
        backHref={backHref}
        onBack={onBack}
      />
      <FigmaShareDialog
        project={project}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <FigmaLayersPanel
        activeId={project.id}
        pageGroups={pageGroups}
        fileLabel={fileLabel}
        layers={layers}
        activeLayer={activeLayer}
        onSelectLayer={goToLayer}
        open={layersOpen}
        onClose={() => setLayersOpen(false)}
        onCollapse={toggleChrome}
      />
      <FigmaPropertiesPanel name={fileLabel} width={1440} height={900} fillImage={project.cover} />

      {layersOpen && <div className="figp-scrim" onClick={() => setLayersOpen(false)} aria-hidden="true" />}

      <FigmaDock currentId={project.id} allProjects={PROJECTS} hidden={layersOpen} />

      <main className="figp-canvas">
        <article className="figp-page-body">
          {/* data-figp-node / data-figp-fill let the properties panel report
              whatever the cursor is over; names match the Layers tree above */}
          <motion.header
            className="figp-head"
            data-figp-node="summary"
            data-figp-layer="summary"
            data-figp-fill="var(--figp-body-text)"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <CommentPin
              number={1}
              variant="head"
              href={EMAIL}
              note="Open to new projects, say hello"
            />

            <PageLink className="figp-back" href={backHref} onClick={onBack}>
              <ArrowLeftIcon />
              {backLabel}
            </PageLink>

            <p className="figp-file" aria-hidden="true">
              {fileLabel}
            </p>
            <h1 className="figp-name">{project.title}</h1>
            <p className="figp-what">
              {project.category} · {project.year}
            </p>
            <p className="figp-summary">{project.description}</p>

            <dl
              className="figp-facts"
              data-figp-node="facts"
              data-figp-layer="facts"
              data-figp-fill="var(--figp-fact-value)"
            >
              {facts.map(([k, v]) => (
                <div className="figp-fact" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div className="figp-fact">
                <dt>Tools</dt>
                <dd>
                  <span className="figp-toolchips">
                    {project.tools.map((t) => (
                      <span className="figp-toolchip" key={t}>
                        {t}
                      </span>
                    ))}
                  </span>
                </dd>
              </div>
            </dl>

            <a className="figp-ext" href={ctaHref} target="_blank" rel="noreferrer">
              {project.cta}
              <ArrowUpRightIcon />
            </a>
          </motion.header>

          {project.highlights.length > 0 && (
            <div
              className="figp-highlights"
              data-figp-node="highlights"
              data-figp-layer="highlights"
              data-figp-fill="var(--figp-body-text)"
            >
              <span className="figp-highlights-label">Highlights</span>
              <ul>
                {project.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          {sections ? (
            <FigmaCaseSections
              sections={sections}
              pin={
                <CommentPin
                  number={2}
                  variant="shot"
                  href={ctaHref}
                  external
                  note={`Built with ${project.tools.join(", ")}`}
                />
              }
            />
          ) : (
          <div className="figp-shots">
            {shots.map((shot, i) => (
              <motion.figure
                className={`figp-shot${shot.wide ? "" : " figp-shot--inset"}`}
                key={isStripShot(shot) ? shot.strip[0] : shot.src}
                data-figp-node={shotNodeName(
                  isStripShot(shot) ? shot.strip[0] : shot.src,
                  i
                )}
                data-figp-fill={`image:${isStripShot(shot) ? shot.strip[0] : shot.src}`}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: EASE }}
              >
                {/* the pin belongs on the first frame only — one comment per
                    page, the way a real file would carry it */}
                {i === 0 && (
                  <CommentPin
                    number={2}
                    variant="shot"
                    href={ctaHref}
                    external
                    note={`Built with ${project.tools.join(", ")}`}
                  />
                )}

                {isStripShot(shot) ? (
                  /* one tall export, stacked back together. width/height on
                     each slice reserve the exact box up front so the page
                     doesn't jump as eighteen lazy images land. */
                  <span className="figp-strip">
                    {shot.strip.map((src, si) => (
                      <img
                        key={src}
                        src={src}
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
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                )}

                {shot.caption && <figcaption>{shot.caption}</figcaption>}
              </motion.figure>
            ))}
          </div>
          )}
        </article>
      </main>
    </div>
  );
}

/* layer name for a gallery frame: the file's own basename reads like a real
   layer ("hero", "brand"), falling back to a numbered frame */
function shotNodeName(src: string, i: number) {
  const base = src.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "");
  return base || `frame ${i + 1}`;
}

function previewHref(project: Project) {
  const p = project.preview;
  switch (p.kind) {
    case "behance":
    case "website":
    case "page":
      return p.href;
    case "image":
    case "video":
      return p.href ?? "#";
    default:
      return "#";
  }
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M12.5 8h-9m0 0 4-4m-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

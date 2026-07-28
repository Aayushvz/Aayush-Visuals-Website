"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import PageLink from "@/components/PageLink";
import type { Project } from "@/components/projects/projectData";
import { PROJECTS } from "@/components/projects/projectData";
import FigmaTabBar from "./FigmaTabBar";
import FigmaLayersPanel from "./FigmaLayersPanel";
import FigmaPropertiesPanel from "./FigmaPropertiesPanel";
import FigmaCursorTag from "./FigmaCursorTag";
import FigmaDock from "./FigmaDock";
import CommentPin from "./CommentPin";
import "./figma-project.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const EMAIL = "mailto:aayushrajvz@gmail.com";

/*
  A full page of the "design file": the tab bar, the Pages/Layers sidebar,
  the properties panel and the collaborator cursor all stay mounted here —
  this is the same app with a different page open, not a separate place.
  Only the canvas content (this project's case study) changes per project.
*/
export default function FigmaProjectPage({ project }: { project: Project }) {
  const [layersOpen, setLayersOpen] = useState(false);

  useEffect(() => {
    if (!layersOpen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setLayersOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [layersOpen]);

  const fileLabel = `${project.id}.fig`;
  const ctaHref = previewHref(project);

  const facts: [string, string][] = [
    ["Role", project.role],
    ["Category", project.category],
    ["Year", project.year],
  ];

  const layers: { icon: "image" | "text" | "component"; name: string }[] = [
    { icon: "image", name: "cover" },
    { icon: "text", name: "summary" },
    { icon: "component", name: "facts" },
    ...(project.highlights.length ? [{ icon: "component" as const, name: "highlights" }] : []),
  ];

  return (
    <div className="figp">
      <FigmaCursorTag />
      <FigmaTabBar
        fileLabel={fileLabel}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
      />
      <FigmaLayersPanel
        activeId={project.id}
        allProjects={PROJECTS}
        fileLabel={fileLabel}
        layers={layers}
        open={layersOpen}
        onClose={() => setLayersOpen(false)}
      />
      <FigmaPropertiesPanel name={fileLabel} width={1440} height={900} fillImage={project.cover} />

      {layersOpen && <div className="figp-scrim" onClick={() => setLayersOpen(false)} aria-hidden="true" />}

      <FigmaDock currentId={project.id} allProjects={PROJECTS} hidden={layersOpen} />

      <main className="figp-canvas">
        <article className="figp-page-body">
          <motion.header
            className="figp-head"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <CommentPin
              number={1}
              variant="head"
              href={EMAIL}
              note="Open to new projects — say hello"
            />

            <PageLink className="figp-back" href="/work">
              <ArrowLeftIcon />
              Selected work
            </PageLink>

            <p className="figp-file" aria-hidden="true">
              {fileLabel}
            </p>
            <h1 className="figp-name">{project.title}</h1>
            <p className="figp-what">
              {project.category} · {project.year}
            </p>
            <p className="figp-summary">{project.description}</p>

            <dl className="figp-facts">
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
            <div className="figp-highlights">
              <span className="figp-highlights-label">Highlights</span>
              <ul>
                {project.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="figp-shots">
            <motion.figure
              className="figp-shot"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <CommentPin
                number={2}
                variant="shot"
                href={ctaHref}
                external
                note={`Built with ${project.tools.join(", ")}`}
              />
              <img src={project.cover} alt={project.title} loading="lazy" decoding="async" draggable={false} />
            </motion.figure>
          </div>
        </article>
      </main>
    </div>
  );
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

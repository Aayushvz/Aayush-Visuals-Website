"use client";

import PageLink from "@/components/PageLink";
import type { Project } from "@/components/projects/projectData";

/*
  The left sidebar: Figma's own Pages list (every case study is a page of
  this one file, the current one checked) and a Layers tree listing this
  page's content blocks. Same panel that would anchor a whole "design world"
  home page, scaled down to just what one project page needs.
*/
const ICONS = {
  frame: (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4 1v10M8 1v10M1 4h10M1 8h10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 3h7M6 3v6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="4.4" cy="4.5" r="0.9" fill="currentColor" />
      <path
        d="M2.5 9l2.3-2.3 1.8 1.8L9 6l1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  component: (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.4L10.6 6L6 10.6L1.4 6Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.5l2.4 2.4L9.7 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

type Layer = { icon: keyof typeof ICONS; name: string };

type Props = {
  activeId: string;
  allProjects: Project[];
  fileLabel: string;
  layers: Layer[];
  open: boolean;
  onClose: () => void;
};

export default function FigmaLayersPanel({ activeId, allProjects, fileLabel, layers, open, onClose }: Props) {
  return (
    <aside className={`figp-layers${open ? " is-open" : ""}`} id="figp-layers" aria-label="Pages and layers">
      <button type="button" className="figp-grab" onClick={onClose} aria-label="Close layers">
        <span aria-hidden="true" />
      </button>

      <div className="figp-lfile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/av%20logo%20png.png" alt="" aria-hidden="true" height={13} draggable={false} />
        <span>aayush &middot; portfolio</span>
      </div>

      <p className="figp-label">Pages</p>
      <div className="figp-pages">
        <PageLink className="figp-page" href="/work" onClick={onClose}>
          <span className="figp-page-check" />
          Selected work
        </PageLink>
        {allProjects.map((p) => {
          const current = p.id === activeId;
          return (
            <PageLink key={p.id} className={`figp-page${current ? " is-current" : ""}`} href={`/work/${p.id}`} onClick={onClose}>
              <span className="figp-page-check">{current && ICONS.check}</span>
              {p.id}
            </PageLink>
          );
        })}
      </div>

      <div className="figp-div" aria-hidden="true" />

      <p className="figp-label">Layers</p>
      <div className="figp-tree">
        <div className="figp-row">
          <span className="figp-row-glyph">{ICONS.frame}</span>
          <span className="figp-row-name">{fileLabel}</span>
        </div>
        {layers.map((l) => (
          <div className="figp-row figp-row--child" key={l.name}>
            <span className="figp-row-glyph">{ICONS[l.icon]}</span>
            <span className="figp-row-name">{l.name}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

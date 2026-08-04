"use client";

import PageLink from "@/components/PageLink";
import type { Project } from "@/components/projects/projectData";
import { layerId } from "./FigmaProjectPage";

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
  /* Figma's own show/hide panels glyph: a rounded frame with one side filled */
  panel: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.75" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.25 3v10" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.4 3.4h3.2v9.2H2.4z" fill="currentColor" fillOpacity="0.55" />
    </svg>
  ),
};

type Layer = { icon: keyof typeof ICONS; name: string };

type Props = {
  activeId: string;
  /** pages split into Case studies / Projects, in the order they render */
  pageGroups: { label: string; items: Project[] }[];
  fileLabel: string;
  layers: Layer[];
  /** the layer whose section is currently on screen */
  activeLayer: string | null;
  onSelectLayer: (id: string) => void;
  open: boolean;
  onClose: () => void;
  /** hides both sidebars and the tab bar (desktop) */
  onCollapse: () => void;
};

export default function FigmaLayersPanel({
  activeId,
  pageGroups,
  fileLabel,
  layers,
  activeLayer,
  onSelectLayer,
  open,
  onClose,
  onCollapse,
}: Props) {
  return (
    <aside className={`figp-layers${open ? " is-open" : ""}`} id="figp-layers" aria-label="Pages and layers">
      <button type="button" className="figp-grab" onClick={onClose} aria-label="Close layers">
        <span aria-hidden="true" />
      </button>

      <div className="figp-lfile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/av-logo.webp" alt="" aria-hidden="true" height={13} draggable={false} />
        <span>aayush &middot; portfolio</span>
        <button
          type="button"
          className="figp-collapse"
          onClick={onCollapse}
          aria-label="Hide panels"
          title="Hide panels"
        >
          {ICONS.panel}
        </button>
      </div>

      <div className="figp-lscroll">
        <p className="figp-label">Pages</p>
        <div className="figp-pages">
          <PageLink className="figp-page figp-page--index" href="/work" onClick={onClose}>
            <span className="figp-page-check" />
            Selected work
          </PageLink>
        </div>

        {pageGroups.map((group) => (
          <div className="figp-pgroup" key={group.label}>
            <p className="figp-glabel">{group.label}</p>
            <div className="figp-pages">
              {group.items.map((p) => {
                const current = p.id === activeId;
                return (
                  <PageLink
                    key={p.id}
                    className={`figp-page${current ? " is-current" : ""}`}
                    href={`/work/${p.id}`}
                    onClick={onClose}
                  >
                    <span className="figp-page-check">{current && ICONS.check}</span>
                    {p.id}
                  </PageLink>
                );
              })}
            </div>
          </div>
        ))}

        <div className="figp-div" aria-hidden="true" />

        <p className="figp-label">Layers</p>
        <div className="figp-tree">
          <div className="figp-row">
            <span className="figp-row-glyph">{ICONS.frame}</span>
            <span className="figp-row-name">{fileLabel}</span>
          </div>
          {layers.map((l) => {
            const id = layerId(l.name);
            const current = activeLayer === id;
            return (
              /* a button, not a link: these move you within the page you are
                 already on, so there is no href that would mean anything */
              <button
                type="button"
                className={`figp-row figp-row--child figp-row--btn${current ? " is-active" : ""}`}
                key={l.name}
                onClick={() => onSelectLayer(id)}
                aria-current={current ? "true" : undefined}
              >
                <span className="figp-row-glyph">{ICONS[l.icon]}</span>
                <span className="figp-row-name">{l.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

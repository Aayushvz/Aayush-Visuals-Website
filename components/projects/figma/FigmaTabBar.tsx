"use client";

import PageLink from "@/components/PageLink";

/*
  The file's title bar: a home badge, the one open file tab, a close ×
  (desktop) — or, under 769px, the Figma mobile toolbar: home, file name,
  a Layers button that pulls the layers panel up as a bottom sheet, and a
  close control. Same two wayfinding gestures either width: the badge
  always goes home, the × always goes back to the work grid.
*/
type Props = {
  fileLabel: string;
  layersOpen: boolean;
  onToggleLayers: () => void;
};

export default function FigmaTabBar({ fileLabel, layersOpen, onToggleLayers }: Props) {
  return (
    <>
      <nav className="figp-tabbar" aria-label="Open file">
        <PageLink className="figp-home" href="/" aria-label="Aayush Raj — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/av%20logo%20png.png" alt="Aayush Visuals" draggable={false} />
        </PageLink>

        <span className="figp-tab" aria-current="page">
          <FigmaMark className="figp-tab-icon" />
          <span>{fileLabel}</span>
        </span>

        <PageLink className="figp-close" href="/work" aria-label="Close and return to Work">
          <CloseIcon />
        </PageLink>
      </nav>

      <header className="figp-mtop">
        <PageLink className="figp-mmark" href="/" aria-label="Aayush Raj — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/av%20logo%20png.png" alt="Aayush Visuals" draggable={false} />
        </PageLink>

        <span className="figp-mfile">
          <FigmaMark />
          {fileLabel}
        </span>

        <button
          type="button"
          className={`figp-mlayers${layersOpen ? " is-on" : ""}`}
          onClick={onToggleLayers}
          aria-expanded={layersOpen}
          aria-controls="figp-layers"
        >
          <LayersIcon />
          Layers
        </button>

        <PageLink className="figp-mclose" href="/work" aria-label="Close and return to Work">
          <CloseIcon />
        </PageLink>
      </header>
    </>
  );
}

function FigmaMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 18" fill="none" aria-hidden="true">
      <path
        d="M4 1a3 3 0 1 0 0 6h2V1H4Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <path d="M6 7H4a3 3 0 1 0 3 3V7Z" fill="currentColor" fillOpacity="0.75" />
      <path d="M8 1H6v6h2a3 3 0 1 0 0-6Z" fill="currentColor" />
      <path d="M8 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="currentColor" fillOpacity="0.85" />
      <path d="M4 10a3 3 0 1 0 3 3v-3H4Z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M3.5 3.5l7 7M10.5 3.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="M8 2.5 2.5 5.5 8 8.5l5.5-3L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 8.2 8 11.2l5.5-3M2.5 10.8 8 13.8l5.5-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

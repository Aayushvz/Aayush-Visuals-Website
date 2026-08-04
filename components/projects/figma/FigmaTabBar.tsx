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
  onShare: () => void;
  shareOpen: boolean;
  /** where closing the file returns to — the listing it was opened from */
  backHref: string;
  onBack: () => void;
};

export default function FigmaTabBar({
  fileLabel,
  layersOpen,
  onToggleLayers,
  onShare,
  shareOpen,
  backHref,
  onBack,
}: Props) {
  return (
    <>
      <nav className="figp-tabbar" aria-label="Open file">
        <PageLink className="figp-home" href="/" aria-label="Aayush Raj — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/av-logo.webp" alt="Aayush Visuals" draggable={false} />
        </PageLink>

        <span className="figp-tab" aria-current="page">
          <FigmaMark className="figp-tab-icon" />
          <span>{fileLabel}</span>
        </span>

        {/* top-right, ahead of the close — where Figma puts Share */}
        <button
          type="button"
          className={`figp-share-btn${shareOpen ? " is-on" : ""}`}
          onClick={onShare}
          aria-haspopup="dialog"
          aria-expanded={shareOpen}
        >
          Share
        </button>

        <PageLink
          className="figp-close"
          href={backHref}
          onClick={onBack}
          aria-label="Close and return to the project list"
        >
          <CloseIcon />
        </PageLink>
      </nav>

      <header className="figp-mtop">
        <PageLink className="figp-mmark" href="/" aria-label="Aayush Raj — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/av-logo.webp" alt="Aayush Visuals" draggable={false} />
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

        <button
          type="button"
          className={`figp-share-btn figp-share-btn--m${shareOpen ? " is-on" : ""}`}
          onClick={onShare}
          aria-haspopup="dialog"
          aria-expanded={shareOpen}
        >
          Share
        </button>

        <PageLink
          className="figp-mclose"
          href={backHref}
          onClick={onBack}
          aria-label="Close and return to the project list"
        >
          <CloseIcon />
        </PageLink>
      </header>
    </>
  );
}

/* The Figma mark, monochrome: the real five-shape geometry on a 38x57 grid
   (the previous hand-drawn 12x18 version read as a blob at small sizes), but
   tinted with currentColor so it sits in the chrome rather than shouting in
   brand colour. The five shapes tile edge-to-edge, so they're separated by
   opacity — flat single-opacity fill would collapse into one silhouette. */
function FigmaMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 38 57" fill="none" aria-hidden="true">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0Z" fill="currentColor" fillOpacity="0.45" />
      <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" fill="currentColor" fillOpacity="0.72" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="currentColor" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="currentColor" fillOpacity="0.6" />
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

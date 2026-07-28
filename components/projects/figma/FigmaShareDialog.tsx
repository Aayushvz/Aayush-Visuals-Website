"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "@/components/projects/projectData";

/*
  Figma's "Share this file" dialog, with the access rows telling the truth for
  a portfolio: anyone with the link can VIEW — nobody is editing a case study.

  Every row in the lower panel points at something real (Behance gallery,
  repo, the live product, an embed snippet) rather than sitting there as set
  dressing. Styling comes off the existing --figp-* tokens, so it themes with
  the rest of the page instead of hardcoding the dark greys of the reference.

  Modal behaviour mirrors components/projects/ProjectModal.tsx: portal to
  body, Escape to close, focus trap, backdrop click, focus restored on close.
*/

const BEHANCE_PROFILE = "https://www.behance.net/AAYUSHVISUALS";
const REPO = "https://github.com/Aayushvz";
const OWNER = "Aayush";

type Props = {
  project: Project;
  open: boolean;
  onClose: () => void;
};

export default function FigmaShareDialog({ project, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  /* which row last copied, so it can show "Copied" briefly */
  const [copied, setCopied] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(t);
      setCopied(null);
      lastFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  const pageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/work/${project.id}`
      : `/work/${project.id}`;

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // clipboard blocked (insecure origin / denied) — stay silent
    }
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    setCopied(key);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1600);
  };

  /* the project's own Behance gallery when it has one, else the profile */
  const community =
    project.preview.kind === "behance" ? project.preview.href : BEHANCE_PROFILE;
  const live = livePreviewHref(project);
  const embed = `<iframe src="${pageUrl}" width="100%" height="720" style="border:0" title="${project.title} — case study"></iframe>`;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="figp-share-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="figp-share"
            role="dialog"
            aria-modal="true"
            aria-labelledby="figp-share-title"
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="figp-share-card">
              <header className="figp-share-head">
                <h2 className="figp-share-title" id="figp-share-title">
                  Share this file
                </h2>

                <button
                  type="button"
                  className="figp-share-copy"
                  onClick={() => copy("link", pageUrl)}
                >
                  <LinkIcon />
                  {copied === "link" ? "Copied" : "Copy link"}
                </button>

                <button
                  type="button"
                  className="figp-share-x"
                  onClick={onClose}
                  ref={closeRef}
                  aria-label="Close share dialog"
                >
                  <CloseIcon />
                </button>
              </header>

              <div className="figp-share-body">
                <p className="figp-share-label">Who has access</p>

                <div className="figp-share-row">
                  <span className="figp-share-globe" aria-hidden="true">
                    <GlobeIcon />
                  </span>
                  <span className="figp-share-who">Anyone</span>
                  <span className="figp-share-perm">can view</span>
                </div>

                <div className="figp-share-row">
                  <span className="figp-share-avatar" aria-hidden="true">
                    {OWNER.charAt(0)}
                  </span>
                  <span className="figp-share-who">{OWNER}</span>
                  <span className="figp-share-perm">owner</span>
                </div>
              </div>
            </div>

            <div className="figp-share-card figp-share-card--menu">
              <a
                className="figp-share-item"
                href={community}
                target="_blank"
                rel="noreferrer"
              >
                <CommunityIcon />
                <span>Publish to Community</span>
                <ChevronIcon />
              </a>

              <button
                type="button"
                className="figp-share-item"
                onClick={() => copy("dev", REPO)}
              >
                <CodeIcon />
                <span>{copied === "dev" ? "Copied" : "Copy Dev Mode link"}</span>
              </button>

              <button
                type="button"
                className="figp-share-item"
                onClick={() => copy("proto", live)}
              >
                <PlayIcon />
                <span>{copied === "proto" ? "Copied" : "Copy prototype link"}</span>
                {/* the reference carries a settings glyph on this row; the whole
                    row is the control, so it's decoration only */}
                <GearIcon />
              </button>

              <button
                type="button"
                className="figp-share-item"
                onClick={() => copy("embed", embed)}
              >
                <EmbedIcon />
                <span>{copied === "embed" ? "Copied" : "Get embed code"}</span>
                <ChevronIcon />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function livePreviewHref(project: Project) {
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

function LinkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <path
        d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.1-2.1a2.6 2.6 0 1 0-3.7-3.7l-.9.9M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.6 8.7a2.6 2.6 0 1 0 3.7 3.7l.9-.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.4 8h11.2M8 2a10 10 0 0 1 0 12A10 10 0 0 1 8 2Z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="figp-share-chev" viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg className="figp-share-chev" viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1.6v1.6M8 12.8v1.6M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6 3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M8 1.8 14 5v6l-6 3.2L2 11V5l6-3.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M2 5l6 3.2L14 5M8 8.2v6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M4.5 2.8 12.6 8l-8.1 5.2V2.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function EmbedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <rect x="1.8" y="3" width="12.4" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.2 7 4.6 8.6l1.6 1.6M9.8 7l1.6 1.6-1.6 1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

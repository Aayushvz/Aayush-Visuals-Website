"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "./projectData";
import ProjectPreview from "./ProjectPreview";
import CTAButton from "./CTAButton";

/*
  Fully data-driven project modal — reusable for any preview kind so this
  can later grow into a full case-study system without a rewrite. Renders
  via a portal to <body> so it sits above the fixed rails/navbar, traps
  focus, closes on Escape or an outside click, and locks page scroll while
  open. The Behance iframe (or any embed) only mounts once the modal has
  fully opened.
*/

type Props = {
  project: Project | null;
  onClose: () => void;
};

export default function ProjectModal({ project, onClose }: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [embedMounted, setEmbedMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!project) {
      setEmbedMounted(false);
      return;
    }
    lastFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      closeRef.current?.focus();
      setEmbedMounted(true);
    }, 350);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
      lastFocused.current?.focus?.();
    };
  }, [project]);

  useEffect(() => {
    if (!project) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
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
  }, [project, onClose]);

  if (!portalReady) return null;

  return createPortal(
    <AnimatePresence>
      {project && (
        <motion.div
          className="projModal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="projModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="projModal__title"
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="projModal__nav">
              <span className="projModal__navLogo">
                aayush<sup>vz</sup>
              </span>
              <div className="projModal__navActions">
                <CTAButton
                  variant="solid"
                  href={previewHref(project)}
                  icon={<ArrowIcon />}
                  className="projModal__navCta"
                >
                  {project.cta}
                </CTAButton>
                <button
                  type="button"
                  className="projModal__close"
                  onClick={onClose}
                  ref={closeRef}
                  aria-label="Close project"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="projModal__preview">
              <ProjectPreview
                preview={project.preview}
                title={project.title}
                mounted={embedMounted}
              />
            </div>

            <div className="projModal__body">
              <div className="projModal__heading">
                <h3 id="projModal__title" className="display projModal__title">
                  {project.title}
                </h3>
                <span className="projModal__tag">
                  {project.category} · {project.year}
                </span>
              </div>

              <p className="projModal__desc">{project.description}</p>

              <dl className="projModal__facts">
                <div>
                  <dt>Role</dt>
                  <dd>{project.role}</dd>
                </div>
                <div>
                  <dt>Tools</dt>
                  <dd>{project.tools.join(", ")}</dd>
                </div>
              </dl>

              <div className="projModal__highlights">
                <span className="projModal__highlightsLabel">Highlights</span>
                <ul>
                  {project.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
      <path
        d="M3.5 8h9m0 0L8.5 4M12.5 8 8.5 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

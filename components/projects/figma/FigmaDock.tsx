"use client";

import { useEffect, useState } from "react";
import PageLink from "@/components/PageLink";
import { SunIcon, MoonIcon } from "@/components/icons";
import type { Project } from "@/components/projects/projectData";

/*
  The floating bottom dock — this page's only way out to the rest of the
  site (Home / About / Work / Contact) plus previous/next case study and
  the light/dark switch. It shares the site's own html[data-theme] toggle
  (see ThemeToggle.tsx) rather than keeping a separate preference, so
  flipping it here is remembered everywhere else too. Hides while the
  mobile Layers sheet is open so the two floating surfaces never collide
  at the bottom edge.
*/
type Props = {
  currentId: string;
  allProjects: Project[];
  hidden: boolean;
};

export default function FigmaDock({ currentId, allProjects, hidden }: Props) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  /*
    Watch the attribute rather than reading it once. The case-study page can
    set the theme itself (see FigmaProjectPage), and a child's mount effect
    runs before its parent's — so a single read on mount would show the
    wrong icon until the next toggle.
  */
  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  const idx = allProjects.findIndex((p) => p.id === currentId);
  const prev = allProjects[(idx - 1 + allProjects.length) % allProjects.length];
  const next = allProjects[(idx + 1) % allProjects.length];

  return (
    <div className={`figp-dock-wrap${hidden ? " is-hidden" : ""}`} aria-hidden={hidden}>
      <nav className="figp-dock" aria-label="Site and project navigation">
        <PageLink className="figp-dock-item" href={`/work/${prev.id}`} aria-label={`Previous project — ${prev.title}`}>
          <PrevIcon />
        </PageLink>

        <span className="figp-dock-sep" aria-hidden="true" />

        <PageLink className="figp-dock-item" href="/" aria-label="Home">
          <HomeIcon />
        </PageLink>
        <PageLink className="figp-dock-item" href="/about" aria-label="About">
          <AboutIcon />
        </PageLink>
        <PageLink className="figp-dock-item is-current" href="/work" aria-label="Work" aria-current="page">
          <WorkIcon />
          <span className="figp-dock-item-dot" aria-hidden="true" />
        </PageLink>
        <PageLink className="figp-dock-item" href="/contact" aria-label="Contact">
          <ContactIcon />
        </PageLink>

        <span className="figp-dock-sep" aria-hidden="true" />

        <button
          type="button"
          className="figp-dock-item"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>

        <span className="figp-dock-sep" aria-hidden="true" />

        <PageLink className="figp-dock-item" href={`/work/${next.id}`} aria-label={`Next project — ${next.title}`}>
          <NextIcon />
        </PageLink>
      </nav>
    </div>
  );
}

function PrevIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.2 8 2.8l5.5 4.4V13a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8V7.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.2 13.8V9.4h3.6v4.4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function AboutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.2" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.8 13.4c.6-2.6 2.6-4 5.2-4s4.6 1.4 5.2 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="2" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="9" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.8" y="3.2" width="12.4" height="9.6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.4 4 8 8.6 13.6 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

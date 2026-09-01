"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import PageLink from "./PageLink";
import useSurfaceTone from "./useSurfaceTone";
import LogoMark from "./LogoMark";
import ThemeToggle from "./ThemeToggle";

/*
  Glass pill navbar, route-aware: HOME, ABOUT and WORKS are real pages (the
  purple aria-current state follows the pathname), CONTACT is its own page too.
  Navigation between pages goes through PageLink's cinematic transition. The
  bar is a light, low-radius glass panel that sits flush with the page rather
  than floating over it. It keeps one surface tone across every section (no
  dark/light flip) for a consistent look across all screens and themes.
*/

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/work" },
  { label: "Experiments", href: "/playground" },
];

export default function Navbar() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const overLight = useSurfaceTone(ref, pathname) === "light";

  /*
    Surface-aware tone.

    The bar is translucent and sits flush with the page, which only works if it
    takes the tone of whatever it happens to be over: dark glass on the hero,
    light glass on the cream sections. It used to be pinned to the dark variant
    on every page, which is why it read as an object dropped onto the light
    ones rather than part of them.

    What is behind is read rather than declared, so no section has to know the
    navbar exists: sample the elements under the bar's own centre, skip the bar
    itself, and take the first one actually painting something. Gradients are
    included, since the panels that matter most here (the hero, the Skills
    scene) paint with a gradient and have no background-color at all.
  */
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  return (
    <header
      ref={ref}
      className={`navbar ${overLight ? "navbar--overLight" : "navbar--overDark"}`}
    >
      {/* the mark carries no text, so the link needs its own accessible name */}
      <PageLink href="/" className="navbar__logo" aria-label="aayush vz, home">
        <LogoMark className="navbar__logoMark" />
      </PageLink>
      <nav className="navbar__links" aria-label="Primary">
        {navLinks.map((l) => (
          <PageLink
            key={l.href}
            href={l.href}
            aria-current={isCurrent(l.href) ? "page" : undefined}
          >
            {l.label}
          </PageLink>
        ))}
      </nav>
      <div className="navbar__actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ThemeToggle />
        <PageLink href="/contact" className="navbar__contact">
          Contact
        </PageLink>
      </div>
    </header>
  );
}

"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import PageLink from "./PageLink";
import useSurfaceTone from "./useSurfaceTone";

/*
  Same glass pill, now route-aware: HOME and ABOUT are real pages (the
  purple aria-current state follows the pathname), WORKS and CONTACT
  remain homepage anchors that also work from subpages via /#hash.
  Navigation between pages goes through PageLink's cinematic transition.
  The pill also samples the section beneath it while scrolling and flips
  between light and dark chrome to match.
*/

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Works", href: "/#work" },
];

export default function Navbar() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const tone = useSurfaceTone(ref, pathname);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  return (
    <header className={`navbar navbar--over${tone === "light" ? "Light" : "Dark"}`} ref={ref}>
      <PageLink href="/" className="navbar__logo">
        aayush<sup>vz</sup>
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
      <PageLink href="/contact" className="navbar__contact">
        Contact
      </PageLink>
    </header>
  );
}

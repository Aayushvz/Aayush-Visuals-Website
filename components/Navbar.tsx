"use client";

import { usePathname } from "next/navigation";
import PageLink from "./PageLink";
import ThemeToggle from "./ThemeToggle";

/*
  Glass pill navbar, route-aware: HOME, ABOUT and WORKS are real pages (the
  purple aria-current state follows the pathname), CONTACT is its own page too.
  Navigation between pages goes through PageLink's cinematic transition. The
  pill stays on the black/dark glass chrome over every section (no surface-tone
  flip) for a consistent look across all screens and themes.
*/

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Works", href: "/work" },
  { label: "Playground", href: "/playground" },
];

export default function Navbar() {
  const pathname = usePathname();

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  return (
    <header className="navbar navbar--overDark">
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
      <div className="navbar__actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ThemeToggle />
        <PageLink href="/contact" className="navbar__contact">
          Contact
        </PageLink>
      </div>
    </header>
  );
}

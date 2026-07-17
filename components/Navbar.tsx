"use client";

import { usePathname } from "next/navigation";
import PageLink from "./PageLink";

/*
  Same glass pill, now route-aware: HOME and ABOUT are real pages (the
  purple aria-current state follows the pathname), WORKS and CONTACT
  remain homepage anchors that also work from subpages via /#hash.
  Navigation between pages goes through PageLink's cinematic transition.
*/

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Works", href: "/#work" },
];

export default function Navbar() {
  const pathname = usePathname();

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  return (
    <header className="navbar">
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

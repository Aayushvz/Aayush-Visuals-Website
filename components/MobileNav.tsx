"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

/*
  Mobile bottom navbar (phone widths only — the desktop top pill hides).
  One rounded glass pill, fixed above the safe area, outside the draggable
  world, always visible across the site.

  Closed:  [ MENU ] [ aayushᵛᶻ ] [ THEME ACTION ]
  Open:    [ CLOSE ] [ aayushᵛᶻ ] [ HOME ABOUT WORKS CONTACT ] [ THEME ]

  The links expand inside the SAME pill (max-width transition, staggered
  reveal). The theme button shows the OPPOSITE theme — the action you get.
*/

const links = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Works", href: "#work" },
  { label: "Contact", href: "#contact" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  return (
    <nav className={`mobileNav ${open ? "mobileNav--open" : ""}`} aria-label="Mobile navigation">
      <button
        type="button"
        className="mobileNav__menu"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mobileNav__menuIcon" aria-hidden>
          <i />
          <i />
        </span>
      </button>

      <a href="#top" className="mobileNav__logo" onClick={() => setOpen(false)}>
        aayush<sup>vz</sup>
      </a>

      <div className="mobileNav__links">
        {links.map((l, i) => (
          <a
            key={l.href}
            href={l.href}
            style={{ transitionDelay: open ? `${120 + i * 45}ms` : "0ms" }}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </a>
        ))}
      </div>

      <button
        type="button"
        className="mobileNav__theme"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
      >
        {/* key remount replays the subtle icon-in animation on switch */}
        <span key={theme} className="mobileNav__themeIcon">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </span>
      </button>
    </nav>
  );
}

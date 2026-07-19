"use client";

import { useEffect, useRef, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";
import { motion, AnimatePresence } from "framer-motion";
import PageLink from "./PageLink";
import useSurfaceTone from "./useSurfaceTone";

/*
  Mobile bottom navbar (phone widths only — the desktop top pill hides).
  One rounded glass pill, fixed above the safe area, outside the draggable
  world, always visible across the site.

  Closed:  [ MENU ] [ aayushᵛᶻ ] [ THEME ACTION ]
  Open:    Toggles a full-screen dynamic overlay in a lilac-purple scheme.
*/

const links = [
  { label: "Home", href: "/" },
  { label: "About Me", href: "/about" },
  { label: "Works", href: "/#work" },
  { label: "Contact", href: "/contact" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeHash, setActiveHash] = useState("#top");
  const pillRef = useRef<HTMLElement>(null);
  const tone = useSurfaceTone(pillRef, open);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    if (typeof window !== "undefined") {
      setActiveHash(window.location.hash || "#top");
    }
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
    <>
      {!open && (
        <nav
          className={`mobileNav mobileNav--over${tone === "light" ? "Light" : "Dark"}`}
          aria-label="Mobile navigation"
          ref={pillRef}
        >
          <button
            type="button"
            className="mobileNav__menu"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <span className="mobileNav__menuIcon" aria-hidden>
              <i />
              <i />
            </span>
          </button>

          <PageLink href="/" className="mobileNav__logo">
            aayush<sup>vz</sup>
          </PageLink>

          <button
            type="button"
            className="mobileNav__theme"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            <span key={theme} className="mobileNav__themeIcon">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>
        </nav>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="mobileNavCard"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            {/* Centered Navigation Links */}
            <div className="mobileNavCard__links">
              {links.map((l) => (
                <PageLink
                  key={l.href}
                  href={l.href}
                  className="mobileNavCard__link"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </PageLink>
              ))}
            </div>

            {/* Bottom Row */}
            <div className="mobileNavCard__bottom">
              <span className="mobileNavCard__title">Menu</span>
              <PageLink href="/" className="mobileNavCard__logo" onClick={() => setOpen(false)}>
                aayush<sup>vz</sup>
              </PageLink>
              <button
                type="button"
                className="mobileNavCard__close"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

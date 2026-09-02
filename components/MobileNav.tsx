"use client";

import { useEffect, useRef, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";
import { motion, AnimatePresence } from "framer-motion";
import PageLink from "./PageLink";
import useSurfaceTone from "./useSurfaceTone";
import LogoMark from "./LogoMark";

/* No "home" row: the wordmark in the bar above is already the link home, and
   listing it again spends the panel's tallest, most prominent slot on the one
   destination the user can always reach. */
const links = [
  { label: "about me", href: "/about" },
  { label: "projects", href: "/work" },
  { label: "games", href: "/playground" },
  { label: "contact", href: "/contact" },
];

export default function MobileNav({ position = "top" }: { position?: "top" | "bottom" }) {
  const barRef = useRef<HTMLElement>(null);
  /* the collapsed pill takes the tone of whatever it is over, exactly as the
     desktop bar does; the expanded sheet stays dark on purpose */
  const overLight = useSurfaceTone(barRef) === "light";
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

  const renderBar = (isOpen: boolean) => (
    <div className="mobileNav__bar">
      <button
        type="button"
        className="mobileNav__menuBtn"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!isOpen)}
      >
        {isOpen ? (
          <span className="mobileNav__closeIcon" aria-hidden>✕</span>
        ) : (
          <span className="mobileNav__hamburger" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
      </button>

      {/* the mark carries no text, so the link needs its own accessible name */}
      <PageLink
        href="/"
        className="mobileNav__logo"
        aria-label="aayush vz, home"
        onClick={() => setOpen(false)}
      >
        <LogoMark className="mobileNav__logoMark" />
      </PageLink>

      <button
        type="button"
        className="mobileNav__themeBtn"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
      >
        <span key={theme} className="mobileNav__themeBadge">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </span>
      </button>
    </div>
  );

  return (
    <>
      {!open && (
        <nav
          ref={barRef}
          className={`mobileNav ${position === "top" ? "mobileNav--top" : "mobileNav--bottom"} ${
            overLight ? "mobileNav--overLight" : "mobileNav--overDark"
          }`}
          aria-label="Mobile navigation"
        >
          {renderBar(false)}
        </nav>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className={`mobileNavCard ${position === "top" ? "mobileNavCard--top" : "mobileNavCard--bottom"}`}
            /* No scale. Growing from 0.94 made the panel look like it was
               being blown up from a smaller copy of itself; the sheet is the
               same pill with more in it, so it only fades and settles. */
            initial={{ opacity: 0, y: position === "top" ? -8 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === "top" ? -8 : 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            {position === "top" && renderBar(true)}

            <div className={`mobileNavCard__links ${position === "top" ? "mobileNavCard__links--top" : "mobileNavCard__links--bottom"}`}>
              {links.map((l, idx) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: position === "top" ? -10 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 + 0.06, type: "spring", stiffness: 400, damping: 26 }}
                  style={{ width: "100%", display: "flex" }}
                >
                  <PageLink
                    href={l.href}
                    className="mobileNavCard__link"
                    onClick={() => setOpen(false)}
                  >
                    <span className="mobileNavCard__linkText">
                      {l.label}
                    </span>
                  </PageLink>
                </motion.div>
              ))}
            </div>

            {/* The reference closes its sheet with a pair of dark action
                buttons. There is one real destination for that here, so it is
                one full-width button rather than two invented ones. */}
            <div className="mobileNavCard__foot">
              <PageLink
                href="/contact"
                className="mobileNavCard__cta"
                onClick={() => setOpen(false)}
              >
                Start a project
              </PageLink>
            </div>

            {position !== "top" && renderBar(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

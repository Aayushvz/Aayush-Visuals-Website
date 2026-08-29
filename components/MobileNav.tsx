"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";
import { motion, AnimatePresence } from "framer-motion";
import PageLink from "./PageLink";

const links = [
  { label: "home", href: "/" },
  { label: "about me", href: "/about" },
  { label: "works", href: "/work" },
  { label: "playground", href: "/playground" },
  { label: "contact", href: "/contact" },
];

export default function MobileNav({ position = "top" }: { position?: "top" | "bottom" }) {
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

      <PageLink href="/" className="mobileNav__logo" onClick={() => setOpen(false)}>
        aayush
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
          className={`mobileNav ${position === "top" ? "mobileNav--top" : "mobileNav--bottom"}`}
          aria-label="Mobile navigation"
        >
          {renderBar(false)}
        </nav>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className={`mobileNavCard ${position === "top" ? "mobileNavCard--top" : "mobileNavCard--bottom"}`}
            initial={{ opacity: 0, scale: 0.94, y: position === "top" ? -20 : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: position === "top" ? -20 : 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            {position === "top" && renderBar(true)}

            <div className={`mobileNavCard__links ${position === "top" ? "mobileNavCard__links--top" : "mobileNavCard__links--bottom"}`}>
              {links.map((l, idx) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: position === "top" ? -10 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 + 0.06, type: "spring", stiffness: 400, damping: 26 }}
                  style={{ width: "100%", display: "flex", justifyContent: "center" }}
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

            {position !== "top" && renderBar(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

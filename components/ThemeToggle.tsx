"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

/*
  Standalone centre-right vertical glass theme switcher — desktop only.
  Hidden on phones (the mobile bottom navbar owns theming there) and it
  fades out once the user scrolls past the hero (html.past-hero, toggled
  by the hero's existing scroll handler).
*/
export default function ThemeToggle() {
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
    <div className="themeSwitch" data-active={theme}>
      <button
        type="button"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
      >
        <span key={theme} className="themeSwitch__icon">
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </span>
      </button>
    </div>
  );
}

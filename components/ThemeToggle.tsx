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

  const set = (next: "dark" | "light") => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  return (
    <div className="themeSwitch" data-active={theme}>
      <span className="themeSwitch__thumb" aria-hidden />
      <button
        type="button"
        aria-label="Switch to light mode"
        aria-pressed={theme === "light"}
        onClick={() => set("light")}
      >
        <SunIcon />
      </button>
      <button
        type="button"
        aria-label="Switch to dark mode"
        aria-pressed={theme === "dark"}
        onClick={() => set("dark")}
      >
        <MoonIcon />
      </button>
    </div>
  );
}

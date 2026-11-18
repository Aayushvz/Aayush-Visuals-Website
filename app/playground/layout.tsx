import { Press_Start_2P } from "next/font/google";
import "./playground-chrome.css";

/*
  The arcade face, loaded for /playground and its children only.

  Press Start 2P is a 1:1 pixel font — it only looks right at multiples of
  its design size, and it is unreadable in paragraphs, so it is scoped to
  titles, buttons and HUD labels. Body copy stays on the monospace stack.
  Loading it in the root layout would put an arcade font on every page of
  a portfolio, which is exactly the kind of thing the font audit in
  docs/PERF-AUDIT.md was cleaning up.
*/
const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--pg-arcade",
  preload: false,
});

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  /* .pg-scope is what every rule in playground-chrome.css hangs off, so
     the arcade skin cannot reach the rest of the portfolio */
  return <div className={`pg-scope ${pressStart.variable}`}>{children}</div>;
}

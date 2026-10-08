import type { Metadata } from "next";
import AvHero from "@/components/test/av/AvHero";

/*
  An alternative hero for the portfolio.

  No font is loaded for this route. The wordmark is set in the hand-drawn
  alphabet in components/test/av/glyphs.ts, which is why there is no
  next/font call here and no display face in the root layout for it.

  Siblings: /test/pixel (a pixel-art trace) and /test/chew (a recreation of
  the reference this one's composition learned from).

  noindex - this is a thing to look at and judge, not a page that should
  turn up in a search for Aayush.
*/
export const metadata: Metadata = {
  title: "Test",
  description: "An alternative hero treatment for Aayush Visuals.",
  alternates: { canonical: "/test" },
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return (
    <main>
      <AvHero />
    </main>
  );
}

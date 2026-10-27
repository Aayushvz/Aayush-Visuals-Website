import type { Metadata } from "next";
import VisualsHero from "@/components/test/visuals/VisualsHero";

/*
  Aayush Visuals, set in its own face.

  The typeface is generated, not loaded: components/test/visuals/nib.ts
  writes every glyph with a single broad pen (see glyphs.ts for the
  centrelines). No webfont request for the display type at all.

  Sibling of /test/bold. noindex - an experiment to judge.
*/
export const metadata: Metadata = {
  title: "Visuals",
  description: "Aayush Visuals, set in a custom broad-nib typeface.",
  alternates: { canonical: "/test/visuals" },
  robots: { index: false, follow: false },
};

export default function VisualsPage() {
  return (
    <main>
      <VisualsHero />
    </main>
  );
}

import type { Metadata } from "next";
import BoldHero from "@/components/test/bold/BoldHero";

/*
  A poster-loud hero experiment for Aayush Visuals.

  References: an oversized cropped-letterform identity (flat brand colour,
  type as the image) and a condensed three-line headline over an electric
  field with floating glass shards. This page stands alone; the homepage
  hero is untouched.

  noindex - a thing to look at and judge, not a page for search.
*/
export const metadata: Metadata = {
  title: "Bold",
  description: "A typographic poster hero experiment for Aayush Visuals.",
  alternates: { canonical: "/test/bold" },
  robots: { index: false, follow: false },
};

export default function BoldPage() {
  return (
    <main>
      <BoldHero />
    </main>
  );
}

import type { Metadata } from "next";
import { Titan_One } from "next/font/google";
import ChewHero from "@/components/test/chew/ChewHero";

/*
  A close recreation of a reference hero. The pixel-art variant is next
  door at /test/pixel.

  No site navbar here, unlike the other variants: the reference carries its
  own chrome in the corners and a row of labels exactly where the nav pill
  floats, and the two cannot both occupy that band.

  Titan One is loaded on this route rather than in the root layout - it is
  the display face for one scratch page.
*/
const display = Titan_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-chew",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Test - reference study",
  description: "A recreation of a reference hero, kept as a study.",
  alternates: { canonical: "/test/chew" },
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return (
    <main>
      <ChewHero displayClass={display.className} />
    </main>
  );
}

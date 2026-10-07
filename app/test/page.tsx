import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import StudioPageClient from "@/components/test/studio/StudioPageClient";

/*
  An alternate hero, synthesised from a set of references rather than
  traced from one. The pixel-art variant lives next door at /test/pixel.

  Fredoka is loaded HERE rather than in the root layout: it is the display
  face for this one route, and adding it to the layout would ship it to
  every page on the site for the sake of a scratch route.

  noindex, like its neighbour - these are things to look at, not pages that
  should turn up in a search for Aayush.
*/
const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Test",
  description: "An alternate homepage treatment.",
  alternates: { canonical: "/test" },
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return <StudioPageClient displayClass={display.className} />;
}

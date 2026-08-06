import type { Metadata } from "next";
import CricketExperience from "@/components/cricket/CricketExperience";
import { OG_IMAGE } from "@/lib/site";

/* bare title — the root layout's template appends " - Aayush Raj" */
const description =
  "Face one over. Six balls, a floodlit night and one shot to play. A small browser cricket game built with canvas and Web Audio, hidden on Aayush Raj's portfolio.";

export const metadata: Metadata = {
  title: "Six Balls",
  description,
  alternates: { canonical: "/cricket" },
  /* images must be repeated: a child openGraph replaces the parent's rather
     than merging into it, so omitting this ships the page with no share card */
  openGraph: {
    title: "Six Balls - Aayush Raj",
    description,
    url: "/cricket",
    images: [OG_IMAGE],
  },
};

export default function CricketPage() {
  return <CricketExperience />;
}

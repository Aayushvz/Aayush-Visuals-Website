import type { Metadata } from "next";
import CricketExperience from "@/components/cricket/CricketExperience";
import { OG_IMAGE } from "@/lib/site";

/* bare title — the root layout's template appends " - Aayush Raj" */
const description =
  "Face one over. Six balls, a floodlit night and one shot to play. A small browser cricket game built with canvas and Web Audio, from the playground on Aayush Raj's portfolio.";

/* the title used to be "Playground" back when this route was the only toy on
   the site. /playground is now the real hub, so this page takes the game's
   own name and stops competing with it in search results and tab titles. */
export const metadata: Metadata = {
  title: "Design Premier League",
  description,
  alternates: { canonical: "/cricket" },
  /* images must be repeated: a child openGraph replaces the parent's rather
     than merging into it, so omitting this ships the page with no share card */
  openGraph: {
    title: "Design Premier League - Aayush Raj",
    description,
    url: "/cricket",
    images: [OG_IMAGE],
  },
};

export default function CricketPage() {
  return <CricketExperience />;
}

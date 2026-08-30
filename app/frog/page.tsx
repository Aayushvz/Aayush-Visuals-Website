import type { Metadata } from "next";
import PondExperience from "@/components/pond/PondExperience";
import { OG_IMAGE } from "@/lib/site";

/* bare title - the root layout's template appends " - Aayush Raj" */
const description =
  "A hand-drawn pixel-art frog diorama. Catch coding bugs, watch the pond bloom, and let a frog hop the lily pads. No score, no timer, no way to lose. From the playground on Aayush Raj's portfolio.";

export const metadata: Metadata = {
  title: "Lotus Pond",
  description,
  alternates: { canonical: "/frog" },
  /* images must be repeated: a child openGraph replaces the parent's rather
     than merging into it, so omitting this ships the page with no share card */
  openGraph: {
    title: "Lotus Pond - Aayush Raj",
    description,
    url: "/frog",
    images: [OG_IMAGE],
  },
};

export default function FrogPage() {
  return <PondExperience />;
}

import type { Metadata } from "next";
import PlaygroundPageClient from "@/components/playground/PlaygroundPageClient";
import { OG_IMAGE } from "@/lib/site";

/* bare title - the root layout's template appends " - Aayush Raj" */
const description =
  "Side experiments by Aayush Raj (Aayush Visuals): interface toys, canvas sketches and a browser cricket game. Unbriefed work, added to over time.";

export const metadata: Metadata = {
  title: "Playground",
  description,
  alternates: { canonical: "/playground" },
  /* images repeated on purpose - a child openGraph replaces the parent's */
  openGraph: {
    title: "Playground - Aayush Raj",
    description,
    url: "/playground",
    images: [OG_IMAGE],
  },
};

export default function PlaygroundPage() {
  return <PlaygroundPageClient />;
}

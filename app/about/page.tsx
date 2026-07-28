import type { Metadata } from "next";
import AboutPageClient from "@/components/about/AboutPageClient";
import { OG_IMAGE } from "@/lib/site";

/* bare title — the root layout's template appends "— Aayush Raj" */
const description =
  "About Aayush Raj (Aayush Visuals) — product designer and design engineer in India, crafting digital products, brand systems and motion with pixel-perfect execution.";

export const metadata: Metadata = {
  title: "About",
  description,
  alternates: { canonical: "/about" },
  /* images must be repeated: a child openGraph replaces the parent's rather
     than merging into it, so omitting this ships the page with no share card */
  openGraph: {
    title: "About — Aayush Raj",
    description,
    url: "/about",
    images: [OG_IMAGE],
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}

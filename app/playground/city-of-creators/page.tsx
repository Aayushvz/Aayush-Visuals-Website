import type { Metadata } from "next";
import CityExperience from "@/components/playground/city/CityExperience";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { OG_IMAGE } from "@/lib/site";

/* bare title — the root layout's template appends " - Aayush Raj" */
const description =
  "An open-world pixel-art city where every building hides something I built. Walk the streets, find the eight experiments. A playground experiment by Aayush Raj.";

export const metadata: Metadata = {
  title: "City of Creators",
  description,
  alternates: { canonical: "/playground/city-of-creators" },
  /* images repeated on purpose — a child openGraph replaces the parent's */
  openGraph: {
    title: "City of Creators - Aayush Raj",
    description,
    url: "/playground/city-of-creators",
    images: [OG_IMAGE],
  },
};

export default function CityOfCreatorsPage() {
  return (
    <>
      {/* the site's own nav, wearing the arcade skin from
          app/playground/playground-chrome.css, so a visitor can leave the
          city without hunting for the exit chip */}
      <Navbar />
      <MobileNav />
      <CityExperience />
    </>
  );
}

import type { Metadata } from "next";
import WorkPageClient from "@/components/work/WorkPageClient";
import { OG_IMAGE } from "@/lib/site";

const description =
  "Selected product, brand and website work by Aayush Raj (Aayush Visuals) across real launches, crafted with intention and built for real users.";

export const metadata: Metadata = {
  title: "Work",
  description,
  alternates: { canonical: "/work" },
  /* images repeated on purpose — a child openGraph replaces the parent's */
  openGraph: {
    title: "Work - Aayush Raj",
    description,
    url: "/work",
    images: [OG_IMAGE],
  },
};

export default function WorkPage() {
  return <WorkPageClient />;
}

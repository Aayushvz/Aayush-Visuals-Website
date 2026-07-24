import type { Metadata } from "next";
import WorkPageClient from "@/components/work/WorkPageClient";

export const metadata: Metadata = {
  title: "Work - Aayush Visuals",
  description:
    "Selected product, brand and website work by Aayush Raj across real launches, crafted with intention and built for real users.",
};

export default function WorkPage() {
  return <WorkPageClient />;
}

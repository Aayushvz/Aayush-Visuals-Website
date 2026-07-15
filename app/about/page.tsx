import type { Metadata } from "next";
import AboutPageClient from "@/components/about/AboutPageClient";

export const metadata: Metadata = {
  title: "About — Aayush Visuals",
  description:
    "Aayush Raj — product designer and design engineer crafting digital products, brand systems and motion with pixel-perfect execution.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}

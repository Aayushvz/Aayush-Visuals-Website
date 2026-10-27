import type { Metadata } from "next";
import ZhuHero from "@/components/test/zhu/ZhuHero";
import MobileNav from "@/components/MobileNav";

/*
  A hero after guillaumezhu.com in the Aayush Visuals purple: the logo mark
  as a real 3D object passing through the name, satin at rest, glass on
  hover. Spec: docs/superpowers/specs/2026-10-28-zhu-style-hero-design.md.

  noindex - an experiment to judge, not a page for search.
*/
export const metadata: Metadata = {
  title: "3D hero",
  description: "Aayush Visuals hero with the logo mark in 3D.",
  alternates: { canonical: "/test/zhu" },
  robots: { index: false, follow: false },
};

export default function ZhuPage() {
  return (
    <>
      <ZhuHero />
      <MobileNav />
    </>
  );
}

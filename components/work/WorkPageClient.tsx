"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";

import Reveals from "@/components/Reveals";
import Footer from "@/components/Footer";
import WorksSection from "./WorksSection";
import CaseStudiesSection from "./CaseStudiesSection";

/*
  /work page shell — mirrors the persistent chrome used on the homepage and
  About page (nav, cursor, theme toggle, side rails).

  The choreographed WorkHero deck used to open this page. It now lives in the
  About story, where it follows "what I do" and shows the work rather than
  describing it again; this page goes straight to the grid, which is what
  someone arriving here came for.
*/
export default function WorkPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />

      <Reveals />
      <main>
        <WorksSection />
        <CaseStudiesSection />
        <Footer />
      </main>
    </>
  );
}

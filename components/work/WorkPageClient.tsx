"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";

import Reveals from "@/components/Reveals";
import Footer from "@/components/Footer";
import WorksSection from "./WorksSection";
import CaseStudiesSection from "./CaseStudiesSection";
import WorkHero from "./WorkHero";

/*
  /work page shell — mirrors the persistent chrome used on the homepage and
  About page (nav, cursor, theme toggle, side rails). The choreographed
  WorkHero sits first; the existing Selected Projects list + Footer follow it
  as the natural "release" below the pinned hero. No existing component is
  modified — this only composes them into the new route.
*/
export default function WorkPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />

      <Reveals />
      <main>
        <WorkHero />
        <WorksSection />
        <CaseStudiesSection />
        <Footer />
      </main>
    </>
  );
}

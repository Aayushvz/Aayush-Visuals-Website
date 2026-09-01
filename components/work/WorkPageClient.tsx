"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";

import Reveals from "@/components/Reveals";
import Footer from "@/components/Footer";
import HomeContact from "@/components/HomeContact";
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
        {/* Same shape as the homepage: the content stage is opaque and slides
            up over the footer, which is sticky underneath it, so the footer is
            revealed rather than scrolled to. Contact closes the page just
            above it, as it does there. */}
        <div className="hpParallax">
          <div className="hpParallax__stage">
            <WorksSection />
            <CaseStudiesSection />
            <HomeContact />
          </div>
          <Footer />
        </div>
      </main>
    </>
  );
}

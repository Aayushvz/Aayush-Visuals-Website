import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";

import Hero from "@/components/Hero";
import About from "@/components/About";
import Statement from "@/components/Statement";
import Process from "@/components/Process";
import ProjectsSection from "@/components/ProjectsSection";
import HomeContact from "@/components/HomeContact";
import Reveals from "@/components/Reveals";
/* heavy, below the fold, and held until approach - see HomeDeferred */
import {
  DeferredServices,
  DeferredGallery,
  DeferredFooter,
} from "@/components/HomeDeferred";

export default function Home() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />

      <Reveals />
      <div className="rails" aria-hidden />
      <main>
        {/* The page had no h1 at all — headings started at h2, so the
            document had no top-level heading for screen readers or
            crawlers. The hero wordmark is artwork inside a drag canvas
            rather than a heading, so the h1 lives here. */}
        <h1 className="srOnly">
          Aayush Raj - Product Designer and Design Engineer
        </h1>
        <Hero />
        {/* About rises over the pinned hero (stage pulled up 100vh, higher
            z) with its stepped-band top edge, then pins inside this stage;
            the stage's extra spacer provides a calm dwell before the
            Statement panel (next sibling, pulled up 100vh) rises over the
            pinned About as one solid rectangular layer. */}
        <div className="aboutStage">
          <About />
        </div>
        <Statement />
        <DeferredServices />
        <div className="hpParallax">
          <div className="hpParallax__stage">
            <ProjectsSection />
            <div className="processStage">
              <Process />
            </div>
            <DeferredGallery />
            <HomeContact />
          </div>
          <DeferredFooter />
        </div>
      </main>
    </>
  );
}

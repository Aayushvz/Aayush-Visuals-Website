import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import ThemeToggle from "@/components/ThemeToggle";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Statement from "@/components/Statement";
import Process from "@/components/Process";
import Capabilities from "@/components/Capabilities";
import ProjectsSection from "@/components/ProjectsSection";
import Services from "@/components/Services";
import Testimonials from "@/components/about/Testimonials";
import HomeContact from "@/components/HomeContact";
import Footer from "@/components/Footer";
import Reveals from "@/components/Reveals";

export default function Home() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />
      <ThemeToggle />
      <Reveals />
      <div className="rails" aria-hidden />
      <main>
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
        <div className="processStage">
          <Process />
          <Capabilities />
        </div>
        <div className="hpParallax">
          <div className="hpParallax__stage">
            <ProjectsSection />
            <Services />
            <Testimonials hideHeader />
            <HomeContact />
          </div>
          <Footer />
        </div>
      </main>
    </>
  );
}

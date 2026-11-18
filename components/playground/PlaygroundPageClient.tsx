"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import TitleScreen from "./TitleScreen";
import DescentPage from "./descent/DescentPage";

/*
  /playground: the title screen for City of Creators, with the experiment
  shelf below it for anyone who would rather just read the list than play
  anything.

  The earlier rig-card shelf (ExperimentShelf + playground.css) and the
  playground sphere (sphere/PlaygroundSphere.tsx) are no longer mounted
  but are left in place.
*/
export default function PlaygroundPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />
      <main>
        <TitleScreen />
        <section id="shelf">
          <DescentPage />
        </section>
      </main>
    </>
  );
}

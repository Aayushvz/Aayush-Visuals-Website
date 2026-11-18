"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import TitleScreen from "./TitleScreen";

/*
  /playground: the title screen, and nothing else.

  The card shelf that used to sit under it is gone — the experiments are
  in the city now, and a list of the same eight things directly below the
  door into them was just the game spoiling its own contents.

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
      </main>
    </>
  );
}

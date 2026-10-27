"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import PlaygroundSphere from "./sphere/PlaygroundSphere";

/*
  /playground shell: the site's nav, mobile nav and cursor around one
  full-screen ball of experiments (sphere/PlaygroundSphere.tsx), after
  guillaumezhu.com/playground.

  It is a single screen on purpose - the wheel and every drag turn the
  ball, so there is no page scroll and no footer below it.

  The earlier rig-card shelf (ExperimentShelf + playground.css) is no
  longer mounted but is left in place.
*/
export default function PlaygroundPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />
      <main>
        <PlaygroundSphere />
      </main>
    </>
  );
}

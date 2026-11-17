"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import DescentPage from "./descent/DescentPage";

/*
  /playground shell: the site's nav, mobile nav and cursor around the
  descent (descent/DescentPage.tsx).

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
        <DescentPage />
      </main>
    </>
  );
}

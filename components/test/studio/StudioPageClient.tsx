"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import StudioHero from "./StudioHero";

/*
  /test shell. Same arrangement as the pixel variant next door at
  /test/pixel: the site's nav over a single full-height stage, and no
  <Cursor />, because the stage is the whole point and a second custom
  cursor would only compete with it.
*/
export default function StudioPageClient({ displayClass }: { displayClass: string }) {
  return (
    <>
      <Navbar />
      <MobileNav />
      <main>
        <StudioHero displayClass={displayClass} />
      </main>
    </>
  );
}

"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import TestHero from "./TestHero";
import "./test.css";

/*
  /test shell - an alternate homepage treatment, one screen only.

  Carries the site's nav so it reads as a real page rather than a loose
  mockup. It deliberately does NOT mount <Cursor />: the stage draws its own
  pixel arrow, and two custom cursors on one page is one too many.
*/
export default function TestPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <main>
        <TestHero />
      </main>
    </>
  );
}

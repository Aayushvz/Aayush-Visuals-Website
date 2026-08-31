"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Reveals from "@/components/Reveals";
import Footer from "@/components/Footer";
import ExperimentShelf from "./ExperimentShelf";
import "./playground.css";

/*
  /playground shell. Same persistent chrome as the other routes (nav, custom
  cursor, reveal observer, footer).

  The page opens straight on the shelf now — the physics-toy hero that used
  to sit above it is gone. The shelf sits on the site's cream and carries its
  own light rails, so no global .rails layer is mounted here.
*/
export default function PlaygroundPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />

      <Reveals />
      <main>
        <ExperimentShelf />
        <Footer />
      </main>
    </>
  );
}

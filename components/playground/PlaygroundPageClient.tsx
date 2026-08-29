"use client";

import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Reveals from "@/components/Reveals";
import Footer from "@/components/Footer";
import PlaygroundHero from "./PlaygroundHero";
import ExperimentShelf from "./ExperimentShelf";
import "./playground.css";

/*
  /playground shell. Same persistent chrome as the other routes (nav, custom
  cursor, reveal observer, footer); the hero brings its own dark canvas and
  the shelf sits on the site's cream, so no global .rails layer is mounted
  here - the shelf carries its own light rails instead.
*/
export default function PlaygroundPageClient() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />

      <Reveals />
      <main>
        <PlaygroundHero />
        <ExperimentShelf />
        <Footer />
      </main>
    </>
  );
}

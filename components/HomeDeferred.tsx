"use client";

import dynamic from "next/dynamic";
import DeferUntilNear from "./DeferUntilNear";
/* data modules, not the components - see the note on `prefetch` below */
import { SERVICE_IMAGES } from "./services.data";
import { GALLERY } from "./gallery.data";

/*
  The homepage's below-the-fold sections, held back until they are needed.

  This file is a Client Component for a specific reason. Per Next's own
  lazy-loading guide, `ssr: false` works only inside a Client Component, and a
  Server Component that dynamically imports a Client Component does not get
  code splitting at all - so doing this from app/page.tsx would have bought
  nothing. Putting the boundary here gets both halves of the win: the chunk is
  not downloaded until the section is near, and the component is not mounted
  until then either.

  WHAT IS AND IS NOT HERE

  Only sections that are heavy to mount and carry little text worth indexing:

  - Services      a 3D carousel of twelve cards, all framer-motion
  - Gallery       a scroll-driven track, eight images and a rAF loop
  - Footer        a night scene with seventy positioned stars

  Projects, Process and Contact stay server-rendered on purpose. `ssr: false`
  means the markup is not in the HTML a crawler sees, and those three hold the
  things worth finding: project names and their links, the process copy, and
  how to get in touch. Trading that for a faster metric would be a bad deal.
  The footer's links survive the trade because the navbar carries the same
  ones and is rendered on the server.

  The heights below are measured, not guessed - they are what each section
  currently occupies at a 900px viewport, expressed in vh so they hold at any
  size. The gallery's own height is 100svh plus its track travel, which is not
  known until it measures itself; its placeholder reserves the full 3.55
  viewports it settles at, so the page does not grow underneath the reader.
*/

/*
  WHY THESE SECTIONS ALSO PREFETCH THEIR PICTURES

  Splitting a section off buys main-thread time, but it takes something back:
  the browser cannot see an image URL that is not in the document. Everything
  here is `ssr: false`, so the preload scanner has nothing to scan, and the
  fetch cannot begin until the chunk has landed AND React has mounted. That is
  two serial round trips in front of every picture, which is why the deck used
  to arrive as six empty cards and the gallery filled in one frame at a time.

  Handing the URLs to DeferUntilNear starts them at a wider margin, in
  parallel with the chunk rather than behind it. They are imported from the
  data modules, never from the components, so nothing heavy is pulled back
  into the main bundle - a few strings are all that ships.
*/
const GALLERY_IMAGES: readonly string[] = GALLERY.map((g) => g.src);

const Services = dynamic(() => import("./Services"), { ssr: false });
const GallerySection = dynamic(() => import("./GallerySection"), { ssr: false });
const Footer = dynamic(() => import("./Footer"), { ssr: false });

export function DeferredServices() {
  return (
    <DeferUntilNear minHeight="300vh" prefetch={SERVICE_IMAGES}>
      <Services />
    </DeferUntilNear>
  );
}

export function DeferredGallery() {
  return (
    <DeferUntilNear minHeight="355vh" prefetch={GALLERY_IMAGES}>
      <GallerySection />
    </DeferUntilNear>
  );
}

export function DeferredFooter() {
  return (
    /* sticky, so it is on screen from the first frame - watch a marker at
       its place in flow instead, and give it a wider margin because the
       stage only uncovers it in the last stretch of the page */
    <DeferUntilNear
      minHeight="94vh"
      className="hpParallax__footerWrap"
      flowAnchor
      rootMargin="250% 0px"
    >
      <Footer />
    </DeferUntilNear>
  );
}

"use client";

import dynamic from "next/dynamic";

/*
  The client boundary for /frog.

  Its only job is to keep the pond off the server. The engine reaches for
  window while it is being constructed - the renderer sizes its backing store
  off innerWidth, StaticLayer builds offscreen canvases - so this loads it with
  ssr: false rather than scattering typeof-window guards through engine code
  that is correct as written.

  The fallback is the same colour as the pond's night sky, so the swap from
  placeholder to canvas is invisible rather than a flash of white. It is styled
  inline on purpose: pond.css rides along with the chunk being waited on, so a
  class here would be unstyled for exactly the moment it is on screen.
*/
const LotusPond = dynamic(() => import("./LotusPond"), {
  ssr: false,
  loading: () => (
    <div style={{ position: "fixed", inset: 0, background: "#0b0f1e" }} />
  ),
});

export default function PondExperience() {
  return <LotusPond />;
}

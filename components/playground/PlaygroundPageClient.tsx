"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Cursor from "@/components/Cursor";
import PlaygroundStartScreen from "./PlaygroundStartScreen";

/*
  The city is a separate chunk, not part of this page's first load.

  It was imported statically, which meant the engine, the tileset, the
  venues and the Game Boy all had to arrive before the start screen could
  paint — the screen whose entire job is to be up instantly. Now the
  start screen renders on its own, and the chunk is fetched behind it
  while the visitor reads the title, so pressing Enter hands over to
  something already in memory.
*/
const CityExperience = dynamic(() => import("./city/CityExperience"), {
  ssr: false,
});

/*
  /playground: The interactive pixel world & portfolio playground.
  The start screen welcomes visitors first with arcade aesthetics and sound config,
  transitioning seamlessly into the living city with Spider-Man character controls,
  day/night lighting, and direct experiment access.
*/
export default function PlaygroundPageClient() {
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [initialSound, setInitialSound] = useState(true);
  const [initialGameBoy, setInitialGameBoy] = useState(false);

  /* warm the chunk, and the two files the city reaches for first, while
     the start screen holds the view */
  useEffect(() => {
    let live = true;
    void import("./city/CityExperience").then(() => {
      if (live) setReady(true);
    });

    const warm = (href: string, as: string) => {
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = href;
      l.as = as;
      document.head.appendChild(l);
      return l;
    };
    /* only the file this browser can actually decode — Safari cannot
       play the opus, so prefetching both would waste a download */
    const probe = document.createElement("audio");
    const theme = probe.canPlayType("audio/ogg; codecs=opus")
      ? "/playground/audio/city-theme.ogg"
      : "/playground/audio/city-theme.m4a";
    const links = [warm(theme, "audio")];

    return () => {
      live = false;
      links.forEach((l) => l.remove());
    };
  }, []);

  return (
    <>
      <Cursor />
      <main>
        {!started ? (
          <PlaygroundStartScreen
            ready={ready}
            initialSound={initialSound}
            onStart={({ sound, openGameBoy }) => {
              setInitialSound(sound);
              if (openGameBoy) setInitialGameBoy(true);
              setStarted(true);
            }}
          />
        ) : (
          <CityExperience initialSound={initialSound} initialGameBoy={initialGameBoy} />
        )}
      </main>
    </>
  );
}


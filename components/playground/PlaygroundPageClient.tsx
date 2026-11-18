"use client";

import { useState } from "react";
import Cursor from "@/components/Cursor";
import CityExperience from "./city/CityExperience";
import PlaygroundStartScreen from "./PlaygroundStartScreen";

/*
  /playground: The interactive pixel world & portfolio playground.
  The start screen welcomes visitors first with arcade aesthetics and sound config,
  transitioning seamlessly into the living city with Spider-Man character controls,
  day/night lighting, and direct experiment access.
*/
export default function PlaygroundPageClient() {
  const [started, setStarted] = useState(false);
  const [initialSound, setInitialSound] = useState(true);
  const [initialGameBoy, setInitialGameBoy] = useState(false);

  return (
    <>
      <Cursor />
      <main>
        {!started ? (
          <PlaygroundStartScreen
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


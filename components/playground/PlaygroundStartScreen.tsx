"use client";

import { useEffect, useRef, useState } from "react";
import LogoMark from "@/components/LogoMark";
import "./city/city.css";
import "./start-screen.css";

type StartScreenProps = {
  onStart: (opts: { sound: boolean; openGameBoy?: boolean }) => void;
  initialSound?: boolean;
  /* true once the city's chunk has finished downloading */
  ready?: boolean;
};

const MENU = [
  { label: "Enter Experiments world", action: "play", primary: true },
];

export default function PlaygroundStartScreen({
  onStart,
  initialSound = true,
  ready = true,
}: StartScreenProps) {
  const [sel, setSel] = useState(0);
  /* pressed Enter before the city had arrived */
  const [waiting, setWaiting] = useState(false);
  const [sound, setSound] = useState(initialSound);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        setSel((s) => (s + 1) % MENU.length);
      } else if (k === "arrowup" || k === "w") {
        e.preventDefault();
        setSel((s) => (s - 1 + MENU.length) % MENU.length);
      } else if (k === "enter" || k === " ") {
        e.preventDefault();
        executeItem(sel);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, sound]);

  const executeItem = (idx: number) => {
    const item = MENU[idx];
    if (item.action === "play") {
      /*
        A press is never refused. If the chunk is still in flight the
        intent is held and honoured the moment it lands, so an early
        click reads as "loading", not as a dead button.
      */
      if (ready) onStart({ sound });
      else setWaiting(true);
    }
  };

  /* onStart is an inline arrow in the parent, so its identity changes
     every render — the latch is what keeps the hand-off to exactly one */
  const handedOff = useRef(false);
  useEffect(() => {
    if (waiting && ready && !handedOff.current) {
      handedOff.current = true;
      onStart({ sound });
    }
  }, [waiting, ready, sound, onStart]);

  return (
    <div className="coc pgt">
      {/* ── Top Dedicated Arcade Navbar Header (Identical across start screen & city) ── */}
      <header className="coc__navBar pgt__navBar">
        {/* Left HUD: aayushvz logo, district, and explored count */}
        <div className="coc__hud coc__hud--tl">
          <a href="/" className="coc__logoLink" aria-label="Aayush Visuals, Home" title="Home">
            <LogoMark className="coc__logoMark" />
          </a>
          <span className="coc__divider" aria-hidden="true" />
          <span className="coc__district">Downtown</span>
          <span className="coc__found">0 / 8 explored</span>
        </div>

        {/* Right HUD: Exit icon, Game Boy icon, Sound icon, Contact button */}
        <div className="coc__hud coc__hud--tr">
          {/* Exit Icon */}
          <a
            className="coc__iconBtn coc__iconBtn--exit"
            href="/"
            aria-label="Exit to home"
            title="Exit to home"
          >
            <svg
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" />
              <path d="M10 11l3-3-3-3" />
              <path d="M13 8H5" />
            </svg>
          </a>

          {/* Game Boy Icon */}
          <button
            className="coc__iconBtn coc__iconBtn--gb"
            onClick={() => onStart({ sound, openGameBoy: true })}
            aria-label="Open Game Boy controller"
            title="Open Game Boy controller"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="none" aria-hidden="true">
              <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="#d9dbdf" stroke="#101424" strokeWidth="0.8" />
              <rect x="3.8" y="2.8" width="8.4" height="5.2" rx="0.5" fill="#4a5568" />
              <rect x="5.2" y="3.6" width="5.6" height="3.6" fill="#9bbc0f" />
              <circle cx="4.4" cy="4.2" r="0.4" fill="#e63946" />
              <path d="M4.5 10.5h3m-1.5-1.5v3" stroke="#1a202c" strokeWidth="1" strokeLinecap="square" />
              <circle cx="10.8" cy="10" r="0.7" fill="#d6273c" />
              <circle cx="9.6" cy="11.2" r="0.7" fill="#1e40af" />
            </svg>
          </button>

          {/* Sound Toggle Icon */}
          <button
            className={`coc__iconBtn coc__iconBtn--sound ${sound ? "is-active" : ""}`}
            onClick={() => setSound((s) => !s)}
            aria-pressed={sound}
            aria-label={sound ? "Turn sound off" : "Turn sound on"}
            title={sound ? "Turn sound off" : "Turn sound on"}
          >
            <svg
              viewBox="0 0 16 16"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z" fill="currentColor" stroke="none" />
              {!sound ? (
                <>
                  <path d="M11 6l3 4" />
                  <path d="M14 6l-3 4" />
                </>
              ) : (
                <>
                  <path d="M11.5 5.5c1 1.2 1 3.8 0 5" />
                  <path d="M13.5 3.5c2 2.5 2 6.5 0 9" />
                </>
              )}
            </svg>
          </button>

          {/* Normal Contact Button */}
          <a
            className="coc__contactBtn"
            href="/contact"
            aria-label="Contact Aayush"
          >
            Contact
          </a>
        </div>
      </header>
      {/* ── Cinematic 16-Bit Spider-Man Metropolis Skyline ── */}
      <svg
        className="pgt__scene"
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          {/* Nocturnal Metropolis Sky Gradient */}
          <linearGradient id="pgtSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050814" />
            <stop offset="28%" stopColor="#0c122c" />
            <stop offset="55%" stopColor="#1e1236" />
            <stop offset="76%" stopColor="#44153b" />
            <stop offset="90%" stopColor="#782346" />
            <stop offset="100%" stopColor="#aa3b4e" />
          </linearGradient>

          {/* Sweeping Searchlight Beams */}
          <linearGradient id="pgtBeam1" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#9df3ff" stopOpacity="0.26" />
            <stop offset="60%" stopColor="#9df3ff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#9df3ff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="pgtBeam2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffd88a" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#ffd88a" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#ffd88a" stopOpacity="0" />
          </linearGradient>

          {/* Glowing Full Moon */}
          <radialGradient id="pgtMoonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff8e8" stopOpacity="0.75" />
            <stop offset="42%" stopColor="#ffe4b0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffe4b0" stopOpacity="0" />
          </radialGradient>

          {/* Distant Bridge Fog Haze */}
          <linearGradient id="pgtHaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#aa3b4e" stopOpacity="0" />
            <stop offset="70%" stopColor="#aa3b4e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff6548" stopOpacity="0.45" />
          </linearGradient>

          {/* Shooting Star Gradient */}
          <linearGradient id="pgtMeteorGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#8beaff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8beaff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── Background Sky ── */}
        <rect width="640" height="360" fill="url(#pgtSky)" />

        {/* ── Full Moon with Halo & Pixel Craters ── */}
        <circle cx="510" cy="62" r="46" fill="url(#pgtMoonGlow)" />
        <circle cx="510" cy="62" r="22" fill="#fff7e5" />
        <rect x="502" y="55" width="5" height="4" fill="#edd9b4" />
        <rect x="518" y="62" width="6" height="5" fill="#edd9b4" />
        <rect x="508" y="70" width="4" height="3" fill="#edd9b4" />

        {/* ── Twinkling Pixel Stars ── */}
        <g fill="#fdf6e3">
          {[
            [24, 18, 0], [58, 36, 0.4], [94, 22, 1.2], [132, 45, 0.8], [178, 16, 1.5],
            [216, 38, 0.2], [260, 20, 1.9], [302, 42, 0.6], [344, 24, 1.4], [386, 36, 0.3],
            [428, 18, 1.7], [468, 48, 0.9], [560, 26, 0.5], [604, 38, 1.1], [624, 16, 1.8],
            [40, 75, 0.7], [80, 95, 1.3], [148, 80, 0.1], [230, 90, 1.6], [360, 85, 0.4],
            [450, 92, 1.0], [575, 82, 1.5], [610, 98, 0.3],
          ].map(([x, y, d], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width="2"
              height="2"
              className="pgt__star"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
          {/* Cross Sparkle Stars */}
          {[
            [108, 32], [284, 52], [412, 28], [588, 54]
          ].map(([x, y], i) => (
            <g key={`sparkle-${i}`} className="pgt__star" style={{ animationDelay: `${i * 0.7}s` }}>
              <rect x={x - 1} y={y} width="3" height="1" />
              <rect x={x} y={y - 1} width="1" height="3" />
            </g>
          ))}
        </g>

        {/* ── Drifting Pixel Clouds ── */}
        <g opacity="0.65">
          <g className="pgt__cloud pgt__cloud--1" fill="#dfc8e8">
            <rect x="8" y="0" width="28" height="4" />
            <rect x="2" y="4" width="42" height="4" />
            <rect x="0" y="8" width="50" height="4" />
          </g>
          <g className="pgt__cloud pgt__cloud--2" fill="#f2e2f6">
            <rect x="12" y="0" width="34" height="4" />
            <rect x="4" y="4" width="52" height="4" />
            <rect x="0" y="8" width="60" height="3" />
          </g>
          <g className="pgt__cloud pgt__cloud--3" fill="#ceb2d6">
            <rect x="6" y="0" width="24" height="3" />
            <rect x="2" y="3" width="34" height="3" />
            <rect x="0" y="6" width="40" height="3" />
          </g>
          {/* Center Cloud in Upper Sky (Directly visible in phoneview) */}
          <g className="pgt__cloud pgt__cloud--4" fill="#eed9f5">
            <rect x="8" y="0" width="20" height="3" />
            <rect x="2" y="3" width="32" height="3" />
            <rect x="0" y="6" width="38" height="3" />
          </g>
        </g>

        {/* ── Subtle Shooting Star / Meteor ── */}
        <g className="pgt__meteor">
          <line x1="0" y1="0" x2="-16" y2="-8" stroke="url(#pgtMeteorGlow)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="0" cy="0" r="1.2" fill="#ffffff" />
        </g>

        {/* ── Dynamic Sweeping Searchlight Beams ── */}
        <g>
          <polygon
            points="148,275 152,275 80,0 20,0"
            fill="url(#pgtBeam1)"
            className="pgt__beam pgt__beam--left"
          />
          <polygon
            points="518,285 522,285 600,0 660,0"
            fill="url(#pgtBeam2)"
            className="pgt__beam pgt__beam--right"
          />
        </g>

        {/* ── Layer 1: Distant Skyline & Suspension Bridge Silhouette ── */}
        <g fill="#10142b">
          <rect x="52" y="165" width="4" height="115" />
          <rect x="50" y="160" width="8" height="6" />
          <rect x="53" y="156" width="2" height="4" fill="#ff3848" className="pgt__beacon" />

          <rect x="212" y="180" width="18" height="100" />
          <polygon points="221,162 212,180 230,180" />
          <rect x="220" y="152" width="2" height="10" />
          <rect x="220" y="150" width="2" height="2" fill="#59e8ff" className="pgt__beacon" />

          {/* Distant Suspension Bridge */}
          <g>
            <rect x="282" y="196" width="14" height="84" />
            <rect x="280" y="192" width="18" height="5" />
            <polygon points="289,182 284,192 294,192" />
            <rect x="285" y="214" width="8" height="14" fill="#0c122c" />
            <rect x="285" y="242" width="8" height="18" fill="#0c122c" />

            <rect x="352" y="196" width="14" height="84" />
            <rect x="350" y="192" width="18" height="5" />
            <polygon points="359,182 354,192 364,192" />
            <rect x="355" y="214" width="8" height="14" fill="#0c122c" />
            <rect x="355" y="242" width="8" height="18" fill="#0c122c" />

            <rect x="240" y="258" width="168" height="4" fill="#141934" />
            <path
              d="M246 258 Q282 242 289 192 Q318 248 359 192 Q366 242 402 258"
              stroke="#1b2246"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M246 258 Q282 242 289 192 Q318 248 359 192 Q366 242 402 258"
              stroke="#ffd266"
              strokeWidth="1.2"
              strokeDasharray="2 6"
              fill="none"
              opacity="0.85"
              className="pgt__bridgeLights"
            />
          </g>

          <rect x="428" y="182" width="16" height="98" />
          <polygon points="436,168 428,182 444,182" />
          <rect x="435" y="158" width="2" height="10" />
          <rect x="435" y="156" width="2" height="2" fill="#ff3848" className="pgt__beacon" />
        </g>

        {/* Horizon Warm Smog Glow */}
        <rect y="250" width="640" height="45" fill="url(#pgtHaze)" />

        {/* ── Layer 2: Midground Skyscrapers (The Metropolis Canyon) ── */}
        <g>
          {/* Left Skyscraper 1 */}
          <g>
            <rect x="18" y="175" width="40" height="155" fill="#151b34" />
            <rect x="16" y="172" width="44" height="4" fill="#242c50" />
            {[185, 202, 219, 236, 253, 270, 287].map((y, r) =>
              [24, 34, 44].map((x, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="7"
                  fill={(r + c) % 3 === 0 ? "#ffd994" : (r + c) % 4 === 0 ? "#7be8ff" : "#0e1326"}
                  opacity={(r + c) % 3 === 0 || (r + c) % 4 === 0 ? 0.9 : 0.6}
                />
              ))
            )}
          </g>

          {/* Tower 2: Tall Deco Spire with Water Tower (Web Line Anchor Tower!) */}
          <g>
            <rect x="62" y="142" width="46" height="188" fill="#222c54" stroke="#2e3c70" strokeWidth="0.8" />
            <rect x="60" y="138" width="50" height="5" fill="#3a4878" />
            <rect x="68" y="126" width="34" height="12" fill="#222c54" />
            <rect x="74" y="118" width="22" height="8" fill="#3a4878" />
            <rect x="84" y="104" width="2" height="14" fill="#788bb8" />
            <rect x="83" y="102" width="4" height="3" fill="#ff3b48" className="pgt__beacon" />

            {/* Rooftop Water Tower */}
            <rect x="94" y="122" width="12" height="14" fill="#664630" />
            <polygon points="100,116 93,122 107,122" fill="#4a3222" />
            <line x1="95" y1="136" x2="95" y2="138" stroke="#222" strokeWidth="1" />
            <line x1="105" y1="136" x2="105" y2="138" stroke="#222" strokeWidth="1" />

            {[150, 168, 186, 204, 222, 240, 258, 276].map((y, r) =>
              [68, 78, 88, 98].map((x, c) => (
                <rect
                  key={`w2-${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="7"
                  fill={(r * 2 + c) % 5 === 0 ? "#ffdf9e" : (r + c) % 3 === 1 ? "#ffeabf" : "#141c38"}
                />
              ))
            )}
          </g>

          {/* Tower 3: OSCORP TOWER with Glowing Green Neon Sign */}
          <g>
            <rect x="112" y="188" width="44" height="142" fill="#201530" />
            <rect x="110" y="184" width="48" height="5" fill="#322248" />
            <rect x="116" y="194" width="36" height="11" fill="#0d0a14" stroke="#00ff9d" strokeWidth="0.8" />
            <text
              x="134"
              y="202.5"
              textAnchor="middle"
              fill="#00ff9d"
              fontSize="6"
              fontFamily="var(--pg-arcade)"
              letterSpacing="0.8"
              className="pgt__neonGreen"
            >
              OSCORP
            </text>

            {[212, 228, 244, 260, 276].map((y, r) =>
              [118, 128, 138, 146].map((x, c) => (
                <rect
                  key={`osc-${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="6"
                  fill={(r + c) % 2 === 0 ? "#00ff9d" : "#ffd288"}
                  opacity={(r + c) % 2 === 0 ? 0.75 : 0.85}
                />
              ))
            )}
          </g>

          {/* Tower 4 */}
          <g>
            <rect x="160" y="224" width="34" height="106" fill="#171d38" />
            <rect x="158" y="220" width="38" height="4" fill="#283258" />
            {[232, 248, 264, 280].map((y, r) =>
              [166, 176, 184].map((x, c) => (
                <rect
                  key={`t4-${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="6"
                  fill={(r + c) % 3 === 0 ? "#ffd79a" : "#10152a"}
                />
              ))
            )}
          </g>

          {/* Low Center Horizon Skyline */}
          <g>
            {[
              { x: 198, w: 28, h: 52, c: "#1b213e" },
              { x: 230, w: 32, h: 44, c: "#221734" },
              { x: 266, w: 38, h: 58, c: "#171c36" },
              { x: 308, w: 34, h: 48, c: "#1e1632" },
              { x: 346, w: 42, h: 62, c: "#18203c" },
              { x: 392, w: 28, h: 46, c: "#221734" },
              { x: 424, w: 30, h: 56, c: "#171d38" },
            ].map((b, i) => (
              <g key={`mid-c-${i}`}>
                <rect x={b.x} y={330 - b.h} width={b.w} height={b.h} fill={b.c} />
                <rect x={b.x} y={330 - b.h} width={b.w} height="3" fill="#2a3356" />
                <rect x={b.x + 4} y={330 - b.h - 5} width="8" height="5" fill="#3a446a" />
                <rect x={b.x + b.w - 10} y={330 - b.h - 8} width="2" height="8" fill="#586796" />
                {Array.from({ length: 3 }).map((_, r) => (
                  <rect
                    key={r}
                    x={b.x + 6 + (r * 8) % (b.w - 8)}
                    y={330 - b.h + 8 + r * 10}
                    width="3"
                    height="4"
                    fill={(i + r) % 2 === 0 ? "#ffd998" : "#101426"}
                    className={(i + r) % 2 === 0 && (i + r) % 3 === 0 ? "pgt__windowGlow" : undefined}
                    style={{ animationDelay: `${(i * 0.9 + r * 0.5) % 4}s` }}
                  />
                ))}
              </g>
            ))}
          </g>

          {/* Right Skyscraper Cluster */}
          {/* Tower 5 */}
          <g>
            <rect x="458" y="222" width="32" height="108" fill="#181e3a" />
            <rect x="456" y="218" width="36" height="4" fill="#28325a" />
            {[228, 244, 260, 276].map((y, r) =>
              [464, 474, 482].map((x, c) => (
                <rect
                  key={`t5-${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="6"
                  fill={(r + c) % 3 === 0 ? "#ffd79a" : "#0e1326"}
                />
              ))
            )}
          </g>

          {/* Tower 6: DAILY BUGLE */}
          <g>
            <rect x="494" y="162" width="48" height="168" fill="#24162e" />
            <rect x="492" y="158" width="52" height="5" fill="#362244" />
            <rect x="498" y="166" width="40" height="13" fill="#100a16" stroke="#ff3848" strokeWidth="0.8" />
            <text
              x="518"
              y="175"
              textAnchor="middle"
              fill="#ff4d5a"
              fontSize="5"
              fontFamily="var(--pg-arcade)"
              letterSpacing="0.4"
              className="pgt__neonRed"
            >
              DAILY BUGLE
            </text>

            {[188, 206, 224, 242, 260, 278].map((y, r) =>
              [502, 512, 522, 532].map((x, c) => (
                <rect
                  key={`db-${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="7"
                  fill={(r + c) % 4 === 0 ? "#ff5264" : (r + c) % 3 === 0 ? "#ffe2a4" : "#120e1e"}
                />
              ))
            )}
          </g>

          {/* Tower 7: Grand Empire Art-Deco Spire */}
          <g>
            <rect x="546" y="132" width="50" height="198" fill="#1b2344" />
            <rect x="544" y="128" width="54" height="5" fill="#2d3766" />
            <rect x="552" y="116" width="38" height="12" fill="#1b2344" />
            <rect x="560" y="106" width="22" height="10" fill="#2d3766" />
            <rect x="570" y="86" width="2" height="20" fill="#6677aa" />
            <rect x="569" y="84" width="4" height="3" fill="#ff3b48" className="pgt__beacon" />

            {[142, 160, 178, 196, 214, 232, 250, 268].map((y, r) =>
              [552, 562, 572, 584].map((x, c) => (
                <rect
                  key={`t7-${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="7"
                  fill={(r + c) % 2 === 0 ? "#ffd892" : (r * 2 + c) % 3 === 0 ? "#7ce7ff" : "#10162c"}
                />
              ))
            )}
          </g>

          {/* Tower 8 */}
          <g>
            <rect x="600" y="180" width="38" height="150" fill="#151b34" />
            <rect x="598" y="176" width="42" height="4" fill="#262f54" />
            <rect x="614" y="162" width="12" height="14" fill="#543a28" />
            <polygon points="620,156 613,162 627,162" fill="#38251a" />
            {[192, 208, 224, 240, 256, 272].map((y, r) =>
              [606, 616, 626].map((x, c) => (
                <rect
                  key={`t8-${r}-${c}`}
                  x={x}
                  y={y}
                  width="4"
                  height="6"
                  fill={(r + c) % 3 === 0 ? "#ffd998" : "#0e1326"}
                />
              ))
            )}
          </g>
        </g>

        {/* ── Layer 3: Metropolis Expressway & Traffic ── */}
        <g>
          <rect y="330" width="640" height="30" fill="#0d1124" />
          <rect y="328" width="640" height="2" fill="#1e2646" />

          {[40, 110, 180, 250, 320, 390, 460, 530, 600].map((x) => (
            <g key={`lamp-${x}`}>
              <line x1={x} y1="328" x2={x} y2="320" stroke="#4d5c8a" strokeWidth="1.2" />
              <rect x={x - 2} y="318" width="4" height="2" fill="#ffd780" />
              <polygon
                points={`${x - 12},330 ${x + 12},330 ${x + 2},320 ${x - 2},320`}
                fill="#ffd780"
                opacity="0.12"
              />
            </g>
          ))}

          {/* Westbound Headlights (continuous seamless loop) */}
          <g className="pgt__trafficWest">
            {[-50, 20, 90, 160, 230, 300, 370, 440, 510, 580, 650, 720].map((x, i) => (
              <g key={`hl-${i}`}>
                <rect x={x} y="334" width="8" height="2" fill="#fff5d0" opacity="0.9" />
                <polygon points={`${x - 8},336 ${x},336 ${x},334 ${x - 8},334`} fill="#fff5d0" opacity="0.25" />
              </g>
            ))}
          </g>

          {/* Eastbound Taillights (continuous seamless loop) */}
          <g className="pgt__trafficEast">
            {[-25, 45, 115, 185, 255, 325, 395, 465, 535, 605, 675, 745].map((x, i) => (
              <g key={`tl-${i}`}>
                <rect x={x} y="342" width="7" height="2" fill="#ff3848" opacity="0.95" />
                <polygon points={`${x},344 ${x + 8},344 ${x + 8},342 ${x},342`} fill="#ff3848" opacity="0.3" />
              </g>
            ))}
          </g>
        </g>

        {/* ── Layer 4: Foreground Perch & Heroic Spider-Man ── */}
        <g>
          {/* Rooftop Parapet Wall */}
          <path d="M0 268 L84 268 L104 286 L104 360 L0 360Z" fill="#070a16" />
          <rect x="0" y="265" width="86" height="3" fill="#171f38" />
          <path d="M84 265 L106 284 L104 287 L82 268Z" fill="#1b2440" />

          {[278, 292, 306, 320, 334, 348].map((y, r) => (
            <line
              key={`brick-${y}`}
              x1="6"
              y1={y}
              x2={r % 2 === 0 ? "76" : "90"}
              y2={y}
              stroke="#0f162e"
              strokeWidth="1"
            />
          ))}

          {/* Stone Gargoyle Cornice Perch */}
          <path d="M80 274 L114 274 L120 280 L110 286 L78 286Z" fill="#12182e" />
          <path d="M114 274 L124 280 L114 284Z" fill="#1e284c" />

          {/* ── Fixed Spider-Man Thread: Anchored firmly to Skyscraper Cornice ── */}
          <g>
            {/* Anchor web splatter on building corner */}
            <circle cx="68" cy="142" r="4" fill="#ffffff" opacity="0.95" />
            <circle cx="68" cy="142" r="7" stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.6" />
            <line x1="63" y1="137" x2="73" y2="147" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
            <line x1="63" y1="147" x2="73" y2="137" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
            {/* Natural taut web line running from Spidey's hand directly to anchor */}
            <path
              d="M 116 264 Q 94 206 68 142"
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeDasharray="4 1"
              fill="none"
              opacity="0.9"
              className="pgt__webLine"
            />
          </g>

          {/* ── The Hero: Pixel Spider-Man Crouched on Gargoyle ── */}
          <g transform="translate(102, 252)">
            {/* Mask & Head */}
            <rect x="5" y="0" width="10" height="8" fill="#e62838" />
            <rect x="4" y="2" width="12" height="5" fill="#e62838" />
            <rect x="4" y="3" width="5" height="4" fill="#0d0e18" />
            <rect x="11" y="3" width="5" height="4" fill="#0d0e18" />
            <rect x="5" y="4" width="3" height="2" fill="#ffffff" />
            <rect x="12" y="4" width="3" height="2" fill="#ffffff" />
            <rect x="9" y="1" width="2" height="7" fill="#c71f2e" />

            {/* Torso */}
            <rect x="6" y="8" width="8" height="6" fill="#e62838" />
            <rect x="4" y="9" width="2" height="4" fill="#1d4ed8" />
            <rect x="14" y="9" width="2" height="4" fill="#1d4ed8" />
            <rect x="9" y="9" width="2" height="3" fill="#0d0e18" />
            <line x1="7" y1="9" x2="13" y2="9" stroke="#0d0e18" strokeWidth="0.8" />

            {/* Legs & Boots */}
            <rect x="3" y="13" width="4" height="4" fill="#1d4ed8" />
            <rect x="13" y="13" width="4" height="4" fill="#1d4ed8" />
            <rect x="2" y="17" width="5" height="4" fill="#e62838" />
            <rect x="13" y="17" width="5" height="4" fill="#e62838" />

            {/* Planted Hands & Web-Shooter */}
            <rect x="1" y="15" width="3" height="3" fill="#e62838" />
            <rect x="14" y="12" width="3" height="3" fill="#e62838" />
          </g>
        </g>
      </svg>

      {/* ── Ambient CRT Vignette ── */}
      <div className="pgt__vignette" aria-hidden="true" />

      {/* ── Clean Heroic Title (No Black Frame Box!) ── */}
      <div className="pgt__content">
        {/* 3D Giant Heroic Title */}
        <h1 className="pgt__title">
          <span className="pgt__titleTop">Aayush&apos;s</span>
          <span className="pgt__titleBig">EXPERIMENTS</span>
        </h1>

        {/* One way in. A second button here only delayed the decision. */}
        <nav className="pgt__menu" aria-label="Game Menu">
          {MENU.map((item, i) => (
            <button
              key={item.label}
              type="button"
              className={`pgt__item ${item.primary ? "pgt__item--primary" : ""} ${
                sel === i ? "is-sel" : ""
              }`}
              onClick={() => executeItem(i)}
              onMouseEnter={() => setSel(i)}
            >
              <span className="pgt__cursor" aria-hidden="true">
                ▶
              </span>
              <span>
                {item.action === "play" && waiting ? "Loading…" : item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* doubles as the loader's status line */}
        <p className="pgt__hint">
          {ready ? "Press Enter to start" : "Loading the city…"}
        </p>
      </div>
    </div>
  );
}

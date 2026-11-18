"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./title.css";

/*
  The /playground title screen.

  Built after the SNES convention: one illustrated scene, the logo over
  it, and a single thing to press. Everything is drawn as SVG — pixel
  shapes on a coarse grid rather than smooth vectors — so it costs
  nothing to download and stays crisp at any size.

  The scene animates on CSS alone: drifting cloud banks, twinkling stars,
  a sweeping lighthouse beam, flickering windows, a boat crossing the bay
  and a shimmering sea. No JavaScript runs per frame, so a title screen
  left open in a tab costs nothing.
*/

const MENU = [
  { label: "Enter the city", href: "/playground/city-of-creators", primary: true },
  { label: "Back to site", href: "/" },
];

/* deterministic pseudo-random, so the skyline is the same every visit */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 34 }, (_, i) => ({
  x: Math.round(rnd(i + 1) * 318) + 1,
  y: Math.round(rnd(i + 40) * 74) + 4,
  d: (i % 7) * 0.45,
}));

const BUILDINGS = [
  { x: 84, w: 16, h: 34, c: "#6f7384", r: "#565b6d" },
  { x: 104, w: 12, h: 48, c: "#8a5a4a", r: "#6f4639" },
  { x: 120, w: 20, h: 38, c: "#4b6b74", r: "#3a555d" },
  { x: 144, w: 14, h: 58, c: "#7d6a86", r: "#64546c" },
  { x: 162, w: 22, h: 42, c: "#6f7384", r: "#565b6d" },
  { x: 188, w: 12, h: 30, c: "#8a5a4a", r: "#6f4639" },
  { x: 204, w: 16, h: 36, c: "#4b6b74", r: "#3a555d" },
  { x: 224, w: 12, h: 26, c: "#7d6a86", r: "#64546c" },
];

export default function TitleScreen() {
  const [sel, setSel] = useState(0);

  /* arrow keys and Enter, because a title screen that ignores the
     keyboard is a web page wearing a game as a costume */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "s") {
        e.preventDefault();
        setSel((s) => (s + 1) % MENU.length);
      } else if (k === "arrowup" || k === "w") {
        e.preventDefault();
        setSel((s) => (s - 1 + MENU.length) % MENU.length);
      } else if (k === "enter") {
        const item = MENU[sel];
        if (item) window.location.href = item.href;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  return (
    <div className="pgt">
      <svg className="pgt__scene" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="pgtSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d1130" />
            <stop offset=".38" stopColor="#2b2b63" />
            <stop offset=".66" stopColor="#7b4a7c" />
            <stop offset=".86" stopColor="#d2794f" />
            <stop offset="1" stopColor="#f0b267" />
          </linearGradient>
          <linearGradient id="pgtSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f4874" />
            <stop offset="1" stopColor="#0c1a36" />
          </linearGradient>
          <radialGradient id="pgtMoon" cx=".5" cy=".5" r=".5">
            <stop offset=".55" stopColor="#fdf6e3" />
            <stop offset="1" stopColor="#fdf6e3" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="320" height="200" fill="url(#pgtSky)" />

        {/* the moon, with a halo and craters */}
        <g className="pgt__moon">
          <circle cx="258" cy="36" r="26" fill="url(#pgtMoon)" opacity=".4" />
          <rect x="250" y="28" width="16" height="16" fill="#fdf6e3" />
          <rect x="248" y="30" width="20" height="12" fill="#fdf6e3" />
          <rect x="254" y="32" width="3" height="3" fill="#e6dcc2" />
          <rect x="260" y="37" width="2" height="2" fill="#e6dcc2" />
          <rect x="257" y="29" width="2" height="2" fill="#e6dcc2" />
        </g>

        {STARS.map((s, i) => (
          <rect
            key={i}
            className="pgt__star"
            x={s.x}
            y={s.y}
            width="2"
            height="2"
            fill="#fdf6e3"
            style={{ animationDelay: `${s.d}s` }}
          />
        ))}

        {/* three cloud banks, drifting at different speeds for depth */}
        <g className="pgt__clouds pgt__clouds--far">
          {[20, 120, 232].map((x) => (
            <g key={x} fill="#e8dcf0" opacity=".32" transform={`translate(${x} 30)`}>
              <rect x="6" y="0" width="16" height="3" />
              <rect x="2" y="3" width="26" height="3" />
            </g>
          ))}
        </g>
        <g className="pgt__clouds pgt__clouds--mid">
          {[0, 150, 270].map((x) => (
            <g key={x} fill="#f3e9f6" opacity=".6" transform={`translate(${x} 52)`}>
              <rect x="8" y="0" width="20" height="4" />
              <rect x="3" y="4" width="32" height="4" />
              <rect x="0" y="8" width="38" height="4" />
            </g>
          ))}
        </g>
        <g className="pgt__clouds pgt__clouds--near">
          {[60, 210].map((x) => (
            <g key={x} fill="#fdf6e3" opacity=".8" transform={`translate(${x} 74)`}>
              <rect x="10" y="0" width="24" height="4" />
              <rect x="4" y="4" width="38" height="5" />
            </g>
          ))}
        </g>

        {/* birds */}
        <g className="pgt__birds" stroke="#2b2447" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M0 0c3-3 6-3 9 0M9 0c3-3 6-3 9 0" />
          <path d="M22 7c2-2 4-2 6 0M28 7c2-2 4-2 6 0" />
          <path d="M14 14c2-2 4-2 6 0M20 14c2-2 4-2 6 0" />
        </g>

        {/* sea, with shimmer rows that breathe */}
        <rect y="132" width="320" height="68" fill="url(#pgtSea)" />
        {[138, 148, 158, 170, 184].map((y, i) => (
          <rect
            key={y}
            className="pgt__shimmer"
            x="0"
            y={y}
            width="320"
            height="2"
            fill="#5f93c4"
            opacity=".4"
            style={{ animationDelay: `${i * 0.6}s` }}
          />
        ))}
        {/* the moon's reflection */}
        <g className="pgt__shimmer" opacity=".45">
          {[140, 150, 162, 176].map((y, i) => (
            <rect key={y} x={252 - i * 2} y={y} width={12 + i * 4} height="2" fill="#f0e2c2" />
          ))}
        </g>

        {/* a boat crossing the bay */}
        <g className="pgt__boat">
          <rect x="0" y="6" width="16" height="4" fill="#4a3426" />
          <rect x="2" y="9" width="12" height="2" fill="#38281c" />
          <rect x="7" y="0" width="2" height="6" fill="#6b5340" />
          <rect x="9" y="1" width="6" height="4" fill="#e8dcc2" />
        </g>

        {/* the island */}
        <g>
          <path d="M52 154 L88 138 L236 138 L272 154 L250 176 L74 176Z" fill="#b8955c" />
          <path d="M62 152 L94 140 L230 140 L260 152 L244 166 L78 166Z" fill="#4e9a52" />
          <path d="M62 152 L94 140 L230 140 L260 152 L260 154 L62 154Z" fill="#62b566" />
          {/* a path up to the city */}
          <path d="M150 166 L158 166 L162 142 L156 142Z" fill="#c9a86a" opacity=".8" />
        </g>

        {/* the skyline, with windows that flicker */}
        <g>
          {BUILDINGS.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={140 - b.h} width={b.w} height={b.h} fill={b.c} />
              <rect x={b.x} y={140 - b.h} width={b.w} height="3" fill={b.r} />
              <rect x={b.x} y={140 - b.h} width="2" height={b.h} fill="rgba(255,255,255,0.1)" />
              {Array.from({ length: Math.floor(b.h / 9) }).map((_, r) =>
                Array.from({ length: Math.floor(b.w / 6) }).map((_, q) => {
                  const seed = i * 31 + r * 7 + q;
                  const lit = rnd(seed) > 0.35;
                  return (
                    <rect
                      key={`${r}-${q}`}
                      className={lit ? "pgt__win" : undefined}
                      x={b.x + 2 + q * 6}
                      y={140 - b.h + 7 + r * 9}
                      width="3"
                      height="4"
                      fill={lit ? "#ffd79a" : "#2a2f3c"}
                      style={lit ? { animationDelay: `${(seed % 11) * 0.9}s` } : undefined}
                    />
                  );
                })
              )}
            </g>
          ))}

          {/* the lighthouse, with a beam that sweeps */}
          <rect x="242" y="98" width="10" height="42" fill="#55495a" />
          <rect x="242" y="98" width="3" height="42" fill="rgba(255,255,255,0.12)" />
          <rect x="240" y="94" width="14" height="5" fill="#6d5f73" />
          <rect x="245" y="88" width="4" height="6" fill="#59e8ff" className="pgt__beacon" />
          <g className="pgt__beam">
            <path d="M247 91 L320 70 L320 112Z" fill="#9df3ff" opacity=".16" />
          </g>
        </g>

        {/* palms on the shore */}
        {[70, 252].map((x) => (
          <g key={x} className="pgt__palm">
            <rect x={x} y="124" width="3" height="16" fill="#6b4a2e" />
            <rect x={x - 7} y="120" width="17" height="3" fill="#3e8a4c" />
            <rect x={x - 4} y="116" width="11" height="3" fill="#4fa55d" />
          </g>
        ))}
      </svg>

      <div className="pgt__vignette" aria-hidden />

      <div className="pgt__content">
        <p className="pgt__kicker">Aayush Visuals presents</p>
        <h1 className="pgt__title">
          <span className="pgt__titleTop">Aayush&apos;s</span>
          <span className="pgt__titleBig">EXPERIMENTS</span>
        </h1>
        <p className="pgt__sub">An open world. Eight things I built, hidden in it.</p>

        <nav className="pgt__menu">
          {MENU.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`pgt__item ${item.primary ? "pgt__item--primary" : ""} ${
                sel === i ? "is-sel" : ""
              }`}
              onMouseEnter={() => setSel(i)}
            >
              <span className="pgt__cursor" aria-hidden>
                ▶
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="pgt__hint">↑ ↓ to choose · Enter to start</p>
      </div>
    </div>
  );
}

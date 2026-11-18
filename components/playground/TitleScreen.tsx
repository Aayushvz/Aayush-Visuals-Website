"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./title.css";

/*
  The /playground title screen.

  Built after the SNES convention: one illustrated scene, the logo sitting
  over it, and a single thing to press. Everything is drawn as SVG — pixel
  shapes on a coarse grid rather than smooth vectors — so it costs nothing
  to download and stays crisp at any size.

  The city on the island is the same city the game drops you into, which
  is the point: the title screen is a postcard of the place.
*/

const MENU = [
  { label: "Enter the city", href: "/playground/city-of-creators", primary: true },
  { label: "The experiments", href: "#shelf" },
  { label: "Back to site", href: "/" },
];

export default function TitleScreen() {
  const [sel, setSel] = useState(0);

  /* arrow keys and Enter, because a title screen that ignores the
     keyboard is a web page wearing a game's clothes */
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
            <stop offset="0" stopColor="#1b2250" />
            <stop offset=".45" stopColor="#3a3f7a" />
            <stop offset=".75" stopColor="#8a5a86" />
            <stop offset="1" stopColor="#d88b63" />
          </linearGradient>
          <linearGradient id="pgtSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d3b63" />
            <stop offset="1" stopColor="#102041" />
          </linearGradient>
        </defs>

        <rect width="320" height="200" fill="url(#pgtSky)" />

        {/* stars, on the pixel grid */}
        <g fill="#fdf6e3" opacity=".8">
          {[
            [18, 14], [46, 28], [74, 10], [108, 24], [142, 16], [176, 30],
            [210, 12], [244, 26], [278, 18], [302, 34], [92, 42], [228, 46],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" />
          ))}
        </g>

        {/* clouds: stacked bars, never ellipses — an ellipse at this scale
            turns to mush and stops reading as pixel art */}
        {[
          { x: 30, y: 54, s: 1 },
          { x: 238, y: 44, s: 1.3 },
          { x: 150, y: 66, s: 0.8 },
        ].map((c, i) => (
          <g key={i} fill="#f3e9f6" opacity=".9" transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <rect x="6" y="0" width="18" height="4" />
            <rect x="2" y="4" width="28" height="4" />
            <rect x="0" y="8" width="34" height="4" />
          </g>
        ))}

        {/* sea */}
        <rect y="130" width="320" height="70" fill="url(#pgtSea)" />
        <g fill="#3f6ea8" opacity=".55">
          {[136, 146, 156, 168, 182].map((y) => (
            <rect key={y} x={(y * 7) % 40} y={y} width="320" height="2" />
          ))}
        </g>

        {/* the island */}
        <g>
          <path d="M60 150 L92 136 L228 136 L262 150 L244 170 L78 170Z" fill="#c9a86a" />
          <path d="M70 148 L98 138 L222 138 L252 148 L238 162 L84 162Z" fill="#4e9a52" />
          <path d="M70 148 L98 138 L222 138 L252 148 L252 150 L70 150Z" fill="#62b566" />
        </g>

        {/* the city on it, echoing the game's own blocks */}
        <g>
          {[
            { x: 92, w: 16, h: 30, c: "#6f7384", r: "#565b6d" },
            { x: 112, w: 12, h: 44, c: "#8a5a4a", r: "#6f4639" },
            { x: 128, w: 18, h: 36, c: "#4b6b74", r: "#3a555d" },
            { x: 150, w: 14, h: 52, c: "#7d6a86", r: "#64546c" },
            { x: 168, w: 20, h: 40, c: "#6f7384", r: "#565b6d" },
            { x: 192, w: 12, h: 28, c: "#8a5a4a", r: "#6f4639" },
            { x: 208, w: 14, h: 34, c: "#4b6b74", r: "#3a555d" },
          ].map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={140 - b.h} width={b.w} height={b.h} fill={b.c} />
              <rect x={b.x} y={140 - b.h} width={b.w} height="3" fill={b.r} />
              {Array.from({ length: Math.floor(b.h / 8) }).map((_, r) =>
                Array.from({ length: Math.floor(b.w / 6) }).map((_, q) => {
                  const lit = (i + r + q) % 3 !== 0;
                  return (
                    <rect
                      key={`${r}-${q}`}
                      x={b.x + 2 + q * 6}
                      y={140 - b.h + 6 + r * 8}
                      width="3"
                      height="4"
                      fill={lit ? "#ffd79a" : "#2a2f3c"}
                    />
                  );
                })
              )}
            </g>
          ))}
          {/* the tower, with a beacon */}
          <rect x="232" y="104" width="10" height="36" fill="#55495a" />
          <rect x="230" y="100" width="14" height="5" fill="#6d5f73" />
          <rect x="235" y="96" width="4" height="4" fill="#59e8ff" className="pgt__beacon" />
        </g>

        {/* palms, so the island is not all concrete */}
        {[78, 246].map((x) => (
          <g key={x}>
            <rect x={x} y="126" width="3" height="14" fill="#6b4a2e" />
            <rect x={x - 6} y="122" width="15" height="3" fill="#3e8a4c" />
            <rect x={x - 3} y="118" width="9" height="3" fill="#4fa55d" />
          </g>
        ))}
      </svg>

      <div className="pgt__vignette" aria-hidden />

      <div className="pgt__content">
        <p className="pgt__kicker">Aayush Visuals presents</p>
        <h1 className="pgt__title">
          <span className="pgt__titleTop">City of</span>
          <span className="pgt__titleBig">CREATORS</span>
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

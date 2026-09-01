"use client";

import { useMemo } from "react";
import PageLink from "./PageLink";

/*
  Sea of Stars Inspired Footer Component
  A breathtaking, interactive retro-gaming night scene featuring:
  - Deep twilight sky gradient with animated twinkling stars
  - Shimmering pixelated ocean with animated horizon glow and wave layers
  - Intricate SVG pixel-art cliff campfire scene on left with characters & glowing fire
  - Right jungle foliage framing the night ocean
  - Center glowing Sea of Stars typography, crown-skull emblem, and copyright
  - Bottom dock with the back-to-top control and corner flourishes
*/

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const SOCIALS = [
  {
    label: "Behance",
    href: "https://www.behance.net/AAYUSHVISUALS",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 7h7a3 3 0 0 1 0 6H3zM3 13h7.5a3.2 3.2 0 0 1 0 6.4H3z" />
        <path d="M15.5 9.5h6M14.5 16a3.5 3.5 0 0 0 6.9.7 3.5 3.5 0 0 0-3.4-4.2c-2 0-3.5 1.6-3.5 3.5Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/aayush.visuals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/aayushvz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "GitHub",
    href: "https://github.com/Aayushvz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:aayushrajvz@gmail.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

export default function Footer() {
  // Generate 70 deterministic twinkling stars for the night sky
  const stars = useMemo<Star[]>(() => {
    const list: Star[] = [];
    // Pseudo-random seed generator for deterministic SSR hydration
    let seed = 12345;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 70; i++) {
      list.push({
        id: i,
        x: rand() * 96 + 2, // 2% to 98% width
        y: rand() * 62 + 3, // 3% to 65% height (above ocean horizon)
        size: rand() * 2.5 + 1, // 1px to 3.5px
        duration: rand() * 3 + 2, // 2s to 5s
        delay: rand() * 4, // 0s to 4s
        opacity: rand() * 0.5 + 0.4, // 0.4 to 0.9
      });
    }
    return list;
  }, []);

  return (
    <footer className="footer siteFooter seaFooter">
      {/* ==================== THE NIGHT SCENE ==================== */}
      <div className="seaFooter__scene">
        {/* Deep Twilight Sky & Starfield */}
        <div className="seaFooter__sky">
          {stars.map((star) => (
            <span
              key={star.id}
              className="seaFooter__star"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
          {/* Constellation / Shooting star highlights */}
          <div className="seaFooter__shootingStar seaFooter__shootingStar--1" />
          <div className="seaFooter__shootingStar seaFooter__shootingStar--2" />
        </div>

        {/* The Shimmering Ocean & Glowing Horizon Line */}
        <div className="seaFooter__ocean">
          <div className="seaFooter__horizonGlow" />
          <div className="seaFooter__wavesWrapper">
            <div className="seaFooter__waveLayer seaFooter__waveLayer--1" />
            <div className="seaFooter__waveLayer seaFooter__waveLayer--2" />
            <div className="seaFooter__waveLayer seaFooter__waveLayer--3" />
          </div>
        </div>

        {/* Left Side: Cliff Shoreline with Cozy Pixel Campfire & Characters */}
        <div className="seaFooter__cliffLeft" aria-hidden>
          <svg viewBox="0 0 650 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="seaFooter__cliffSvg">
            {/* Dark Cliff Shoreline & Rock Silhouettes */}
            <path d="M0 450V220C40 220 80 235 120 250C160 265 190 280 240 290C290 300 340 330 380 360C430 395 500 420 650 450H0Z" fill="#090510" />
            <path d="M0 450V260C35 260 70 275 105 290C145 305 180 320 220 335C270 355 310 375 360 405C410 430 480 445 600 450H0Z" fill="#110a1f" />
            <path d="M0 450V310C30 310 60 325 90 340C125 355 160 370 200 385C240 400 280 420 330 440C370 450 420 450 480 450H0Z" fill="#1a102e" />

            {/* Hanging Tropical Jungle Leaves on Top Left */}
            <path d="M0 0V180C20 160 40 140 55 110C70 80 75 50 80 0H0Z" fill="#070b14" />
            <path d="M40 0C45 40 60 80 90 120C115 150 145 170 180 180C140 160 110 120 95 80C85 50 85 20 90 0H40Z" fill="#0a1220" />
            <path d="M120 0C125 30 140 60 165 90C190 115 220 135 255 145C220 130 190 100 175 70C165 45 165 20 170 0H120Z" fill="#0d1829" />
            <path d="M0 140C30 145 60 160 85 185C110 210 125 240 130 270C110 240 80 215 45 200C25 190 10 185 0 185V140Z" fill="#08101a" />

            {/* Warm Campfire Radial Glow Reflection on Rocks */}
            <circle cx="210" cy="335" r="140" fill="url(#campfireGlow)" opacity="0.85" />
            <defs>
              <radialGradient id="campfireGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff9d00" stopOpacity="0.5" />
                <stop offset="40%" stopColor="#ff5500" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Campfire Wood Logs */}
            <path d="M175 365L245 330" stroke="#3d2314" strokeWidth="12" strokeLinecap="round" />
            <path d="M245 365L175 330" stroke="#4a2c1a" strokeWidth="12" strokeLinecap="round" />
            <path d="M185 350L235 350" stroke="#2c180e" strokeWidth="10" strokeLinecap="round" />

            {/* Flickering Campfire Flames (Outer Red, Mid Orange, Core Yellow/White) */}
            <g className="seaFooter__flameGroup">
              <path d="M210 345C185 345 175 315 185 285C195 255 210 220 210 220C210 220 225 255 235 285C245 315 235 345 210 345Z" fill="#ff3300" />
              <path d="M210 340C192 340 185 315 192 290C200 265 210 238 210 238C210 238 220 265 228 290C235 315 228 340 210 340Z" fill="#ff7700" />
              <path d="M210 338C198 338 194 320 198 300C204 280 210 258 210 258C210 258 216 280 222 300C226 320 222 338 210 338Z" fill="#ffcc00" />
              <path d="M210 335C203 335 200 324 203 310C207 295 210 278 210 278C210 278 213 295 217 310C220 324 217 335 210 335Z" fill="#ffffff" />
            </g>

            {/* Pixel Character 1 Sitting Left of Fire (Purple Hair / Cloak) */}
            <g transform="translate(135, 310)">
              <rect x="10" y="20" width="24" height="30" rx="6" fill="#1e1535" />
              <circle cx="22" cy="12" r="10" fill="#fbd0b9" />
              <path d="M12 10C12 4 16 2 22 2C28 2 32 6 32 12C32 14 30 16 26 16H14C12 14 12 12 12 10Z" fill="#a78bfa" />
              {/* Warm fire glow reflection on face/cloak */}
              <path d="M32 8C34 10 34 14 32 16V30C34 28 36 24 36 20C36 14 34 10 32 8Z" fill="#ff9d00" opacity="0.6" />
            </g>

            {/* Pixel Character 2 Sitting Right of Fire (Orange/Warm Vest, Playing Lute/Stick) */}
            <g transform="translate(260, 290)">
              <rect x="8" y="22" width="28" height="32" rx="6" fill="#8c3b1a" />
              <circle cx="22" cy="12" r="11" fill="#fbd0b9" />
              <path d="M11 10C11 3 16 1 22 1C28 1 33 4 33 11C33 14 31 16 27 16H15C12 15 11 13 11 10Z" fill="#d97706" />
              <rect x="4" y="32" width="16" height="8" rx="4" fill="#4b5563" transform="rotate(-20 4 32)" />
              {/* Warm fire glow reflection on left side */}
              <path d="M8 8C6 10 6 14 8 16V34C6 32 4 28 4 24C4 16 6 10 8 8Z" fill="#ffcc00" opacity="0.7" />
            </g>
          </svg>
        </div>

        {/* Right Side: Dark Cliff & Tropical Palm Foliage Framing */}
        <div className="seaFooter__cliffRight" aria-hidden>
          <svg viewBox="0 0 550 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="seaFooter__jungleSvg">
            {/* Right Shoreline Rocks */}
            <path d="M550 450V210C510 220 470 235 430 255C390 275 360 295 320 320C280 345 240 375 190 405C140 430 80 445 0 450H550Z" fill="#070913" />
            <path d="M550 450V270C515 280 480 295 445 315C410 335 375 355 335 380C295 405 250 430 180 450H550Z" fill="#0d1424" />
            
            {/* Hanging Right Palm Fronds */}
            <path d="M550 0V220C525 195 505 170 490 135C475 100 470 65 465 0H550Z" fill="#060b14" />
            <path d="M510 0C505 45 490 90 460 135C435 170 400 195 360 210C400 185 435 145 450 100C460 65 465 30 460 0H510Z" fill="#091220" />
            <path d="M440 0C435 35 420 70 395 105C370 135 335 160 295 175C335 155 365 120 380 85C390 55 390 25 385 0H440Z" fill="#0c182a" />
            <path d="M550 160C520 165 490 180 465 205C440 230 425 260 420 295C440 265 470 240 505 225C525 215 540 210 550 210V160Z" fill="#08101c" />
          </svg>
        </div>

        {/* ==================== CENTER TYPOGRAPHY & BRANDING ==================== */}
        <div className="seaFooter__center">
          <h2 className="seaFooter__title">
            <span className="seaFooter__titleLine1">aayush</span>
            <span className="seaFooter__titleLine2">visuals</span>
          </h2>

          {/* Floating Pixel Crown-Skull Emblem */}
          <div className="seaFooter__emblem" aria-hidden>
            <svg viewBox="0 0 64 64" fill="none" className="seaFooter__skullSvg">
              {/* Tilted Floating Crown */}
              <path d="M20 12L24 22L32 14L40 22L44 12L48 24H16L20 12Z" fill="#a78bfa" className="seaFooter__crown" />
              {/* Pixel Skull Head */}
              <rect x="18" y="27" width="28" height="22" rx="8" fill="#1e1333" stroke="#a78bfa" strokeWidth="2.5" />
              {/* Eye Sockets with Purple Glow */}
              <circle cx="26" cy="36" r="4.5" fill="#6d28d9" />
              <circle cx="26" cy="36" r="2" fill="#a78bfa" />
              <circle cx="38" cy="36" r="4.5" fill="#6d28d9" />
              <circle cx="38" cy="36" r="2" fill="#a78bfa" />
              {/* Nose Cavity */}
              <path d="M32 40L29 44H35L32 40Z" fill="#a78bfa" />
              {/* Teeth / Jaw */}
              <rect x="22" y="49" width="4" height="6" rx="1.5" fill="#a78bfa" />
              <rect x="28" y="49" width="4" height="6" rx="1.5" fill="#a78bfa" />
              <rect x="34" y="49" width="4" height="6" rx="1.5" fill="#a78bfa" />
              <rect x="40" y="49" width="4" height="6" rx="1.5" fill="#a78bfa" />
            </svg>
          </div>

          {/* Relocated Social Buttons in Center Scene */}
          <div className="seaFooter__centerSocials">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="seaFooter__socialBtn"
                aria-label={s.label.toLowerCase()}
                title={s.label.toLowerCase()}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== BOTTOM OST AUDIO & SOCIALS DOCK ==================== */}
      <div className="seaFooter__dockWrapper">
        <div className="seaFooter__dock">
          {/* Left Decorative Corner Flourish */}
          <div className="seaFooter__flourish seaFooter__flourish--left" aria-hidden>
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M4 36V12C4 7.5 7.5 4 12 4H36" stroke="#a78bfa" strokeWidth="2" strokeOpacity="0.6" />
              <path d="M8 32V16C8 11.5 11.5 8 16 8H32" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.4" />
              <circle cx="12" cy="12" r="2.5" fill="#a78bfa" />
            </svg>
          </div>

          {/* Right Side: Back to Top */}
          <div className="seaFooter__actions">
            <button
              type="button"
              className="seaFooter__topBtn"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="scroll back to top"
              title="back to top"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Right Decorative Corner Flourish */}
          <div className="seaFooter__flourish seaFooter__flourish--right" aria-hidden>
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M36 36V12C36 7.5 32.5 4 28 4H4" stroke="#a78bfa" strokeWidth="2" strokeOpacity="0.6" />
              <path d="M32 32V16C32 11.5 28.5 8 24 8H8" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.4" />
              <circle cx="28" cy="12" r="2.5" fill="#a78bfa" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}

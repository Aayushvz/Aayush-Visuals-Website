"use client";

import { PERSON_NAME } from "@/lib/site";

/*
  Sea of Stars Inspired Footer Component
  Optimized retro-gaming night scene featuring:
  - Deep twilight sky gradient with static pre-computed starfield & diffraction crosses
  - Shimmering nocturnal ocean with soft horizon glow, atmospheric mist, and campfire reflections
  - Richly illustrated cliff campfire scene:
    - Ring of river stones around glowing charcoal coals
    - Organic multi-tiered flickering flame with floating rising embers
    - Traveler 1 (cloaked wanderer warming hands over the heat)
    - Traveler 2 (companion resting on rock, roasting a marshmallow on a willow stick)
    - Steaming camp kettle and coastal grass tufts
  - Right coastal cliff with windswept pine tree silhouette & tropical fronds
  - Center glowing Sea of Stars typography, Shotsu mascot emblem, and social links
  - Bottom dock carrying the colophon line
  - Zero hydration overhead: static pre-computed star/ember data, composite-only GPU animations
*/

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  isBright?: boolean;
  color?: string;
}

interface Ember {
  id: number;
  offsetX: number;
  offsetY: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
}

// Pre-computed static starfield: 0 runtime JS calculations, 0 hydration mismatch
const STARS: Star[] = [
  { id: 0, x: 11.3, y: 53.0, size: 3.9, duration: 2.6, delay: 0.0, opacity: 0.95, isBright: true, color: "#ffffff" },
  { id: 1, x: 75.5, y: 38.1, size: 2.7, duration: 4.5, delay: 1.3, opacity: 0.49, color: "#ffffff" },
  { id: 2, x: 78.1, y: 62.0, size: 1.4, duration: 3.3, delay: 0.1, opacity: 0.52, color: "#ffffff" },
  { id: 3, x: 85.0, y: 15.5, size: 2.7, duration: 3.1, delay: 3.7, opacity: 0.82, color: "#ffffff" },
  { id: 4, x: 62.4, y: 33.7, size: 1.5, duration: 4.8, delay: 1.3, opacity: 0.84, color: "#fef08a" },
  { id: 5, x: 91.4, y: 6.1, size: 2.7, duration: 4.7, delay: 1.4, opacity: 0.45, color: "#ede9fe" },
  { id: 6, x: 58.0, y: 17.6, size: 1.5, duration: 5.0, delay: 1.2, opacity: 0.64, color: "#ede9fe" },
  { id: 7, x: 60.0, y: 32.9, size: 3.1, duration: 4.0, delay: 1.3, opacity: 0.95, isBright: true, color: "#ede9fe" },
  { id: 8, x: 14.1, y: 34.9, size: 1.3, duration: 3.9, delay: 0.7, opacity: 0.70, color: "#fef08a" },
  { id: 9, x: 34.2, y: 40.5, size: 1.9, duration: 2.7, delay: 0.6, opacity: 0.65, color: "#ffffff" },
  { id: 10, x: 16.4, y: 28.9, size: 1.6, duration: 3.1, delay: 2.3, opacity: 0.43, color: "#ede9fe" },
  { id: 11, x: 58.0, y: 26.9, size: 1.7, duration: 4.7, delay: 0.7, opacity: 0.58, color: "#e0f2fe" },
  { id: 12, x: 87.1, y: 61.8, size: 2.0, duration: 4.3, delay: 2.8, opacity: 0.50, color: "#ffffff" },
  { id: 13, x: 42.7, y: 50.4, size: 2.1, duration: 3.2, delay: 1.5, opacity: 0.53, color: "#e0f2fe" },
  { id: 14, x: 15.2, y: 29.9, size: 3.6, duration: 2.6, delay: 0.1, opacity: 0.95, isBright: true, color: "#ffffff" },
  { id: 15, x: 63.1, y: 30.3, size: 2.3, duration: 2.7, delay: 2.8, opacity: 0.42, color: "#ede9fe" },
  { id: 16, x: 72.8, y: 58.7, size: 2.3, duration: 3.3, delay: 0.6, opacity: 0.74, color: "#fef08a" },
  { id: 17, x: 33.7, y: 28.0, size: 1.4, duration: 2.8, delay: 1.1, opacity: 0.76, color: "#ffffff" },
  { id: 18, x: 45.2, y: 50.3, size: 2.4, duration: 3.4, delay: 2.8, opacity: 0.47, color: "#ffffff" },
  { id: 19, x: 88.4, y: 42.9, size: 2.6, duration: 3.0, delay: 3.5, opacity: 0.61, color: "#ffffff" },
  { id: 20, x: 30.3, y: 52.1, size: 2.2, duration: 4.7, delay: 2.1, opacity: 0.68, color: "#fef08a" },
  { id: 21, x: 88.5, y: 16.5, size: 3.6, duration: 4.2, delay: 2.0, opacity: 0.95, isBright: true, color: "#ede9fe" },
  { id: 22, x: 45.9, y: 46.2, size: 2.6, duration: 2.5, delay: 0.5, opacity: 0.55, color: "#ffffff" },
  { id: 23, x: 71.8, y: 7.3, size: 2.7, duration: 4.0, delay: 2.2, opacity: 0.44, color: "#ffffff" },
  { id: 24, x: 30.0, y: 12.6, size: 1.4, duration: 3.1, delay: 2.9, opacity: 0.54, color: "#e0f2fe" },
  { id: 25, x: 33.6, y: 56.0, size: 1.7, duration: 3.2, delay: 0.4, opacity: 0.85, color: "#fef08a" },
  { id: 26, x: 4.5, y: 49.1, size: 2.6, duration: 4.1, delay: 1.7, opacity: 0.63, color: "#e0f2fe" },
  { id: 27, x: 25.2, y: 37.1, size: 2.2, duration: 4.5, delay: 1.3, opacity: 0.73, color: "#ffffff" },
  { id: 28, x: 84.6, y: 50.8, size: 3.8, duration: 3.5, delay: 2.5, opacity: 0.95, isBright: true, color: "#ffffff" },
  { id: 29, x: 53.1, y: 56.4, size: 2.0, duration: 4.4, delay: 1.2, opacity: 0.51, color: "#fef08a" },
  { id: 30, x: 60.4, y: 34.2, size: 2.3, duration: 4.7, delay: 0.7, opacity: 0.66, color: "#ffffff" },
  { id: 31, x: 28.6, y: 47.1, size: 1.3, duration: 4.0, delay: 3.6, opacity: 0.48, color: "#ffffff" },
  { id: 32, x: 68.8, y: 6.2, size: 2.8, duration: 4.3, delay: 3.3, opacity: 0.49, color: "#ffffff" },
  { id: 33, x: 49.8, y: 56.8, size: 2.0, duration: 4.6, delay: 1.3, opacity: 0.53, color: "#ffffff" },
  { id: 34, x: 36.8, y: 35.3, size: 2.3, duration: 4.4, delay: 0.6, opacity: 0.72, color: "#ffffff" },
  { id: 35, x: 18.2, y: 27.7, size: 3.5, duration: 2.7, delay: 3.5, opacity: 0.95, isBright: true, color: "#ffffff" },
  { id: 36, x: 11.1, y: 17.8, size: 1.8, duration: 4.6, delay: 1.4, opacity: 0.78, color: "#ffffff" },
  { id: 37, x: 93.2, y: 17.8, size: 2.5, duration: 3.5, delay: 2.2, opacity: 0.83, color: "#e0f2fe" },
  { id: 38, x: 62.0, y: 27.0, size: 1.5, duration: 2.6, delay: 2.6, opacity: 0.43, color: "#ffffff" },
  { id: 39, x: 24.6, y: 44.7, size: 1.2, duration: 3.5, delay: 1.8, opacity: 0.73, color: "#ffffff" },
  { id: 40, x: 81.3, y: 27.8, size: 1.9, duration: 4.5, delay: 1.1, opacity: 0.50, color: "#e0f2fe" },
  { id: 41, x: 69.1, y: 6.9, size: 1.3, duration: 4.6, delay: 2.1, opacity: 0.64, color: "#ffffff" },
  { id: 42, x: 47.1, y: 38.3, size: 2.6, duration: 3.0, delay: 0.3, opacity: 0.95, isBright: true, color: "#ede9fe" },
  { id: 43, x: 77.1, y: 45.8, size: 2.2, duration: 4.0, delay: 0.8, opacity: 0.60, color: "#ffffff" },
  { id: 44, x: 6.7, y: 16.9, size: 2.3, duration: 4.4, delay: 3.9, opacity: 0.58, color: "#ffffff" },
  { id: 45, x: 45.8, y: 48.5, size: 2.7, duration: 5.0, delay: 0.1, opacity: 0.73, color: "#ede9fe" },
  { id: 46, x: 40.8, y: 56.6, size: 1.3, duration: 3.3, delay: 1.9, opacity: 0.74, color: "#ffffff" },
  { id: 47, x: 89.7, y: 9.6, size: 2.3, duration: 4.8, delay: 0.3, opacity: 0.55, color: "#ede9fe" },
  { id: 48, x: 80.3, y: 27.8, size: 1.9, duration: 4.5, delay: 2.2, opacity: 0.82, color: "#ede9fe" },
  { id: 49, x: 85.8, y: 12.6, size: 3.2, duration: 4.2, delay: 0.7, opacity: 0.95, isBright: true, color: "#ffffff" },
  { id: 50, x: 54.3, y: 43.2, size: 2.6, duration: 4.9, delay: 1.2, opacity: 0.54, color: "#e0f2fe" },
  { id: 51, x: 7.7, y: 12.5, size: 1.9, duration: 4.1, delay: 2.5, opacity: 0.57, color: "#e0f2fe" },
  { id: 52, x: 37.0, y: 28.7, size: 1.9, duration: 2.7, delay: 3.8, opacity: 0.65, color: "#ffffff" },
  { id: 53, x: 57.1, y: 6.4, size: 2.5, duration: 3.4, delay: 2.9, opacity: 0.81, color: "#fef08a" },
  { id: 54, x: 71.3, y: 18.2, size: 1.4, duration: 4.1, delay: 1.8, opacity: 0.53, color: "#ffffff" },
  { id: 55, x: 31.0, y: 62.3, size: 2.6, duration: 3.7, delay: 0.6, opacity: 0.66, color: "#ffffff" },
];

// Pre-computed static embers: 0 runtime JS calculations
const EMBERS: Ember[] = [
  { id: 0, offsetX: 8.7, offsetY: 4.6, size: 2.1, duration: 3.4, delay: 2.4, driftX: 6.5 },
  { id: 1, offsetX: -4.4, offsetY: 1.0, size: 2.8, duration: 4.1, delay: 1.9, driftX: -4.5 },
  { id: 2, offsetX: -6.6, offsetY: 7.2, size: 1.7, duration: 3.9, delay: 0.2, driftX: 0.4 },
  { id: 3, offsetX: -14.5, offsetY: 9.4, size: 1.5, duration: 2.4, delay: 0.9, driftX: 8.3 },
  { id: 4, offsetX: 5.5, offsetY: 1.7, size: 3.1, duration: 2.8, delay: 0.6, driftX: -6.8 },
  { id: 5, offsetX: 10.8, offsetY: 6.9, size: 1.8, duration: 3.9, delay: 0.4, driftX: -7.9 },
  { id: 6, offsetX: 1.5, offsetY: 12.3, size: 3.0, duration: 3.5, delay: 2.5, driftX: 8.9 },
  { id: 7, offsetX: 1.7, offsetY: 2.6, size: 1.9, duration: 3.8, delay: 1.3, driftX: -6.4 },
  { id: 8, offsetX: -9.6, offsetY: 2.4, size: 3.0, duration: 2.6, delay: 2.5, driftX: -4.0 },
  { id: 9, offsetX: 9.8, offsetY: 1.2, size: 3.1, duration: 2.2, delay: 3.0, driftX: 10.7 },
  { id: 10, offsetX: -14.0, offsetY: 2.9, size: 2.5, duration: 2.8, delay: 2.3, driftX: 9.8 },
  { id: 11, offsetX: 8.4, offsetY: 3.3, size: 3.2, duration: 3.9, delay: 1.1, driftX: 16.0 },
];

const SOCIALS = [
  {
    label: "Behance",
    href: "https://www.behance.net/AAYUSHVISUALS",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
        <g transform="scale(0.86) translate(1.95 2.01)">
          <path d="M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z" />
        </g>
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
  return (
    <footer className="footer siteFooter seaFooter">
      {/* ==================== THE NIGHT SCENE ==================== */}
      <div className="seaFooter__scene">
        {/* Deep Twilight Sky & Starfield */}
        <div className="seaFooter__sky">
          {STARS.map((star) => (
            <span
              key={star.id}
              className={`seaFooter__star ${star.isBright ? "seaFooter__star--bright" : ""}`}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.color,
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
          <div className="seaFooter__horizonMist" />
          <div className="seaFooter__waterReflection" />
          <div className="seaFooter__wavesWrapper">
            <svg
              className="seaFooter__oceanSvg"
              viewBox="0 0 1440 280"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.08" />
                  <stop offset="25%" stopColor="#a78bfa" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#c4b5fd" stopOpacity="0.15" />
                  <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.05" />
                  <stop offset="35%" stopColor="#a78bfa" stopOpacity="0.25" />
                  <stop offset="65%" stopColor="#818cf8" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="waveGrad3" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.1" />
                  <stop offset="45%" stopColor="#c084fc" stopOpacity="0.28" />
                  <stop offset="70%" stopColor="#e9d5ff" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0.05" />
                </linearGradient>
                {/* Campfire water specular highlight overlay */}
                <linearGradient id="fireWaterSheen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff7700" stopOpacity="0.45" />
                  <stop offset="20%" stopColor="#ffaa00" stopOpacity="0.28" />
                  <stop offset="40%" stopColor="#ff5500" stopOpacity="0.1" />
                  <stop offset="60%" stopColor="#ff5500" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Gentle undulating nocturnal water swells and shimmer lines */}
              <g className="seaFooter__waveRibbon seaFooter__waveRibbon--1">
                <path
                  d="M-40 45 Q 160 35, 360 48 T 760 42 T 1160 48 T 1500 40"
                  stroke="url(#waveGrad1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 45 Q 180 43, 340 46"
                  stroke="url(#fireWaterSheen)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>

              <g className="seaFooter__waveRibbon seaFooter__waveRibbon--2">
                <path
                  d="M-20 110 Q 180 98, 420 114 T 880 106 T 1280 114 T 1500 104"
                  stroke="url(#waveGrad2)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M0 110 Q 140 106, 280 112"
                  stroke="url(#fireWaterSheen)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>

              <g className="seaFooter__waveRibbon seaFooter__waveRibbon--3">
                <path
                  d="M-50 185 Q 220 170, 500 190 T 980 178 T 1360 190 T 1520 176"
                  stroke="url(#waveGrad3)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M0 185 Q 120 180, 240 188"
                  stroke="url(#fireWaterSheen)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>

              {/* Distant delicate calm water glints */}
              <line x1="420" y1="22" x2="480" y2="22" stroke="#e9d5ff" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" />
              <line x1="680" y1="18" x2="770" y2="18" stroke="#e9d5ff" strokeWidth="1.4" strokeOpacity="0.5" strokeLinecap="round" />
              <line x1="920" y1="26" x2="980" y2="26" stroke="#c4b5fd" strokeWidth="1.2" strokeOpacity="0.35" strokeLinecap="round" />
              <line x1="560" y1="72" x2="630" y2="72" stroke="#c4b5fd" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
              <line x1="810" y1="78" x2="900" y2="78" stroke="#ddd6fe" strokeWidth="1.5" strokeOpacity="0.4" strokeLinecap="round" />
              <line x1="1040" y1="68" x2="1110" y2="68" stroke="#c4b5fd" strokeWidth="1.2" strokeOpacity="0.3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Left Side: Shoreline Cliff Campfire Scene with Realistic Vector Art */}
        <div className="seaFooter__cliffLeft" aria-hidden>
          {/* Animated floating campfire embers rising into the night sky */}
          {EMBERS.map((ember) => (
            <span
              key={ember.id}
              className="seaFooter__ember"
              style={{
                left: `calc(32.3% + ${ember.offsetX}px)`,
                bottom: `calc(23.3% + ${ember.offsetY}px)`,
                width: `${ember.size}px`,
                height: `${ember.size}px`,
                animationDuration: `${ember.duration}s`,
                animationDelay: `${ember.delay}s`,
                // @ts-expect-error CSS custom property
                "--drift-x": `${ember.driftX}px`,
              }}
            />
          ))}

          <svg viewBox="0 0 650 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="seaFooter__cliffSvg">
            <defs>
              {/* Radial Campfire Glow on Ground & Rocks */}
              <radialGradient id="campfireGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.55" />
                <stop offset="35%" stopColor="#ff5500" stopOpacity="0.28" />
                <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
              </radialGradient>

              {/* Glowing Charcoal Coal Bed */}
              <radialGradient id="coalsGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffdd55" />
                <stop offset="40%" stopColor="#ff6600" />
                <stop offset="80%" stopColor="#cc2200" />
                <stop offset="100%" stopColor="#3d0a04" />
              </radialGradient>

              {/* Flame Gradients */}
              <linearGradient id="outerFlameGrad" x1="0.5" y1="1" x2="0.5" y2="0">
                <stop offset="0%" stopColor="#ff3700" />
                <stop offset="60%" stopColor="#ff7700" />
                <stop offset="100%" stopColor="#ffaa00" stopOpacity="0" />
              </linearGradient>

              <linearGradient id="midFlameGrad" x1="0.5" y1="1" x2="0.5" y2="0">
                <stop offset="0%" stopColor="#e11d48" />
                <stop offset="30%" stopColor="#ea580c" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>

              <linearGradient id="goldFlameGrad" x1="0.5" y1="1" x2="0.5" y2="0">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>

              {/* Soft Core Radial Glow (pure vector, 0 raster filter) */}
              <radialGradient id="coreGlowGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#ffea75" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#ffa500" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background Cliff Silhouette */}
            <path
              d="M0 450V210C45 212 90 228 135 245C180 262 215 278 265 290C315 302 365 330 405 360C455 395 520 420 650 450H0Z"
              fill="#080410"
            />
            {/* Midground Rocky Shelf & Shoreline */}
            <path
              d="M0 450V255C40 256 80 270 120 286C160 302 195 318 240 334C290 352 330 374 380 404C430 430 495 444 600 450H0Z"
              fill="#0f091c"
            />
            {/* Foreground Main Camp Plateau */}
            <path
              d="M0 450V305C35 306 70 320 105 335C140 350 180 366 225 380C270 395 310 415 360 436C400 448 440 450 500 450H0Z"
              fill="#180e2b"
            />

            {/* Lush Coastal Fronds / Tropical Boughs Overhanging Top Left */}
            <path d="M0 0V190C22 168 45 145 62 114C78 82 84 50 90 0H0Z" fill="#070b14" />
            <path d="M42 0C48 42 64 84 96 126C122 158 154 178 190 188C148 168 116 126 100 84C90 52 90 20 95 0H42Z" fill="#0a1220" />
            <path d="M125 0C130 32 146 64 172 96C198 122 230 142 268 152C230 136 198 106 182 74C172 48 172 20 176 0H125Z" fill="#0d1829" />
            <path d="M0 145C32 150 64 166 90 192C116 218 132 250 136 282C116 250 84 224 48 208C26 198 10 192 0 192V145Z" fill="#08101a" />

            {/* Warm Radial Campfire Glow Breathing on Ground & Rocks */}
            <g className="seaFooter__fireGlow">
              <circle cx="210" cy="345" r="145" fill="url(#campfireGlow)" />
            </g>

            {/* The Natural Firepit with Textured Stones & Charcoal Bed */}
            <g className="seaFooter__fireRing">
              {/* Back Stones (in shadow behind fire) */}
              <ellipse cx="180" cy="344" rx="9" ry="6" fill="#1b1226" stroke="#2d1c40" strokeWidth="0.8" />
              <ellipse cx="196" cy="341" rx="10" ry="6" fill="#1e142b" stroke="#332047" strokeWidth="0.8" />
              <ellipse cx="214" cy="340" rx="11" ry="6.5" fill="#20152e" stroke="#382250" strokeWidth="0.8" />
              <ellipse cx="232" cy="341" rx="10" ry="6" fill="#1e142b" stroke="#332047" strokeWidth="0.8" />
              <ellipse cx="246" cy="345" rx="9" ry="6" fill="#1b1226" stroke="#2d1c40" strokeWidth="0.8" />

              {/* Glowing Charcoal Coal Bed */}
              <ellipse cx="212" cy="350" rx="34" ry="14" fill="#2a0c06" />
              <ellipse cx="212" cy="350" rx="26" ry="9" fill="url(#coalsGlow)" />

              {/* Charred Firewood Logs with Bark & Glowing Ember Ends */}
              <g className="seaFooter__logs">
                {/* Log 1 (Left to Right-Back) */}
                <path d="M174 362 C186 352 230 334 246 330 C250 333 248 338 244 340 C228 344 186 363 176 368 Z" fill="#26140b" stroke="#ff5500" strokeWidth="0.5" strokeOpacity="0.4" />
                <ellipse cx="175" cy="365" rx="3" ry="5" fill="#3d2112" transform="rotate(-25 175 365)" />

                {/* Log 2 (Right to Left-Back) */}
                <path d="M248 362 C236 352 192 334 176 330 C172 333 174 338 178 340 C194 344 236 363 246 368 Z" fill="#2e180d" stroke="#ff7700" strokeWidth="0.5" strokeOpacity="0.5" />
                <ellipse cx="247" cy="365" rx="3" ry="5" fill="#442514" transform="rotate(25 247 365)" />

                {/* Log 3 (Center Front) */}
                <path d="M188 358 C202 355 220 355 234 358 C232 363 204 366 188 363 Z" fill="#1a0d06" />
              </g>

              {/* Front Stones (catching bright amber fire rim light) */}
              <ellipse cx="170" cy="354" rx="10" ry="7" fill="#251636" stroke="#ff9d00" strokeWidth="0.9" strokeOpacity="0.6" />
              <ellipse cx="184" cy="364" rx="11" ry="8" fill="#2a193d" stroke="#ffaa00" strokeWidth="1" strokeOpacity="0.75" />
              <ellipse cx="202" cy="371" rx="13" ry="8.5" fill="#2e1b43" stroke="#ffbb22" strokeWidth="1.2" strokeOpacity="0.85" />
              <ellipse cx="222" cy="371" rx="13" ry="8.5" fill="#2e1b43" stroke="#ffbb22" strokeWidth="1.2" strokeOpacity="0.85" />
              <ellipse cx="240" cy="364" rx="11" ry="8" fill="#2a193d" stroke="#ffaa00" strokeWidth="1" strokeOpacity="0.75" />
              <ellipse cx="254" cy="354" rx="10" ry="7" fill="#251636" stroke="#ff9d00" strokeWidth="0.9" strokeOpacity="0.6" />
            </g>

            {/* Flickering Campfire Flame with Organic Curves & Leaping Tongues */}
            <g className="seaFooter__flameGroup">
              {/* Outer Fiery Corona / Heat Haze */}
              <path
                d="M211 352 C178 350 162 316 178 280 C190 250 210 205 211 205 C212 205 232 250 244 280 C260 316 244 350 211 352 Z"
                fill="url(#outerFlameGrad)"
                opacity="0.35"
              />

              {/* Outer Crimson / Deep Orange Tongues */}
              <path
                d="M211 348 C182 346 172 320 183 288 C191 264 205 240 210 218 C213 238 217 252 227 266 C237 280 248 300 246 322 C244 340 232 347 211 348 Z"
                fill="url(#midFlameGrad)"
              />

              {/* Leaping Left Flame Curl */}
              <path
                d="M204 342 C186 338 180 318 189 295 C195 280 199 265 200 250 C202 268 206 282 208 300 C210 322 216 338 204 342 Z"
                fill="#ff8800"
                opacity="0.9"
              />

              {/* Leaping Right Flame Curl */}
              <path
                d="M218 342 C234 338 240 318 232 295 C226 278 221 265 220 250 C219 266 216 282 214 300 C212 322 208 338 218 342 Z"
                fill="#ffa500"
                opacity="0.85"
              />

              {/* Core Golden Flame Spire */}
              <path
                d="M211 345 C194 343 190 324 196 302 C202 280 210 250 211 234 C212 250 220 280 226 302 C232 324 228 343 211 345 Z"
                fill="url(#goldFlameGrad)"
              />

              {/* White-Hot Intense Combustion Core */}
              <path
                d="M211 344 C201 343 198 330 203 314 C207 298 211 275 211 262 C211 275 215 298 219 314 C224 330 221 343 211 344 Z"
                fill="#ffffff"
                opacity="0.95"
              />
              <ellipse cx="211" cy="336" rx="8" ry="14" fill="url(#coreGlowGrad)" />
            </g>

            {/* Traveler 1 (Left: Cloaked Voyager warming hands by the fire) */}
            <g className="seaFooter__travelerLeft">
              {/* Seating Boulder */}
              <path d="M115 385 C125 352 155 348 185 362 C190 376 182 396 160 405 C135 408 120 400 115 385 Z" fill="#160c26" stroke="#25153d" strokeWidth="1" />

              {/* Travel Backpack resting behind the traveler */}
              <rect x="108" y="328" width="22" height="34" rx="6" fill="#11091e" stroke="#221238" strokeWidth="1" transform="rotate(-8 108 328)" />
              {/* Rolled Bedroll / sleeping mat on top of pack */}
              <rect x="104" y="318" width="28" height="11" rx="5" fill="#1d1230" stroke="#321f4e" strokeWidth="1" transform="rotate(-6 104 318)" />
              <line x1="112" y1="318" x2="112" y2="329" stroke="#ff9d00" strokeWidth="0.8" strokeOpacity="0.4" />
              <line x1="124" y1="318" x2="124" y2="329" stroke="#ff9d00" strokeWidth="0.8" strokeOpacity="0.4" />

              {/* Seated Body / Cloak drape */}
              <path
                d="M130 380 C132 355 140 338 148 324 C142 328 135 342 130 360 C126 372 128 378 130 380 Z"
                fill="#0e0719"
              />
              {/* Main Cloaked Torso & Folded Legs */}
              <path
                d="M142 322 C146 312 154 306 164 308 C172 312 174 322 172 334 C168 348 174 360 182 368 C185 372 182 376 174 376 C160 376 146 368 138 356 C134 345 138 332 142 322 Z"
                fill="#19102c"
              />
              {/* Folded Knee and Boot */}
              <path d="M165 352 C174 350 184 358 186 368 C186 374 180 376 172 374 C164 370 162 360 165 352 Z" fill="#130b22" />
              <path d="M178 368 L188 374 L182 377 L174 373 Z" fill="#0b0614" />

              {/* Hooded Head angled toward fire */}
              <path
                d="M150 286 C152 274 162 268 172 272 C180 276 182 286 178 296 C174 304 165 308 156 304 C150 300 148 292 150 286 Z"
                fill="#22153d"
              />
              {/* Face profile in shadow inside the hood */}
              <path d="M170 282 C172 284 174 288 173 292 C171 294 169 295 168 294 C167 292 168 286 170 282 Z" fill="#e2a784" />
              {/* Hood Rim & Cloak Fold Highlight catching warm firelight */}
              <path
                d="M174 274 C180 279 181 288 178 298 C174 306 172 316 171 326 C170 334 172 344 178 354 C184 362 186 368 186 372"
                stroke="#ffaa33"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
              />

              {/* Arms reaching forward warming hands over fire */}
              <path
                d="M162 322 C168 322 176 324 186 326 C192 327 195 329 198 328 C201 327 202 324 199 322 C194 320 188 318 180 318 C172 318 165 320 162 322 Z"
                fill="#251642"
              />
              {/* Hands illuminated in golden firelight */}
              <path d="M195 324 C198 322 203 323 205 326 C204 328 200 330 197 329 Z" fill="#ffb86c" />
              <path d="M194 327 C197 326 201 328 202 331 C200 332 196 333 194 331 Z" fill="#ffa040" />
            </g>

            {/* Traveler 2 (Right: Companion relaxing and roasting a marshmallow on a stick) */}
            <g className="seaFooter__travelerRight">
              {/* Seating Rock Shelf */}
              <path d="M265 382 C275 358 308 354 338 368 C342 384 330 406 305 412 C280 412 268 402 265 382 Z" fill="#140b22" stroke="#221238" strokeWidth="1" />

              {/* Relaxed Seated Torso & Jacket */}
              <path
                d="M280 326 C284 316 294 312 304 316 C312 322 314 334 310 348 C306 362 312 372 320 380 C316 384 306 385 296 382 C286 378 280 368 278 354 C276 342 278 332 280 326 Z"
                fill="#201335"
              />
              {/* Seated Leg with bent knee */}
              <path d="M282 352 C274 352 266 360 264 370 C264 376 270 380 278 378 C286 374 288 362 282 352 Z" fill="#180e29" />
              <path d="M264 372 L254 376 L258 380 L266 376 Z" fill="#0b0614" />
              {/* Trailing other leg resting down slope */}
              <path d="M298 364 C306 368 316 378 318 390 L308 394 C304 384 298 376 294 370 Z" fill="#120920" />

              {/* Head & Stylized Wanderer Hair */}
              <ellipse cx="292" cy="285" rx="11" ry="13" fill="#e2a784" />
              {/* Hair Silhouette framing face */}
              <path
                d="M284 274 C290 268 302 268 308 276 C314 284 312 296 308 304 C304 298 302 292 298 290 C294 288 288 292 284 298 C282 290 280 280 284 274 Z"
                fill="#0e0719"
              />
              {/* Firelight rim on companion's face and jacket */}
              <path
                d="M283 282 C281 286 281 292 283 296 C282 302 280 310 279 320 C277 330 276 342 278 352 C276 360 268 366 264 372"
                stroke="#ffbb33"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
              />

              {/* Arm holding long willow skewer */}
              <path
                d="M286 326 C280 326 272 328 264 332 C260 334 258 338 261 340 C264 341 268 339 272 336 C278 333 284 332 288 330 Z"
                fill="#24153b"
              />
              {/* Hand grasping the stick */}
              <circle cx="261" cy="336" r="3" fill="#ffb86c" />

              {/* Slender Willow Skewer extending towards fire */}
              <line x1="262" y1="336" x2="224" y2="340" stroke="#78502d" strokeWidth="1.5" strokeLinecap="round" />
              {/* Glowing toasted marshmallow at tip of skewer */}
              <rect x="221" y="337" width="6" height="5" rx="2" fill="#ffeed1" stroke="#c26a10" strokeWidth="0.8" />
              <circle cx="224" cy="339.5" r="5" fill="#ffaa00" opacity="0.35" />
            </g>

            {/* Small Camp Kettle resting on flat rock beside fire */}
            <g className="seaFooter__kettle" transform="translate(238, 350)">
              <ellipse cx="6" cy="12" rx="7" ry="3" fill="#0d0716" />
              <path d="M0 11 C0 5 3 2 7 2 C11 2 14 5 14 11 Z" fill="#1b1228" stroke="#ff7700" strokeWidth="0.6" strokeOpacity="0.5" />
              {/* Kettle Handle */}
              <path d="M2 3 C2 -2 12 -2 12 3" stroke="#2c1a40" strokeWidth="1.2" fill="none" />
              {/* Spout */}
              <path d="M12 7 L17 4 L16 9 Z" fill="#1b1228" />
              {/* Delicate Steam Wisp */}
              <path d="M17 3 C18 0 16 -3 18 -6 C19 -8 18 -11 20 -14" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.35" fill="none" strokeLinecap="round" />
            </g>

            {/* Tufts of wild coastal grass catching firelight */}
            <g className="seaFooter__grassTufts">
              <path d="M140 405 C141 395 144 388 147 384 M142 405 C145 397 149 392 153 388 M140 405 C138 396 136 390 132 386" stroke="#25173e" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M285 412 C286 403 289 397 292 393 M287 412 C290 405 294 401 298 398 M285 412 C283 404 281 399 277 395" stroke="#201335" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M195 435 C197 424 202 416 206 410 M197 435 C201 426 207 420 213 416" stroke="#1d0f30" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        {/* Right Side: Coastal Cliff with Windswept Pine Tree Framing */}
        <div className="seaFooter__cliffRight" aria-hidden>
          <svg viewBox="0 0 550 450" fill="none" xmlns="http://www.w3.org/2000/svg" className="seaFooter__jungleSvg">
            <defs>
              <linearGradient id="rightRockGrad1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0c1122" />
                <stop offset="100%" stopColor="#050811" />
              </linearGradient>
              <linearGradient id="rightRockGrad2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#141c33" />
                <stop offset="100%" stopColor="#080c16" />
              </linearGradient>
            </defs>

            {/* Background Distant Cliff Silhouette */}
            <path
              d="M550 450 V205 C505 218 460 236 415 260 C370 284 330 312 285 344 C240 376 185 410 110 440 C80 448 30 450 0 450 H550 Z"
              fill="#05070f"
            />

            {/* Midground Rocky Promontory with Crags */}
            <path
              d="M550 450 V260 C510 272 475 288 438 310 C402 332 368 356 325 384 C282 412 225 436 150 450 H550 Z"
              fill="url(#rightRockGrad1)"
            />

            {/* Foreground Shoreline Boulders */}
            <path
              d="M550 450 V330 C520 338 490 350 455 370 C420 390 380 415 330 438 C300 448 260 450 220 450 H550 Z"
              fill="url(#rightRockGrad2)"
            />

            {/* Coastal Windswept Pine Tree perched on right cliff */}
            <g className="seaFooter__coastalPine">
              {/* Twisted Trunk */}
              <path
                d="M440 330 C436 300 422 275 398 255 C378 238 350 230 318 226 C342 234 366 248 382 268 C398 288 406 312 414 336 Z"
                fill="#080d1a"
              />
              {/* Branch Split */}
              <path
                d="M398 255 C388 238 368 222 342 216 C362 224 378 238 388 254 Z"
                fill="#070c18"
              />

              {/* Pine Needle Foliage Tufts (Windswept Coastal Pine Pads) */}
              <ellipse cx="316" cy="222" rx="36" ry="12" fill="#091322" />
              <ellipse cx="312" cy="220" rx="28" ry="9" fill="#0d1b30" />
              <ellipse cx="346" cy="212" rx="32" ry="11" fill="#0a1526" />
              <ellipse cx="378" cy="232" rx="38" ry="13" fill="#081220" />
              <ellipse cx="406" cy="252" rx="34" ry="12" fill="#070f1a" />
              <ellipse cx="360" cy="245" rx="30" ry="10" fill="#0b172a" />
            </g>

            {/* Hanging Tropical Palm Leaves from Top Right */}
            <path d="M550 0 V210 C522 184 500 156 484 122 C468 88 464 50 460 0 H550 Z" fill="#050a12" />
            <path d="M510 0 C504 42 488 84 458 126 C432 160 396 184 354 198 C394 174 430 134 446 92 C456 58 460 26 456 0 H510 Z" fill="#08111e" />
            <path d="M438 0 C432 32 418 64 392 98 C366 128 332 152 290 166 C330 146 360 114 376 80 C386 52 386 24 382 0 H438 Z" fill="#0c182a" />
            <path d="M550 150 C518 156 488 172 462 198 C436 224 422 254 416 290 C436 260 466 234 502 218 C522 208 538 204 550 204 V150 Z" fill="#070e1a" />

            {/* Coastal Grass Tufts on Right Rocks */}
            <path d="M370 380 C368 370 364 363 358 358 M368 380 C364 372 358 366 352 362" stroke="#0a1424" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M480 345 C478 335 474 328 468 322 M478 345 C474 336 468 330 460 326" stroke="#0d182b" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>

        {/* ==================== CENTER TYPOGRAPHY & BRANDING ==================== */}
        <div className="seaFooter__center">
          <h2 className="seaFooter__title">
            <span className="seaFooter__titleLine1">aayush</span>
            <span className="seaFooter__titleLine2">visuals</span>
          </h2>

          {/* Floating Shotsu emblem */}
          <div className="seaFooter__emblem" aria-hidden>
            <div className="cbMascot seaFooter__shotsu">
              <span className="cbMascot__ears" />
              <span className="cbMascot__body">
                <span className="cbMascot__eye cbMascot__eye--l" />
                <span className="cbMascot__eye cbMascot__eye--r" />
                <span className="cbMascot__shine" />
              </span>
            </div>
          </div>

          {/* Center Social Buttons in Scene */}
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

      {/* The Colophon Dock */}
      <div className="seaFooter__dockWrapper">
        <div className="seaFooter__dock">
          <p className="seaFooter__colophon">
            &copy; {new Date().getFullYear()} {PERSON_NAME.toLowerCase()}. all rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

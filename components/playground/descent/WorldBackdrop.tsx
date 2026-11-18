"use client";

import { useEffect, useRef } from "react";
import type { DescentProgress } from "./useDescentScroll";

/*
  The world behind the cards.

  Four scenes — valley, falls, cave, forge — stacked in one fixed layer
  and cross-faded by scroll. Depth comes from parallax rather than from
  3D: each scene is cut into far / mid / near groups that drift at
  different rates, which is what reads as space. A real WebGL scene cost
  more and looked worse; this is ~10KB of SVG and holds 60fps anywhere.

  Everything is written straight to style in one rAF loop. No React state
  per frame, nothing re-renders while you scroll.
*/

type SceneEl = { el: HTMLElement; from: number; to: number };

/* where each scene owns the scroll, with overlap for the cross-fade */
const BANDS: Array<[number, number]> = [
  [0, 0.34],
  [0.22, 0.6],
  [0.48, 0.84],
  [0.72, 1],
];

export default function WorldBackdrop({
  progress,
}: {
  progress: React.RefObject<DescentProgress>;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;

    const scenes: SceneEl[] = Array.from(host.querySelectorAll<HTMLElement>("[data-scene]")).map(
      (el, i) => ({ el, from: BANDS[i][0], to: BANDS[i][1] })
    );
    const layers = Array.from(host.querySelectorAll<HTMLElement>("[data-depth]"));

    let raf = 0;
    const tick = () => {
      const p = progress.current.p;

      for (const s of scenes) {
        /* ramp in over the first 30% of the band, out over the last 30% */
        const span = s.to - s.from;
        const t = (p - s.from) / span;
        let a = 0;
        if (t > -0.3 && t < 1.3) {
          a = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
        }
        s.el.style.opacity = String(Math.max(0, Math.min(1, a)));
      }

      /* parallax: the further back, the less it moves */
      for (const l of layers) {
        const depth = Number(l.dataset.depth) || 0;
        l.style.transform = `translate3d(0, ${(-p * depth * 240).toFixed(1)}px, 0) scale(${(1 + depth * 0.06).toFixed(3)})`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  return (
    <div className="world" ref={root} aria-hidden>
      {/* ── 01 valley ── */}
      <div className="world__scene" data-scene style={{ opacity: 1 }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="wSky1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#101737" />
              <stop offset=".42" stopColor="#38325f" />
              <stop offset=".72" stopColor="#b2644f" />
              <stop offset="1" stopColor="#efa058" />
            </linearGradient>
            <radialGradient id="wSun1" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#ffe3a3" />
              <stop offset=".55" stopColor="#ffb061" />
              <stop offset="1" stopColor="#ffb061" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wLake1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f0a265" />
              <stop offset=".5" stopColor="#6b4a74" />
              <stop offset="1" stopColor="#241d44" />
            </linearGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#wSky1)" />
          <g data-depth="0.1">
            <circle cx="980" cy="470" r="300" fill="url(#wSun1)" opacity=".85" />
            <circle cx="980" cy="470" r="52" fill="#ffeec4" />
          </g>
          <g data-depth="0.25" fill="#6c5f8c" opacity=".55">
            <path d="M0 560 L190 430 L330 520 L470 398 L650 545 L820 452 L1010 560 L1180 470 L1440 585 L1440 900 L0 900Z" />
          </g>
          <g data-depth="0.45" fill="#4a4570" opacity=".85">
            <path d="M0 625 L180 520 L360 600 L540 492 L720 608 L900 530 L1100 632 L1280 548 L1440 640 L1440 900 L0 900Z" />
          </g>
          <g data-depth="0.7">
            <path d="M0 700 L220 600 L420 690 L600 578 L800 700 L1000 620 L1220 718 L1440 640 L1440 900 L0 900Z" fill="#2f3457" />
            <path d="M0 742 L1440 742 L1440 824 L0 824Z" fill="url(#wLake1)" />
            <g stroke="#ffd9a8" strokeWidth="2" opacity=".4">
              <path d="M840 764h260M880 780h190M910 797h130" />
            </g>
          </g>
          <g data-depth="1">
            <path d="M0 804 L1440 804 L1440 900 L0 900Z" fill="#141831" />
            <g fill="#0e1228">
              <path d="M90 804l34-124 34 124z" />
              <path d="M150 804l26-94 26 94z" />
              <path d="M1230 804l30-106 30 106z" />
              <path d="M1292 804l38-134 38 134z" />
            </g>
          </g>
        </svg>
      </div>

      {/* ── 02 falls ── */}
      <div className="world__scene" data-scene style={{ opacity: 0 }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="wSky2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0e2b3c" />
              <stop offset=".6" stopColor="#276058" />
              <stop offset="1" stopColor="#4c9570" />
            </linearGradient>
            <linearGradient id="wFall2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eafaff" />
              <stop offset=".55" stopColor="#9fe0e8" />
              <stop offset="1" stopColor="#d8f4fb" stopOpacity=".2" />
            </linearGradient>
            <radialGradient id="wMist2" cx=".5" cy="1" r=".75">
              <stop offset="0" stopColor="#eafaff" stopOpacity=".8" />
              <stop offset="1" stopColor="#eafaff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#wSky2)" />
          <g data-depth="0.2" fill="#17414a" opacity=".65">
            <path d="M0 140 L240 60 L430 220 L560 150 L640 900 L0 900Z" />
            <path d="M1440 120 L1210 50 L1010 210 L900 140 L860 900 L1440 900Z" />
          </g>
          <g data-depth="0.4">
            <path d="M640 110 L820 110 L872 764 L598 764Z" fill="url(#wFall2)" />
            <g stroke="#ffffff" strokeWidth="3" opacity=".45">
              <path d="M672 142v584M714 132v594M762 142v580M810 158v562" />
            </g>
          </g>
          <g data-depth="0.75">
            <path d="M0 230 L250 160 L400 330 L470 250 L540 900 L0 900Z" fill="#0d2c2c" />
            <path d="M1440 210 L1200 150 L1040 320 L960 250 L930 900 L1440 900Z" fill="#0d2c2c" />
            <g fill="#1d6341">
              <circle cx="286" cy="300" r="48" />
              <circle cx="350" cy="326" r="34" />
              <circle cx="232" cy="332" r="38" />
              <circle cx="1104" cy="288" r="50" />
              <circle cx="1046" cy="318" r="36" />
              <circle cx="1166" cy="322" r="32" />
            </g>
            <g fill="#2d8f58">
              <circle cx="278" cy="282" r="30" />
              <circle cx="1096" cy="272" r="32" />
            </g>
          </g>
          <g data-depth="1">
            <ellipse cx="730" cy="792" rx="430" ry="82" fill="#164c57" />
            <ellipse cx="730" cy="772" rx="340" ry="150" fill="url(#wMist2)" />
            <path d="M0 836 L1440 836 L1440 900 L0 900Z" fill="#092122" />
          </g>
        </svg>
      </div>

      {/* ── 03 cave ── */}
      <div className="world__scene" data-scene style={{ opacity: 0 }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="wMouth3" cx=".5" cy=".46" r=".5">
              <stop offset="0" stopColor="#bfe9d8" />
              <stop offset=".45" stopColor="#35837c" />
              <stop offset="1" stopColor="#081d27" />
            </radialGradient>
            <linearGradient id="wShaft3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#cdf3e6" stopOpacity=".5" />
              <stop offset="1" stopColor="#cdf3e6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="1440" height="900" fill="#05151c" />
          <g data-depth="0.15">
            <ellipse cx="720" cy="420" rx="440" ry="330" fill="url(#wMouth3)" />
          </g>
          <g data-depth="0.35" fill="url(#wShaft3)">
            <path d="M616 140 L700 140 L824 900 L556 900Z" />
            <path d="M792 150 L842 150 L984 900 L802 900Z" />
          </g>
          <g data-depth="0.8" fill="#050f15">
            <path d="M0 0 L1440 0 L1440 130 Q1080 310 980 0 Z" />
            <path d="M0 0 L520 0 Q420 330 0 180 Z" />
            <path d="M540 0l26 156 26-156z" />
            <path d="M622 0l18 112 18-112z" />
            <path d="M842 0l22 134 22-134z" />
            <path d="M912 0l16 96 16-96z" />
          </g>
          <g data-depth="1">
            <ellipse cx="720" cy="706" rx="210" ry="46" fill="#1a7a70" opacity=".65" />
            <ellipse cx="720" cy="706" rx="126" ry="24" fill="#6fe3cd" opacity=".5" />
            <path d="M0 900 L0 646 Q380 766 520 900 Z" fill="#030a0f" />
            <path d="M1440 900 L1440 626 Q1060 746 940 900 Z" fill="#030a0f" />
          </g>
        </svg>
      </div>

      {/* ── 04 forge ── */}
      <div className="world__scene" data-scene style={{ opacity: 0 }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="wHeat4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#150a10" />
              <stop offset=".45" stopColor="#4f1714" />
              <stop offset=".78" stopColor="#bd3f1b" />
              <stop offset="1" stopColor="#ffae39" />
            </linearGradient>
            <radialGradient id="wCore4" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#fff0c2" />
              <stop offset=".4" stopColor="#ff9a2e" />
              <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#wHeat4)" />
          <g data-depth="0.2" opacity=".9">
            <path d="M0 120 L1440 90 L1440 176 L0 210Z" fill="#241219" />
            <path d="M0 236 L1440 198 L1440 296 L0 326Z" fill="#331618" />
            <path d="M0 352 L1440 304 L1440 402 L0 436Z" fill="#471c16" />
          </g>
          <g data-depth="0.5">
            <circle cx="720" cy="706" r="290" fill="url(#wCore4)" opacity=".9" />
          </g>
          <g data-depth="0.8">
            <path d="M0 690 Q360 640 720 700 T1440 690 L1440 792 Q1080 740 720 802 T0 792Z" fill="#ff6a21" />
            <path d="M0 716 Q360 672 720 728 T1440 718 L1440 752 Q1080 710 720 764 T0 754Z" fill="#ffd36b" />
          </g>
          <g data-depth="1">
            <path d="M0 804 L180 762 L340 810 L520 766 L700 816 L880 770 L1060 818 L1240 772 L1440 810 L1440 900 L0 900Z" fill="#160809" />
            <g fill="#ffcf7a">
              <circle cx="240" cy="612" r="4" />
              <circle cx="420" cy="560" r="3" />
              <circle cx="640" cy="596" r="5" />
              <circle cx="880" cy="548" r="3" />
              <circle cx="1080" cy="604" r="4" />
              <circle cx="1280" cy="566" r="3" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

"use client";

import "./chew.css";

/*
  A close recreation of a reference hero.

  Everything is positioned as a percentage of .cwStage, measured off the
  reference at 1200x643, so the composition holds its proportions at any
  viewport instead of reflowing. Type sizes are in vw for the same reason.

  The one honest gap: the wordmark face. The original looks custom or
  commercial - near-circular bowls, uniform strokes, very tight counters.
  Titan One is the closest of the freely available fat rounded faces and
  is what this uses; it is an approximation, not a match. If it needs to
  be exact, the six glyphs (c h e w o !) get hand-drawn as paths.
*/

function Paw({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      <g fill="#dff236">
        <ellipse cx="27" cy="33" rx="11" ry="15" transform="rotate(-18 27 33)" />
        <ellipse cx="47" cy="22" rx="11" ry="15" transform="rotate(-6 47 22)" />
        <ellipse cx="67" cy="26" rx="11" ry="15" transform="rotate(10 67 26)" />
        <ellipse cx="83" cy="43" rx="10" ry="13" transform="rotate(24 83 43)" />
        {/* the main pad - a soft wedge, wider at the bottom */}
        <path d="M52 48c16 0 29 11 29 24 0 11-9 18-20 18-6 0-9-3-14-3s-8 3-14 3c-11 0-20-7-20-18 0-13 13-24 29-24z" />
      </g>
    </svg>
  );
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      {/* a four-point star with concave sides, not a plus sign */}
      <path
        fill="#dff236"
        d="M50 0c4 28 18 42 50 50-32 8-46 22-50 50-4-28-18-42-50-50 32-8 46-22 50-50z"
      />
    </svg>
  );
}

export default function ChewHero({ displayClass }: { displayClass: string }) {
  return (
    <section className="cwStage">
      {/* the barely-there darker swooshes in the ground */}
      <svg className="cwSwoosh" viewBox="0 0 1200 643" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="none" stroke="#8a46dd" strokeWidth="46" strokeLinecap="round" opacity="0.2">
          <path d="M-60 120 C 180 -10, 300 240, 150 360 S -40 520, 120 700" />
          <path d="M1260 60 C 1050 120, 1120 300, 940 360 S 700 520, 830 700" />
          <path d="M1270 430 C 1120 470, 1040 430, 980 470" />
        </g>
      </svg>

      <span className="cwBrand">DHNN&trade;</span>
      <span className="cwKicker">branding</span>

      <span className="cwPill cwPill--l">seasonal</span>
      <span className="cwTab">treat box</span>
      <span className="cwPill cwPill--r">classics</span>

      <h1 className="srOnly">chew choo! - branding</h1>

      <div className={`cwWord ${displayClass}`} aria-hidden>
        <span className="cwWord__a">
          chew
          <sup className="cwWord__reg">&reg;</sup>
        </span>
        <span className="cwWord__b">choo!</span>
      </div>

      {/* left badge: a rotated stadium */}
      <div className="cwBadgeL" aria-hidden>
        <svg viewBox="0 0 120 170" className="cwBadgeL__svg">
          <rect x="0" y="0" width="120" height="170" rx="58" fill="#2f5ff0" />
          <defs>
            <path id="cwArc" d="M60 76 m-45,0 a45,45 0 0,1 90,0" fill="none" />
          </defs>
          <text className="cwBadgeL__arc">
            <textPath href="#cwArc" startOffset="50%" textAnchor="middle">
              CHEWCHOO
            </textPath>
          </text>
          <rect x="46" y="48" width="28" height="14" rx="7" fill="#fff" />
          <text x="60" y="58.5" className="cwBadgeL__box">box</text>
          <text x="60" y="86" className="cwBadgeL__big">treats</text>
          <circle cx="60" cy="97" r="7.5" fill="#fff" />
          <text x="60" y="100.5" className="cwBadgeL__amp">&amp;</text>
          <text x="60" y="124" className="cwBadgeL__big">toys</text>
          <text x="60" y="145" className="cwBadgeL__foot">for cool dogs!</text>
        </svg>
      </div>

      {/* right badge: orange disc, yellow ring, text around the rim */}
      <div className="cwBadgeR" aria-hidden>
        <svg viewBox="0 0 120 120" className="cwBadgeR__svg">
          <circle cx="60" cy="60" r="58" fill="#dff236" />
          <circle cx="60" cy="60" r="53" fill="#f04e23" />
          <defs>
            <path id="cwRing" d="M60 60 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0" fill="none" />
          </defs>
          <text className="cwBadgeR__text">
            <textPath href="#cwRing" startOffset="2%">
              seasonal boxes for cool dogs &nbsp;&bull;
            </textPath>
          </text>
          <g transform="translate(36 36) scale(0.48)">
            <Paw className="cwBadgeR__paw" />
          </g>
        </svg>
      </div>

      <Paw className="cwPaw cwPaw--a" />
      <Paw className="cwPaw cwPaw--b" />
      <Paw className="cwPaw cwPaw--c" />

      <Sparkle className="cwStar cwStar--a" />
      <Sparkle className="cwStar cwStar--b" />
      <Sparkle className="cwStar cwStar--c" />

      <div className="cwDisc" aria-hidden>
        <span>chewchoo.com</span>
      </div>

      <span className="cwYear">2022</span>

      <ul className="cwIndex" aria-hidden>
        <li><span>branding</span><b>01</b></li>
        <li><span>digital</span><b>02</b></li>
        <li><span>packaging</span><b>03</b></li>
      </ul>
    </section>
  );
}

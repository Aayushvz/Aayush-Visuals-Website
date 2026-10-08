import PageLink from "@/components/PageLink";
import Wordmark from "./Wordmark";
import "./av.css";

/*
  An alternative hero for Aayush Visuals.

  The composition follows a poster logic rather than a page logic: a single
  enormous wordmark holding the centre, satellites pinned to the frame
  edges, and nothing in the band between them. Everything is positioned as
  a percentage of the stage, so it stays a picture at any width instead of
  reflowing into a column.

  The wordmark is set in the hand-drawn alphabet in ./glyphs - no webfont
  is loaded for this page at all. Two lines, two tones, the second indented
  so the pair reads as one lockup rather than as centred text.

  No JavaScript. The only motion is a slow CSS float on the scatter, which
  stops under prefers-reduced-motion. A hero that needs a bundle to hold
  still is a hero that flashes on a slow connection.
*/

function Sparkle({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      <path
        fill="currentColor"
        d="M50 0c4 28 18 42 50 50-32 8-46 22-50 50-4-28-18-42-50-50 32-8 46-22 50-50z"
      />
    </svg>
  );
}

const INDEX = [
  { label: "work", href: "/work", n: "01" },
  { label: "playground", href: "/playground", n: "02" },
  { label: "contact", href: "/contact", n: "03" },
];

export default function AvHero() {
  return (
    <section className="avStage">
      {/* barely-there darker swooshes, enough to stop the purple reading flat */}
      <svg className="avSwoosh" viewBox="0 0 1200 643" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="none" stroke="#5b23c0" strokeWidth="48" strokeLinecap="round" opacity="0.26">
          <path d="M-60 140 C 190 10, 300 250, 150 370 S -40 530, 130 720" />
          <path d="M1270 70 C 1060 130, 1130 310, 950 370 S 710 530, 840 720" />
          <path d="M1280 450 C 1130 490, 1050 450, 990 492" />
        </g>
      </svg>

      <span className="avMark">AAYUSH VISUALS&trade;</span>
      <span className="avRole">product designer &amp; design engineer</span>

      <span className="avPill avPill--l">selected work</span>
      <span className="avTab">open for work</span>
      <span className="avPill avPill--r">based in india</span>

      <h1 className="srOnly">Aayush Visuals - product designer and design engineer</h1>

      <div className="avWord" aria-hidden>
        <Wordmark text="aayush" className="avWord__a" />
        <Wordmark text="visuals" className="avWord__b" />
      </div>

      {/* left badge - a rotated stadium, the loudest small thing on the page */}
      <div className="avBadgeL" aria-hidden>
        <svg viewBox="0 0 120 170">
          <rect x="0" y="0" width="120" height="170" rx="58" fill="#1f1f1f" />
          <defs>
            <path id="avArc" d="M60 76 m-45,0 a45,45 0 0,1 90,0" fill="none" />
          </defs>
          <text className="avBadgeL__arc">
            <textPath href="#avArc" startOffset="50%" textAnchor="middle">
              AAYUSHVISUALS
            </textPath>
          </text>
          <rect x="44" y="48" width="32" height="14" rx="7" fill="#e8834a" />
          <text x="60" y="58.5" className="avBadgeL__chip">est. 2021</text>
          <text x="60" y="88" className="avBadgeL__big">design</text>
          <circle cx="60" cy="99" r="7.5" fill="#e8834a" />
          <text x="60" y="102.5" className="avBadgeL__amp">&amp;</text>
          <text x="60" y="126" className="avBadgeL__big">code</text>
          <text x="60" y="146" className="avBadgeL__foot">for good brands</text>
        </svg>
      </div>

      {/* right badge - orange disc with type around the rim */}
      <div className="avBadgeR" aria-hidden>
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="58" fill="#f2ede6" />
          <circle cx="60" cy="60" r="53" fill="#e8834a" />
          <defs>
            <path id="avRing" d="M60 60 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0" fill="none" />
          </defs>
          <text className="avBadgeR__text">
            <textPath href="#avRing" startOffset="2%">
              product design &nbsp;&bull;&nbsp; design engineering &nbsp;&bull;
            </textPath>
          </text>
          {/* a bare path, not <Sparkle>: a nested <svg> without explicit
              width/height sizes to the PARENT viewport, which here would
              fill the whole badge */}
          <path transform="translate(43 43) scale(0.34)" fill="#f2ede6" d="M50 0c4 28 18 42 50 50-32 8-46 22-50 50-4-28-18-42-50-50 32-8 46-22 50-50z" />
        </svg>
      </div>

      <Sparkle className="avStar avStar--a" />
      <Sparkle className="avStar avStar--b" />
      <Sparkle className="avStar avStar--c" />
      <Sparkle className="avStar avStar--d" />

      <PageLink href="/contact" className="avDisc">
        <span>aayushvisuals.com</span>
      </PageLink>

      <span className="avYear">2026</span>

      <nav className="avIndex" aria-label="Sections">
        <ul>
          {INDEX.map((i) => (
            <li key={i.href}>
              <PageLink href={i.href}>
                <span>{i.label}</span>
                <b>{i.n}</b>
              </PageLink>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

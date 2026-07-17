"use client";

const LOGOS: { name: string; src: string; h?: number }[] = [
  { name: "Elevation Capital", src: "/logos/elevation-capital.png" },
  { name: "Mike Tyson Invitational", src: "/projects/mike-tyson-logo.png" },
  { name: "KPMG", src: "/logos/kpmg.png", h: 72 },
  { name: "Government of India", src: "/logos/goi.png" },
  { name: "Riviera", src: "/projects/riviera-logo.png" },
  { name: "Gravitas", src: "/projects/gravitas-logo.png" },
  { name: "Layover", src: "/projects/layover-logo.png", h: 24 },
  { name: "DropBy", src: "/projects/dropby-logo.png", h: 48 },
];

export default function LogoStrip() {
  return (
    <div className="logoStrip">
      <p className="logoStrip__label">Some of the companies I&rsquo;ve worked with</p>
      <div className="logoStrip__track">
        <div className="logoStrip__scroll" aria-label="Client logos">
          {[...LOGOS, ...LOGOS].map((l, i) => (
            <span key={`${l.name}-${i}`} className="logoStrip__item">
              <img
                src={l.src}
                alt={l.name}
                className="logoStrip__img"
                style={l.h ? { height: l.h } : undefined}
                loading="lazy"
                draggable={false}
              />
              <span className="logoStrip__dot" aria-hidden>&#x2666;</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

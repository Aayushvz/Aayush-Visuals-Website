"use client";

const LOGOS: { name: string; src: string; h?: number }[] = [
  { name: "Elevation Capital", src: "/logos/elevation-capital.webp" },
  { name: "Mike Tyson Invitational", src: "/projects/mike-tyson-logo.webp" },
  { name: "KPMG", src: "/logos/kpmg.webp", h: 72 },
  { name: "Government of India", src: "/logos/goi.webp" },
  { name: "Riviera", src: "/projects/riviera-logo.webp" },
  { name: "Gravitas", src: "/projects/gravitas-logo.webp" },
  { name: "Layover", src: "/projects/layover-logo.webp", h: 24 },
  { name: "DropBy", src: "/projects/dropby-logo.webp", h: 48 },
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

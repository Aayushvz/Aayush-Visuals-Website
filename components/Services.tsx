"use client";

import { useEffect, useRef, useState } from "react";

const services = [
  {
    label: "UI/UX Design",
    className: "servicesCard--uiux",
    glyph: "◍",
  },
  {
    label: "Brand Identity",
    className: "servicesCard--brand",
    glyph: "✳",
  },
  {
    label: "Motion Graphics",
    className: "servicesCard--motion",
    glyph: "➶",
  },
];

export default function Services() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      setActive(Math.min(services.length - 1, Math.floor(progress * services.length)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="services" id="services" ref={wrapRef}>
      <div className="services__sticky">
        <p className="services__label">
          Creating experiences that help brands grow through
        </p>
        <div className="services__inner">
          <div className="services__list">
            {services.map((s, i) => (
              <div
                key={s.label}
                className={`display services__item ${
                  i === active ? "services__item--active" : ""
                }`}
              >
                {s.label}
              </div>
            ))}
          </div>
          <div className={`servicesCard ${services[active].className}`}>
            <span className="servicesCard__glyph" aria-hidden>
              {services[active].glyph}
            </span>
            <span className="servicesCard__caption">
              {services[active].label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

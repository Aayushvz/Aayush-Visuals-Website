"use client";

/*
  About page vertical rulers — matches the Hero's heroRuler__rail system.
  Two thin vertical lines on the left and right edges, plus four small "+"
  registration marks at the corners. Purely decorative, hidden on mobile.
*/

export default function AboutRulers() {
  return (
    <div className="aboutRulers" aria-hidden>
      {/* Corner registration marks */}
      <span className="aboutRulers__cross aboutRulers__cross--tl">+</span>
      <span className="aboutRulers__cross aboutRulers__cross--tr">+</span>
      <span className="aboutRulers__cross aboutRulers__cross--bl">+</span>
      <span className="aboutRulers__cross aboutRulers__cross--br">+</span>

      {/* Vertical rails — same styling as heroRuler__rail */}
      <span className="aboutRulers__rail aboutRulers__rail--left" />
      <span className="aboutRulers__rail aboutRulers__rail--right" />
    </div>
  );
}

/*
  Numbered measurement rulers framing the About hero, per the Figma:
  fine tick strips hugging both window edges, scale labels 100→1000
  running down each side, and small "+" registration marks in the four
  corners. Purely decorative (aria-hidden, no pointer events), desktop
  only — hidden ≤900px by CSS.
*/

const MARKS = Array.from({ length: 10 }, (_, i) => (i + 1) * 100);

export default function AboutRulers() {
  return (
    <div className="aboutRulers" aria-hidden>
      <span className="aboutRulers__cross aboutRulers__cross--tl">+</span>
      <span className="aboutRulers__cross aboutRulers__cross--tr">+</span>
      <span className="aboutRulers__cross aboutRulers__cross--bl">+</span>
      <span className="aboutRulers__cross aboutRulers__cross--br">+</span>

      <div className="aboutRulers__side aboutRulers__side--left">
        {MARKS.map((m, i) => (
          <span
            key={m}
            className="aboutRulers__num"
            style={{ top: `${7.5 + i * (85 / 9)}%` }}
          >
            {m}
          </span>
        ))}
      </div>

      <div className="aboutRulers__side aboutRulers__side--right">
        {MARKS.map((m, i) => (
          <span
            key={m}
            className="aboutRulers__num"
            style={{ top: `${7.5 + i * (85 / 9)}%` }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

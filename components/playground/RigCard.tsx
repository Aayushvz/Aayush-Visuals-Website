import { Chakra_Petch } from "next/font/google";
import { useId, useMemo, type ComponentType } from "react";
import type { Stat } from "./experiments";
import "./rig.css";

/*
  One shelf card, drawn as a wall-mounted display rig.

  The reference is an industrial monitor bolted to a ribbed mint wall: a
  rounded black housing, a slatted bay recessed into it, one purple band of
  readouts across the bay, and a giant stencil number painted on the wall
  behind. Everything here is CSS and inline SVG, and every size is in `cqw`
  off the rig itself, so the whole unit scales as one object whatever width
  the grid hands it.

  The experiment's cover plays on a small screen set into the right of the
  bay. That screen borrows from a second reference, a dot-matrix download
  counter: the cover shows through an LED pixel grid, with a bar of purple
  dots rising from the bottom edge. Hovering switches the screen on - the
  grid fades back, the dots drop away and the cover comes through clean.

  The same rig renders a vacant slot: the lamps are off, the band is unlit,
  the screen shows the dots alone and there is nothing to click.
*/

/* the squared face on the unit's model code. Scoped to this card, so the
   font only loads where the shelf does */
const code = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

type RigProps = {
  index: string;
  title: string;
  kind: string;
  sub: string;
  cta: string;
  shipped?: string;
  stats?: [Stat, Stat];
  /* the small print under the call to action, the reference's file list */
  meta?: string;
  cover?: ComponentType;
  off?: boolean;
};

/* LED matrix on the screen, in cells. 3:4, same as the cover art */
const COLS = 18;
const ROWS = 24;

/*
  The purple dot bars. Seeded off the slot number, so each rig draws the
  same bars on the server and the client, and every rig draws different
  ones. Dense at the floor, thinning upward, with a few strays above each
  bar the way the reference scatters them.
*/
function equalizer(seed: number) {
  let t = seed * 9301 + 49297;
  const rand = () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
  const dots: [number, number][] = [];
  for (let c = 0; c < COLS; c++) {
    const h = 1 + Math.floor(rand() * 5);
    for (let k = 0; k < h; k++) {
      if (rand() < 0.92 - k * 0.1) dots.push([c, ROWS - 1 - k]);
    }
    if (rand() < 0.45) dots.push([c, ROWS - 1 - h - 1 - Math.floor(rand() * 3)]);
  }
  return dots;
}

function Screen({
  index,
  cover: Cover,
}: {
  index: string;
  cover?: ComponentType;
}) {
  const id = useId().replace(/:/g, "");
  const dots = useMemo(() => equalizer(Number(index) || 1), [index]);

  return (
    <div className="rig__screen" aria-hidden>
      <div className="rig__screenArt">{Cover ? <Cover /> : null}</div>
      <span className="rig__scan" />
      <svg
        className="rig__led"
        viewBox={`0 0 ${COLS} ${ROWS}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/* one cell: the dark gap on its top and left edge. Tiled, the
              gaps become the grid and the cover shows through the squares */}
          <pattern id={`px${id}`} width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M0 0h1v.24H.24V1H0z" className="rig__gap" />
            <rect x=".24" y=".24" width=".76" height=".76" className="rig__cellDim" />
          </pattern>
        </defs>
        <rect width={COLS} height={ROWS} fill={`url(#px${id})`} />
        <g className="rig__eq">
          {dots.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x + 0.24} y={y + 0.24} width=".76" height=".76" />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* seven hexes in a flower, the unit's badge */
function LogoMark() {
  const hex = (cx: number, cy: number) => {
    const r = 5.6;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ");
    return <polygon key={`${cx}-${cy}`} points={pts} />;
  };
  const d = 10.2;
  const cells = [[0, 0], ...Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return [d * Math.cos(a), d * Math.sin(a)];
  })];
  return (
    <svg className="rig__mark" viewBox="-19 -19 38 38" aria-hidden>
      {cells.map(([x, y]) => hex(x, y))}
    </svg>
  );
}

/* the outline honeycomb behind the band, with the circle and cross motifs
   the reference draws inside some of its cells */
function HexField() {
  const r = 74;
  const w = Math.sqrt(3) * r;
  const cells: { x: number; y: number; m: "o" | "x" | "" }[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = col * w + (row % 2 ? w / 2 : 0);
      const y = row * r * 1.5;
      const m = row === 1 ? (col === 1 ? "x" : "") : col !== 1 ? "o" : "";
      cells.push({ x, y, m });
    }
  }
  const pts = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
  return (
    <svg className="rig__hex" viewBox="-60 -70 420 290" preserveAspectRatio="xMinYMid slice" aria-hidden>
      {cells.map((c) => (
        <g key={`${c.x}-${c.y}`}>
          <polygon points={pts(c.x, c.y)} />
          {c.m === "o" ? <circle cx={c.x} cy={c.y} r={r * 0.46} /> : null}
          {c.m === "x" ? (
            <path d={`M${c.x - r * 0.86} ${c.y - r / 2}L${c.x + r * 0.86} ${c.y + r / 2}M${c.x - r * 0.86} ${c.y + r / 2}L${c.x + r * 0.86} ${c.y - r / 2}M${c.x} ${c.y - r}V${c.y + r}`} />
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function OrbitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <ellipse cx="11" cy="13" rx="8" ry="3.4" transform="rotate(-40 11 13)" />
      <ellipse cx="11" cy="13" rx="8" ry="3.4" transform="rotate(40 11 13)" />
      <path d="M19 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8.2 18a5.4 5.4 0 1 1 7.6 0M5 20.6a9.6 9.6 0 1 1 14 0" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5v11M6.5 12h11" />
    </svg>
  );
}

export default function RigCard({
  index,
  title,
  kind,
  sub,
  cta,
  shipped,
  stats,
  meta,
  cover,
  off = false,
}: RigProps) {
  /* "08.04.2026" -> "08.04" big, ".2026" set small and high like the
     reference's year */
  const [md, yr] = shipped
    ? [shipped.slice(0, 5), shipped.slice(5)]
    : ["--.--", ""];

  return (
    <div className={`rig${off ? " rig--off" : ""}`}>
      <span className="rig__glare" aria-hidden />
      <span className="rig__numeral" aria-hidden>
        0{index}
      </span>
      <span className="rig__lamp rig__lamp--l" aria-hidden />
      <span className="rig__lamp rig__lamp--r" aria-hidden />

      <div className="rig__housing">
        <span className="rig__seams" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>

        <div className="rig__bay">
          <span className="rig__tubes" aria-hidden>
            <i />
            <i />
            <i />
          </span>

          <div className="rig__panel">
            <HexField />
            <Screen index={index} cover={off ? undefined : cover} />

            <div className="rig__brand">
              <LogoMark />
              <span className={`rig__code ${code.className}`}>
                <span className="rig__pipe" aria-hidden />
                EX{index}
              </span>
              <span className="rig__sub">
                <span className="rig__bullet" aria-hidden />
                {kind}
                <br />
                {sub}
              </span>
            </div>

            <div className="rig__band">
              <p className="rig__title">{title}</p>

              {off ? (
                <span className="rig__idle">Not yet</span>
              ) : (
                <>
                  <div className="rig__cell rig__cell--date">
                    <span className="rig__value">
                      {md}
                      <sup>{yr}</sup>
                    </span>
                  </div>
                  {stats?.map((s, i) => (
                    <div className="rig__cell" key={s.label}>
                      <span className="rig__value">{s.value}</span>
                      <span className="rig__label">{s.label}</span>
                      <span className="rig__icon">
                        {i === 0 ? <OrbitIcon /> : <SignalIcon />}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="rig__foot">
              <span className="rig__big" aria-hidden>
                {index}
              </span>
              <span className="rig__cta">
                {cta}
                <span className="rig__deg" aria-hidden>
                  °
                </span>
                {meta ? <span className="rig__meta">{meta}</span> : null}
              </span>
              <span className="rig__target" aria-hidden>
                <TargetIcon />
              </span>
            </div>
          </div>
        </div>

        <span className="rig__bracket rig__bracket--1" aria-hidden />
        <span className="rig__bracket rig__bracket--2" aria-hidden />
        <span className="rig__hazard" aria-hidden />
        <span className="rig__bracket rig__bracket--3" aria-hidden />
        <span className="rig__bracket rig__bracket--4" aria-hidden />
      </div>

    </div>
  );
}

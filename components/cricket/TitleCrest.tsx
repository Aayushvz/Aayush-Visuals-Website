/*
  The title lockup.

  The opening used to set "Design Premier League" as three lines of gold
  gradient type floating on the pitch. It read as a website heading over a
  game, which is the one thing this screen must not be — the comp puts the
  wordmark on a physical badge with crossed bats behind it, so the title is
  an object in the stadium rather than a caption on top of one.

  Everything here is drawn, not photographed: an SVG plate that scales to
  any width, with the type left in HTML on top of it. Baking the words into
  the artwork would cost the screen reader its heading, cost the browser its
  font, and make every copy change an illustration job.

  The bats are deliberately simple. At the size this renders they are two
  angled shapes and a red disc; detail beyond that is invisible at 1x and
  expensive at every size.
*/

export default function TitleCrest() {
  return (
    <svg
      className="stgCrest"
      viewBox="0 0 520 300"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="tcPlate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a5fc4" />
          <stop offset="46%" stopColor="#173a8e" />
          <stop offset="100%" stopColor="#0d2260" />
        </linearGradient>
        <linearGradient id="tcRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fd0ff" />
          <stop offset="48%" stopColor="#3d8fe0" />
          <stop offset="100%" stopColor="#12408f" />
        </linearGradient>
        <linearGradient id="tcWillow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8c98a" />
          <stop offset="100%" stopColor="#a97b3c" />
        </linearGradient>
        <linearGradient id="tcGrip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a9ae8" />
          <stop offset="100%" stopColor="#1b56ad" />
        </linearGradient>
      </defs>

      {/* the burst behind everything — short rays, clipped soft, so the
          badge looks lit rather than pasted */}
      <g opacity="0.5">
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <path
              key={i}
              d={`M260 150 L${260 + Math.cos(a) * 250} ${150 + Math.sin(a - 0.055) * 250} L${
                260 + Math.cos(a + 0.075) * 250
              } ${150 + Math.sin(a + 0.075) * 250} Z`}
              fill={i % 2 ? "#7cc4ff" : "#2f7fd4"}
              opacity={i % 2 ? 0.22 : 0.34}
            />
          );
        })}
      </g>

      {/* crossed bats, behind the plate and poking out either side */}
      <g transform="translate(260 158)">
        {[-1, 1].map((dir) => (
          <g key={dir} transform={`rotate(${dir * 26}) translate(${dir * -132} -6)`}>
            <rect x="-17" y="-92" width="34" height="96" rx="9" fill="url(#tcWillow)" />
            <rect x="-17" y="-92" width="34" height="96" rx="9" fill="none" stroke="#7a5526" strokeWidth="3" />
            <rect x="-7" y="4" width="14" height="62" rx="7" fill="url(#tcGrip)" />
            <rect x="-7" y="4" width="14" height="62" rx="7" fill="none" stroke="#0f3474" strokeWidth="2.5" />
          </g>
        ))}
      </g>

      {/* the plate: a shield with a flat top and a soft point */}
      <path
        d="M96 26 H424 a22 22 0 0 1 22 22 V176 c0 44 -52 74 -186 96 C126 250 74 220 74 176 V48 a22 22 0 0 1 22 -22 Z"
        fill="url(#tcPlate)"
      />
      <path
        d="M96 26 H424 a22 22 0 0 1 22 22 V176 c0 44 -52 74 -186 96 C126 250 74 220 74 176 V48 a22 22 0 0 1 22 -22 Z"
        fill="none"
        stroke="url(#tcRim)"
        strokeWidth="11"
        strokeLinejoin="round"
      />
      {/* the gloss, cut hard across the upper half like every other surface
          in the kit */}
      <path
        d="M96 26 H424 a22 22 0 0 1 22 22 V118 C380 140 140 140 74 118 V48 a22 22 0 0 1 22 -22 Z"
        fill="#ffffff"
        opacity="0.12"
      />

      {/* the ball, sitting in the shield's point */}
      <g transform="translate(260 250)">
        <circle r="27" fill="#c62029" />
        <circle r="27" fill="none" stroke="#7d1015" strokeWidth="3" />
        <path d="M-27 0a27 27 0 0 0 54 0" fill="#a8161f" opacity="0.5" />
        <path
          d="M-12 -21 A27 27 0 0 0 -12 21 M12 -21 A27 27 0 0 1 12 21"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeDasharray="4 5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

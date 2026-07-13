/* Hand-drawn style SVG decorations, all original artwork. */

export function Scribble({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 50 C 40 20, 58 14, 66 22 C 72 28, 60 38, 70 32 C 84 24, 92 16, 98 22 C 103 27, 96 34, 104 29 C 114 22, 122 17, 128 23 C 133 28, 128 33, 136 28 C 146 21, 154 18, 160 24 C 165 29, 162 32, 170 28 C 182 22, 198 24, 214 30"
        stroke="var(--orange)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrushStroke({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 900 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M30 190 L 250 40 L 180 190 L 400 40 L 330 190 L 560 40 L 490 190 L 720 40 L 650 190 L 870 40"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M-20 250 C 150 120, 260 90, 360 150 C 450 205, 520 230, 610 170 C 700 110, 760 80, 850 130 C 940 180, 1000 140, 1060 60 C 1100 10, 1140 -10, 1220 20"
        stroke="rgba(242,237,230,0.9)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PenTool({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="26"
        stroke="#B8AD5E"
        strokeWidth="4"
      />
      <path
        d="M30 78 C 45 48, 75 48, 90 66"
        stroke="#D9D4C9"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line x1="30" y1="78" x2="46" y2="54" stroke="#D9D4C9" strokeWidth="3" />
      <line x1="90" y1="66" x2="74" y2="46" stroke="#D9D4C9" strokeWidth="3" />
      <circle cx="30" cy="78" r="6" fill="#232323" stroke="#D9D4C9" strokeWidth="3.5" />
      <circle cx="90" cy="66" r="6" fill="#232323" stroke="#D9D4C9" strokeWidth="3.5" />
      <circle cx="46" cy="54" r="4.5" fill="#D9D4C9" />
      <circle cx="74" cy="46" r="4.5" fill="#D9D4C9" />
    </svg>
  );
}

export function PaletteDots({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 70 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="30" cy="22" rx="22" ry="20" fill="#E05B4E" />
      <ellipse cx="40" cy="55" rx="22" ry="20" fill="#4E7BE0" />
      <ellipse cx="28" cy="90" rx="22" ry="20" fill="#8B5CD6" />
      <ellipse cx="36" cy="126" rx="22" ry="20" fill="#3FBF8E" />
    </svg>
  );
}

export function VoxelBlock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 140 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M20 45 L 70 20 L 120 45 L 70 70 Z" fill="#C08A66" />
      <path d="M20 45 L 70 70 L 70 100 L 20 75 Z" fill="#9A6A4C" />
      <path d="M120 45 L 70 70 L 70 100 L 120 75 Z" fill="#7E5238" />
      <path d="M45 32 L 70 20 L 95 32 L 70 45 Z" fill="#D6A17C" />
    </svg>
  );
}

export function TornEdge({
  className,
  fill = "var(--cream)",
  flip = false,
}: {
  className?: string;
  fill?: string;
  flip?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
      aria-hidden
    >
      <path
        d="M0 70 L 0 38 L 48 30 L 96 42 L 150 26 L 210 40 L 260 24 L 330 44 L 390 28 L 450 38 L 520 22 L 590 42 L 650 30 L 720 44 L 790 24 L 850 40 L 920 26 L 990 42 L 1050 28 L 1120 44 L 1180 24 L 1250 40 L 1310 28 L 1380 42 L 1440 30 L 1440 70 Z"
        fill={fill}
      />
    </svg>
  );
}

export function Portrait({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 260 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* shoulders / tee */}
      <path
        d="M40 300 C 42 240, 70 212, 130 212 C 190 212, 218 240, 220 300 Z"
        fill="#2E5FD0"
      />
      {/* neck */}
      <rect x="112" y="180" width="36" height="44" rx="14" fill="#B97C50" />
      {/* head */}
      <ellipse cx="130" cy="128" rx="58" ry="66" fill="#C68A5B" />
      {/* hair */}
      <path
        d="M70 116 C 62 62, 104 34, 134 36 C 176 38, 198 66, 192 108 C 188 84, 174 72, 160 72 C 168 84, 168 92, 166 98 C 154 76, 120 68, 100 80 C 84 90, 76 102, 70 116 Z"
        fill="#1E1A17"
      />
      {/* ears */}
      <ellipse cx="72" cy="134" rx="10" ry="14" fill="#B97C50" />
      <ellipse cx="188" cy="134" rx="10" ry="14" fill="#B97C50" />
      {/* sunglasses */}
      <rect x="84" y="116" width="40" height="26" rx="10" fill="#E8834A" />
      <rect x="136" y="116" width="40" height="26" rx="10" fill="#E8834A" />
      <rect x="122" y="124" width="16" height="5" rx="2.5" fill="#E8834A" />
      {/* smile */}
      <path
        d="M108 172 C 120 182, 140 182, 152 172"
        stroke="#7A4A28"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PixelDude({ className }: { className?: string }) {
  const p = 8; // pixel size
  const px = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    key: string
  ) => (
    <rect key={key} x={x * p} y={y * p} width={w * p} height={h * p} fill={fill} />
  );
  const hair = "#191512";
  const skin = "#C68A5B";
  const hoodie = "#2E5FD0";
  const hoodieDark = "#2248A3";
  const pants = "#26262B";
  const shoe = "#F1EDE6";
  return (
    <svg
      className={className}
      viewBox="0 0 96 216"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      aria-hidden
    >
      {px(4, 0, 4, 1, hair, "h1")}
      {px(3, 1, 6, 2, hair, "h2")}
      {px(3, 3, 1, 3, hair, "h3")}
      {px(8, 3, 1, 3, hair, "h4")}
      {px(4, 3, 4, 4, skin, "face")}
      {px(4, 4, 1, 1, "#111", "eye1")}
      {px(7, 4, 1, 1, "#111", "eye2")}
      {px(5, 6, 2, 1, "#8A5430", "mouth")}
      {px(5, 7, 2, 1, skin, "neck")}
      {px(3, 8, 6, 6, hoodie, "torso")}
      {px(2, 8, 1, 5, hoodie, "armL")}
      {px(9, 8, 1, 5, hoodie, "armR")}
      {px(5, 9, 2, 3, hoodieDark, "pocket")}
      {px(2, 13, 1, 1, skin, "handL")}
      {px(9, 13, 1, 1, skin, "handR")}
      {px(3, 14, 6, 1, hoodieDark, "hem")}
      {px(3, 15, 2, 8, pants, "legL")}
      {px(7, 15, 2, 8, pants, "legR")}
      {px(2, 23, 3, 2, shoe, "shoeL")}
      {px(7, 23, 3, 2, shoe, "shoeR")}
      {px(2, 24, 3, 1, "#D0442E", "soleL")}
      {px(7, 24, 3, 1, "#D0442E", "soleR")}
    </svg>
  );
}

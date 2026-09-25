import type { TagIcon } from "./experiments";

/* 24px line glyphs for the tags, drawn to sit on a small round badge */
const TAG_PATHS: Record<TagIcon, string> = {
  game: "M7.5 8.5h9a4.5 4.5 0 0 1 0 9c-1 0-1.8-.5-2.4-1.2l-.6-.8h-3l-.6.8c-.6.7-1.4 1.2-2.4 1.2a4.5 4.5 0 0 1 0-9zM8 11.5v3M6.5 13h3M15.5 12h.01M17.2 14h.01",
  timer: "M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM12 10v3.5l2 1.5M10 2.5h4",
  ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM7.2 6.4c2.8 3.2 2.8 8 0 11.2M16.8 6.4c-2.8 3.2-2.8 8 0 11.2",
  free: "M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20M12 7.5c-1.4-3-5-3.2-5-1.2 0 1.2 2.6 1.2 5 1.2 2.4 0 5 0 5-1.2 0-2-3.6-1.8-5 1.2",
  nosignup: "M10 11a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM3 20.5a7 7 0 0 1 11.5-5.4M16.5 15.5l4.5 4.5M21 15.5l-4.5 4.5",
  dashboard: "M4 4h6.5v8.5H4zM13.5 4H20v5h-6.5zM13.5 12H20v8h-6.5zM4 15.5h6.5V20H4z",
  trophy: "M8.5 20.5h7M12 16v4.5M7 3.5h10V9a5 5 0 0 1-10 0zM7 5.5H4.5V7A3 3 0 0 0 7 10M17 5.5h2.5V7A3 3 0 0 1 17 10",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  cloud: "M7 18.5a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 12h17M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z",
  machine: "M3.5 17.5h17M5 17.5V15a7 7 0 0 1 14 0v2.5M10 8.4V5h4v3.4",
  pixel: "M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z",
  leaf: "M5 19C5 11 10 5 20 4c-.5 10-6 15.5-14 15.5M5 19l6.5-6.5",
  sparkle: "M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z",
  lock: "M6 11h12v9.5H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12.5h5M10 16.5h5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5M9.5 16h3",
  pencil: "M4.5 19.5l1-4L16 5l3 3L8.5 18.5zM14 7l3 3",
};

export function TagGlyph({ icon }: { icon: TagIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={TAG_PATHS[icon]} />
    </svg>
  );
}


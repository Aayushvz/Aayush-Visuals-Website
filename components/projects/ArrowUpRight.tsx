/*
  The reel's one glyph.

  It appears twice at the same size and in the same circular badge: in the
  top-right corner of every project card, and at the end of the closing
  panel's line. Those two are the same object doing the same job, so they
  read from one file rather than from two copies that drift apart the first
  time somebody nudges a stroke width.
*/
export default function ArrowUpRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

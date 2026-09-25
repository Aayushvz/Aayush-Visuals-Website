/*
  A solid mark per experiment for the card's corner badge: flat, filled,
  one idea each, the way a product's app icon would be drawn. Holes are
  cut with even-odd fills rather than drawn in a second colour, so each
  mark takes whatever colour its badge gives it.
*/
const LOGOS: Record<string, string> = {
  /* an upright bat and a ball beside it */
  dpl: "M6.2 9.2h5.6v10.9a1.9 1.9 0 0 1-1.9 1.9H8.1a1.9 1.9 0 0 1-1.9-1.9zM8.1 2.5h1.8v6.7H8.1zM17.2 19.6a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6z",
  /* a warning triangle, cut through with a bar */
  cat: "M12 3.2 21.6 20H2.4zM12 8.6 7.3 16.8h9.4zM11.1 11.4h1.8v3.4h-1.8z",
  /* a receipt with a torn foot and ruled lines */
  invoice: "M5.5 2.5h13v19l-2.2-1.6-2.2 1.6-2.1-1.6-2.1 1.6-2.2-1.6-2.2 1.6zM8.6 7.2h6.8v1.8H8.6zM8.6 11.2h6.8V13H8.6zM8.6 15.2h4v1.8h-4z",
  /* a lotus: three petals over the water line */
  pond: "M12 3.5c2.4 3.2 2.4 7.6 0 10.8-2.4-3.2-2.4-7.6 0-10.8zM3.5 9.6c3.6-.2 6.6 1.8 8 4.7-3.5 1-6.9-.6-8-4.7zM20.5 9.6c-3.6-.2-6.6 1.8-8 4.7 3.5 1 6.9-.6 8-4.7zM4.5 17h15c-1.4 2.3-4.3 3.6-7.5 3.6S5.9 19.3 4.5 17z",
  /* a pen nib, slit and pierced */
  contract: "M12 2.5 18.4 10l-3.1 8.2H8.7L5.6 10zM12 10.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4zM11.3 3.8h1.4v6.2h-1.4zM7.8 19.6h8.4v1.9H7.8z",
};

export function Logo({ id }: { id: string }) {
  const d = LOGOS[id];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden>
      <path d={d} />
    </svg>
  );
}


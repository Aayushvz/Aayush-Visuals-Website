/*
  The mascot.

  Used twice: the identity chip on the bar, and the commentator's portrait
  on the commentary panel. Both are the same person, so both use the same
  artwork — two different depictions of one identity is the kind of detail
  that quietly makes a product feel assembled rather than designed.

  This replaced a drawn SVG portrait. The source is a 2021px transparent
  PNG of the full figure; `scripts/mascot-avatar.mjs` measures the head off
  the alpha channel and crops a square around it, so the chip shows a face
  rather than the beige hoodie that survived downscaling the whole figure.
  Re-run that script if the source art changes.
*/

export default function Avatar({ className }: { className?: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/cricket/mascot.webp"
      alt=""
      /* decorative in both places it appears — the chip is labelled
         "Aayush VZ" beside it and the commentary is read as text */
      aria-hidden
      draggable={false}
      width={320}
      height={320}
      className={className}
      /* eager, not lazy: both uses sit in the first viewport, and at 17KB
         deferring them buys nothing while risking an empty ring on the one
         chip that identifies the game */
      loading="eager"
      decoding="async"
    />
  );
}

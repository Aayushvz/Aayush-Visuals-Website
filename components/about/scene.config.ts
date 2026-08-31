/*
  The scroll scene's tuning values, in one place.

  Every number that controls the choreography of the first post-hero section
  lives here so it can be adjusted without reading a line of animation code.
  The layout numbers are expressed as percentages of the viewport width,
  measured off the reference recording at 1918x876 — keeping them as ratios
  rather than pixels is what lets the composition hold its proportions from
  1024 up to an ultrawide monitor instead of only being right at one size.

  Measured positions at 1918px wide:

    rule            x 313 -> 1527      16.3%  -> 79.6%
    label           x 378              19.7%
    lead paragraph  x 783 -> 1527      40.8%  -> 79.6%   (744px wide)
    image           x 783 -> 1057      274px wide, 299 tall  (ratio 0.916)
    body column     x 1094 -> 1522     428px wide
*/

export const SCENE = {
  /* ---- composition, as % of viewport width ---- */
  layout: {
    /** where the hairline rule starts and ends */
    ruleLeft: 16.3,
    ruleRight: 79.6,
    /** the chapter label, out in the left margin */
    labelLeft: 19.7,
    /** the content column: everything except the label hangs off this */
    contentLeft: 40.8,
    contentRight: 79.6,
    /** the image, as a share of the content column */
    imageShare: 36.8,
    /** gap between image and body column, as a share of the content column */
    columnGap: 5,
    /** the image's own proportions, width / height */
    imageRatio: "274 / 299",
  },

  /* ---- typography, in px at the 1918 reference width ---- */
  type: {
    leadSize: 32,
    leadLeading: 1.1,
    bodySize: 17,
    bodyLeading: 1.42,
    labelSize: 15,
  },

  /* ---- choreography ----------------------------------------------------

     One scene, two compositions. The windows below are expressed in scene
     progress (0 -> 1) and they OVERLAP on purpose: the designer block is
     still lifting away while the cards are already rising, which is the
     moment in the reference where both are on screen at once. Splitting them
     into two sections is what made the page read as a list before.
  */
  motion: {
    /** scene height in viewport multiples; everything over 1 is timeline */
    length: 2.9,

    /*
      Windows in scene progress, where 0 is the section's top reaching the
      bottom of the screen and 1 is its bottom leaving the top. The pin starts
      at 1 / length — about 0.31 here — so anything before that happens while
      the section is still rising into view.

      The lead block begins arriving at 0.22 and has settled by 0.44, a little
      after the pin takes hold (1 / 2.9 = 0.345). It used to start at 0.10,
      which had it materialising while the client marquee above was still most
      of the screen — the section announced itself before you had asked for it.
      Starting later costs roughly a third of a screen of extra scroll before
      anything appears, and the block still finishes arriving well before the
      pin runs out.
    */
    leadIn: [0.22, 0.44],
    leadOut: [0.6, 0.74],

    /** the panels — note leadOut and cardsIn overlap */
    cardsIn: [0.68, 0.88],

    /*
      Deliberately parked past the end of the scene, which switches the panels'
      exit OFF: `cout` is clamp(0, (p - 1) / 1, 1), and p never exceeds 1, so it
      is 0 for the whole scene and the panels never lift or fade.

      They used to leave over [0.94, 1]. The trouble is what p = 1 means: the
      section's bottom edge has only just reached the bottom of the screen, so
      there is still a full viewport of scrolling before the pinned box is
      actually gone. Emptying the box at p = 1 therefore bought a screen of
      blank cream between the panels and Beginnings.

      Leaving them in place lets the pin simply release: the panels ride up and
      out with the section under their own scroll while Beginnings comes in
      directly behind them, so something is always on screen and the two
      sections read as one continuous move.
    */
    cardsOut: [1, 2],

    /**
     * How far each block starts below its resting place, in vh.
     *
     * Kept short deliberately. A long travel means the top of the screen is
     * empty for the whole entrance, which is what produced the stretch of
     * blank page between the hero and this section.
     */
    rise: 26,

    /*
      The panels start a FULL viewport down, and the lead block leaves a full
      viewport up (see `lift`). That separation is the whole reason the two
      never sit on top of each other.

      An earlier pass used 30-34vh for both. At the midpoint of the hand-off
      that put the lead at -30vh and the panels at +34vh — barely 60vh apart,
      so both landed near the middle of the screen and collided. At ~95vh each
      they pass a full screen apart: mid-hand-off the lead's tail is up at the
      top edge and the panels are only just rising into the lower third, with
      clear ground between them, which is what the reference shows.
    */
    cardsRise: 95,

    /*
      The horizontal half of the motion.

      Neither block travels straight up. The lead block leaves up AND to the
      left, and the panels arrive from below AND from the right, so the two
      cross on a diagonal rather than sliding along the same vertical line.
      Measured off the hand-off frame: at rest the lead content sits at x 783
      and the first panel at x 678; mid-transition they read at roughly 560
      and 965, which is about 12vw left and 15vw right at the reference width.
    */
    liftX: 12,
    cardsRiseX: 15,

    /** how far each lifts away on the way out, in vh — a full screen, so the
        block is genuinely gone rather than hovering over its replacement */
    lift: 95,
    /** the portrait lags the words very slightly, for depth */
    imageLag: 5,
  },
} as const;

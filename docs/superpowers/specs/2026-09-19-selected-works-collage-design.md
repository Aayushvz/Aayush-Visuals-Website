# Selected Works: staggered collage

**Date:** 2026-09-19
**Section:** `#work` on the homepage
**Replaces:** the ruled ledger (numbered rows, alternating full-width and pairs)

## Why

Aayush supplied two reference crops from a Framer portfolio and asked for the
section to read that way: rounded frames offset against each other, a circular
arrow badge in the corner, and a single caption line per card.

## The mechanic

Measured off the references rather than guessed. Both reference rows are two
top-aligned cards at **3:2**, in a grid whose split **alternates**: the first
row runs ~59.5% / 39% left-heavy, the next flips to 39% / 59.5%. Because the
ratio is constant and the widths are not, the two cards in a row resolve to
different heights, and that is the entire source of the stagger.

- `grid-template-columns: 1.52fr 1fr`, swapped to `1fr 1.52fr` by
  `.selWorks__row--flip`
- gutter `clamp(16px, 1.6vw, 26px)`, frame radius `clamp(10px, 0.9vw, 16px)`
- rows are top-aligned, so the height difference falls out of the bottom of
  the row where it is visible

Verified at 1440px: 759 / 499 = **1.521**, heights 506 / 333, captions landing
173px apart.

No masonry. The shorter card leaves cream beneath its caption, and that gap is
the point: closing it would put the two columns on separate clocks and the eye
would lose the pairing that makes the offset read as deliberate.

## Running order

Seven projects is odd, so one card is alone. The opener takes it:

| Row | Split | Projects |
| --- | --- | --- |
| 0 | solo, 16:9 | Mike Tyson Invitational |
| 1 | 1.52 / 1 | Layover, Elevation Capital |
| 2 | 1 / 1.52 | CPGRAMS, Riviera |
| 3 | 1.52 / 1 | Yantra, Posterfolio |

The opener runs 16:9 rather than 3:2 because 3:2 across the full content width
is over 850px tall, a section rather than a card.

This changes weight for two projects: CPGRAMS drops from a full-width row to a
paired slot, Riviera rises into a wide slot.

`SelectedWorks.tsx` throws at module scope if the row plan does not cover
`SELECTED_PROJECTS`, so a project added to `SELECTED_IDS` with no row to sit
in fails the prerender instead of silently vanishing from the homepage.

## Caption

One line on the card's width: name left, category and year right.

- name: mono, 700, uppercase, `clamp(14px, 1.25vw, 19px)`, ink; purple on
  hover and focus
- category: same family, smaller, `rgba(31,31,31,0.66)`
- year: `© 26`, two digits, full ink so it sets a step above the category
  without putting a second colour on the line

**Dropped:** the `role` subline. It is the one real content loss; roles still
render on `/work` and on each case study.

## Badge

Permanent, not a hover reveal. The global cursor already morphs into a "View
project" pill over these tiles, so a badge that faded in on hover would
announce the same thing twice a beat apart. It stands there as the card's
corner furniture and spends its hover state resolving: fills purple, arrow
travels up-right.

It is a filled cream disc rather than the hairline ring the rest of the site
reaches for, because it sits on arbitrary photography. An ink outline
disappears on a dark cover, a white one disappears on a pale cover.

One glyph, `components/projects/ArrowUpRight.tsx`, shared by the card badge
and the closing panel so the two cannot drift.

## What was removed

Every hairline rule (`.selWorks__divider`, the row borders, the pair centre
divider), the oversized 01–07 numerals, the header's down-arrow glyph and its
folder-icon count. All of those were the ledger's voice; without rows there is
nothing for them to rule.

The header also lost its extra content inset. It sat deeper than the reel while
full-width hairlines spanned the frame behind it: rules out to the rail, text
in to the content column. With the rules gone the indent had nothing to explain
it, so header, cards and closing panel now share the 72px rail edge.

## Closing CTA

Still `.selWorks__endCta`, still not a second `.extCta` (DESIGN.md §7: the
header owns the one primary button in this view). It stops being the ledger's
eighth line and takes the collage's geometry: a full-width outlined panel at
the cards' radius, name left, archive count right, the cards' own badge at the
end. Fills purple on hover, and the badge inverts to cream inside it.

## Responsive

- **≤1080px** the split eases to 1.24 before it collapses, so the narrow slot
  never becomes a thumbnail
- **≤760px** one column; every card takes 3:2 including the opener, which is
  first here rather than large; the closing panel's name and count stack

Verified: 1440 (1.521), 1000 (1.24), 700 (single column, no horizontal
overflow), 362 (single column).

## Accessibility

- focus-visible rules live outside `@media (hover: hover)`, so a
  touch-screen laptop with a keyboard still gets the full resolved state
  plus a purple ring
- every hover resolves as colour as well as travel, so
  `prefers-reduced-motion` removes the movement without losing the state
- `.selWorks__note` moved from `rgba(31,31,31,0.5)` (3.23:1, failing) to
  `0.62`; the fill-state note holds at 85% white on purple (4.54:1)

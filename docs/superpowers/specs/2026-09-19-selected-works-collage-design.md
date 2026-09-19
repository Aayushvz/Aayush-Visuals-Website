# Selected Works: staggered collage

**Date:** 2026-09-19
**Section:** `#work` on the homepage
**Replaces:** the ruled ledger (numbered rows, alternating full-width and pairs)
**Also:** removes the homepage's fixed side rails

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

Six projects, three pairs, every row full. An odd reel would leave one card to
be handled on its own, which is a second layout to maintain for a single tile.

| Row | Split | Wide | Narrow |
| --- | --- | --- | --- |
| 0 | 1.52 / 1 | Mike Tyson Invitational | Layover |
| 1 | 1 / 1.52 | CPGRAMS | Elevation Capital |
| 2 | 1.52 / 1 | Gravitas | Posterfolio |

Riviera and Yantra came out of `SELECTED_IDS`. They are untouched in
`PROJECTS`, so they still render on `/work` and keep their case studies; the
archive count on the closing panel picks them up automatically.

Gravitas here is the website (`"gravitas"`), not `"gravitas-showcase"`, which
is the identity piece built on the same fest. Both cover crops are tighter
than the rest of the reel: Gravitas is a 4:3 source and Posterfolio is 1.28:1,
so a 3:2 frame trims roughly 11% and 15% off their heights respectively.

`SelectedWorks.tsx` throws at module scope if the row plan does not cover
`SELECTED_PROJECTS`, so a seventh project added to `SELECTED_IDS` with no row
to sit in fails the prerender instead of silently vanishing from the
homepage.

## Caption

One line on the card's width: name left, category and year right.

- name: **General Sans** 700, title case, `clamp(14.5px, 1.3vw, 20px)`, ink;
  purple on hover and focus
- category: same face at 500, smaller, `rgba(31,31,31,0.66)`
- year: `© 26`, two digits, full ink so it sets a step above the category
  without putting a second colour on the line

The ledger captioned in mono because mono was doing a ledger's job, lining
year and numeral into columns. With no columns left to keep, the line went to
the body face. It is set as written rather than uppercased: a project's name
is the name it was given, and title case carries the shape of the words,
which is most of how a name is recognised at a glance. Tracking went to zero
at the same time, since mixed case has descenders and x-height doing the work
that letter-spacing does for caps.

**Dropped:** the `role` subline. It is the one real content loss; roles still
render on `/work` and on each case study.

## Badge

A hover reveal, matching the reference: nothing at rest, a disc with an arrow
on hover and on keyboard focus. It *is* the hover state rather than an object
that has one, so it does not also change colour or travel as it arrives; it
grows in from `scale: 0.86` and that is the whole event. `pointer-events:
none`, because the whole card is the link.

Sized in `cqw` against the frame (`container-type: inline-size` on
`.selWork__frame`), so it holds 9% of the card at both the 759px and the
499px widths instead of reading correct on one and oversized on the other.

A filled disc rather than the hairline ring the rest of the site reaches for,
because it lands on arbitrary photography: an ink outline vanishes on a dark
cover, a white one vanishes on a pale cover. The fill is `--card-hover`, the
site's existing cream-lifted-off-the-page token.

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

## Closing action

`.selWorks__endCta`, still not a second `.extCta` (DESIGN.md §7: the header
owns the one primary button in this view). A compact outlined pill at the
grid's left edge, split into two compartments by a full-height hairline:
label, then count and arrow. Measured at 1440: 230x49px, left edge at 72px
which is the grid's own, 999px radius, hairline border, no fill. At 375 it is
207x46 and stays a row.

`width: fit-content` rather than `display: inline-flex`, because an inline
box sits on a text line and collects its descender space underneath.

The visible count is `aria-hidden` and restated as a phrase in an `srOnly`
span, the way `ExtCta` handles its own badge, so the accessible name resolves
to "View all projects, 12 more in the archive" rather than
"View all projects12". Verified by walking the subtree and skipping
aria-hidden.

### The two shapes it replaced

Worth keeping, because both failures were informative.

It shipped first as a **full-width outlined panel** at the cards' radius:
131px tall to carry 23px of type, a border drawn around one line and a great
deal of empty.

The correction was a **bare full-width line** on the card captions' two
anchors, label at the grid's left edge and muted count at the right. That
measured beautifully (23px tall, the count's right edge landing exactly on
the last card's) and read badly: at 1280px wide the two ends are nine hundred
pixels apart, so they scan as two unrelated fragments, and a line of bold
text does not say it can be clicked.

The lesson is the same in both directions. A control needs an edge you can
point at, and that edge has to be close to the label rather than at the far
side of the page. Width should come from the content, not from the container.

## Cursor

The reel's tiles get their own cursor variant, `data-cursor="work"`, instead
of the site-wide `data-cursor="project"` that the `/work` index and the
case-study pages keep. The generic one is a cream pill reading "View
project", which is the right label where the name is already on the page.
It is not right here: the reel puts its caption *below* the cover, so a
pointer resting on the artwork is not reading the name. The reel's pill
carries it, over two lines, project then category.

`components/projects/ProjectCursor.tsx` exports `workCursorProps(title,
category)`, which writes the values onto the element as data attributes. The
cursor reads them on `pointerover` rather than looking anything up, because
the cursor has no idea which project it is over and should not have to learn
the data layer to find out. `Cursor.tsx` writes the two strings straight to
the DOM through refs: `pointerover` fires for every element boundary the
pointer crosses anywhere on the page, and routing that through React state
would re-render the cursor on each one. It also caches the last title
written, so crossing between the frame and the caption inside one card does
not rewrite identical text.

The work check runs before the project check, so a reel tile can never light
both pills. On exit the class comes off but the text stays: clearing it
would blank the pill mid-fade, and it is already invisible.

**No `backdrop-filter`, although the reference is glass.** This element
translates every animation frame, frequently over an autoplaying WebM, and a
real backdrop blur re-samples what is behind it on each of those. This repo
has been bitten by that before (the Statement tool tiles, where it hung
screenshot capture outright). A dark translucent fill with a hairline edge
and an inset top highlight reads the same for nothing.

Measured: 233x58px, 999px radius, `rgba(26,24,30,0.66)` fill, white 600 title
at 14.5px over a `rgba(255,255,255,0.62)` 500 subtitle at 12.5px.

## Touch

The badge lives in `@media (hover: hover)`, so on a phone it would never
appear: there is no hover to reveal it with, and the cursor pill that carries
the affordance on a pointer does not exist either. `@media (hover: none)`
stands it permanently. Keyed on hover capability rather than width, because
what decides it is whether the device can hover, not how wide it is; a touch
laptop at 1400px has the same problem as a phone at 390.

At 375 the badge lands at 11.8% of the card, against 11.4% in the reference.
At 320 the longest name wraps to two lines, which is the one width where this
caption cannot stay a line; it wraps rather than hiding the category, and
`text-wrap: balance` keeps the wrap from orphaning a word.

## Section background

The About surface moved from `#fffdfa` to `--cream`, the colour every other
light section on the page already used. It was the one light surface that did
not match its neighbours. The stage, the panel and the stepped bands that
rise above its top edge are one surface and all three moved together; leaving
any behind would have had the steps arrive in a colour the panel behind them
is not.

## Side rails

The rails run to The Skills Deck and stop. Hero, About and Statement sit
inside a frame and the hairlines are that frame; from the deck down every
section sets its own edges (a pinned 3D carousel, a collage of rounded cards,
a torn-edge pane, a full-bleed gallery), and lines ruled over those read as
chrome nobody switched off.

`components/RailsEnd.tsx` renders a zero-height marker at the boundary, which
measures identical to `#services`'s top edge, and toggles `past-rails` on the
document element; `.rails` fades over 0.5s. `.process__rails` was deleted
outright, being below the line. `.statement__rail` stays, being above it.
`/about` renders `.rails` too and never sets the flag, so its pair is
untouched.

**The trap, hit once:** the first version used an IntersectionObserver
against a one-pixel band at the viewport top. That fires exactly twice, once
each way, so the state between those two events is whatever the *first*
callback decided, and that callback runs at mount, while the Preloader is up
and the deferred sections below have not reserved their heights. A bad
measurement there switched the rails off at load and left them off until you
scrolled past the deck and back. A rAF-coalesced scroll handler has no such
memory: it re-asks on every frame that moves, so a bad mount measurement
survives until the first scroll rather than for the whole visit. This is the
idiom `Hero` already uses for `past-hero`.

Verified at five positions: load and top (on), Statement (on), the deck's top
edge (off), well past it (off), scrolled back up (on).

## Responsive

- **≤1080px** the split eases to 1.24 before it collapses, so the narrow slot
  never becomes a thumbnail
- **≤760px** one column, every card at 3:2, and the closing panel's name and
  count stack

Verified: 1440 (1.521), 1000 (1.24), 700 (single column, 630x420 throughout,
no horizontal overflow), 362 (single column).

## Accessibility

- focus-visible rules live outside `@media (hover: hover)`, so a
  touch-screen laptop with a keyboard still gets the full resolved state
  plus a purple ring
- every hover resolves as colour as well as travel, so
  `prefers-reduced-motion` removes the movement without losing the state
- `.selWorks__note` moved from `rgba(31,31,31,0.5)` (3.23:1, failing) to
  `0.62`; the fill-state note holds at 85% white on purple (4.54:1)

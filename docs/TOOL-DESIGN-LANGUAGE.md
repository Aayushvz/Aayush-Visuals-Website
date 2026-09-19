# Tool design language

How the site's **tools** look and behave. Extracted from `/contract` (the
contract generator), which is the reference implementation: every value
below is lifted from `components/contract/contract.css`, not invented for
this document.

A tool is a full-screen working surface with panels, controls and a live
artifact. `/contract` is one. `/cricket` and `/frog` are not, they are
toys with their own worlds. If you are building the next tool, read this
and `DESIGN.md` together: `DESIGN.md` governs the site, this governs the
instrument sitting inside it.

**Prefix convention:** `/contract` prefixes everything `cg`. Pick your own
two or three letter prefix and use it just as absolutely. Wherever this
document says `cg`, substitute yours.

---

## 1. The non-negotiables

These are the rules that were broken at least once during `/contract`'s
build and cost real time each. They are not style preferences.

**Every selector carries the prefix.** The route stylesheet is a plain
import, so a bare `a` or `*` selector escapes the route. Two leaked
during the build: `*:focus-visible` and, in the print block, a bare `a`.
The only sanctioned exceptions are `.cgShell *:focus-visible`,
`@page`, and scrollbar pseudo-elements scoped under `.cgShell` (a
pseudo-element cannot carry a prefix itself, so the ancestor must).

**Theme tokens live on the shell, never `:root`.** `DESIGN.md` section 1
records that the site removed its global light/dark switch on purpose. A
tool may have one anyway, but only because its tokens sit on
`.cgShell[data-cg-theme="light"|"dark"]` and cannot reach past the route.
Scoping is the entire justification. Break it and the exception is not
earned.

**Never persist the theme. Do persist the user's work.** Leaving the
route is the way back from any look chosen inside it, so a stranded
visitor is impossible. Their typed data is different, and it belongs in
`localStorage` behind its own key.

**One key per concern.** `/contract` uses `cg-draft`, `cg-style`,
`cg-overrides`, `cg-logo`. Separate because the largest thing stored (an
imported logo) is the most likely to hit quota, and it must not take
hand-typed prose down with it. Wrap every read and write in try/catch and
merge over defaults on read, so an older stored shape cannot crash the
route.

**One filled control per view.** `/contract` fills only `Export`. When a
mode changes what is primary, the fill moves rather than multiplying:
in edit mode `Save` is filled and `Export` drops to ghost. Never two.

**Anchor anything you hide with `position: absolute`.** A visually
hidden but still focusable control (a file input behind a label, a
checkbox behind a switch) needs an offset of its own AND a positioned
parent. With neither, its containing block is the initial containing
block: it stops travelling with the panel's scroll and keeps the static
position it would have had in the unscrolled column, which for a block
low in a long panel is below the fold. Focusing it, which is what
clicking the label does, makes the browser scroll an off-screen focused
element into view, and the whole shell slides up with the page
background showing underneath. `/contract` shipped this on its logo
field and had it twice more in the same stylesheet.

**No em dashes anywhere,** including code comments and generated document
prose. Hyphens, commas, or restructure.

---

## 2. Tokens

All on `.cgShell`. Copy the structure, not necessarily the values.

### Controls

```css
--cg-control-radius: 8px;   /* every button, input, trigger, list row */
--cg-control-h: 36px;       /* buttons */
--cg-field-h: 38px;         /* text inputs and select triggers */
--cg-control-label-size: 13px;
--cg-control-label-weight: 500;
--cg-control-pad-x: 14px;
--cg-round: 999px;          /* the named exception, see below */
```

**Two control heights, not three.** Buttons at 36, fields at 38. The
difference is deliberate and small. A third height is drift.

**One radius.** Full pills are reserved for shapes where round IS the
meaning: a completion ring, a switch track. `--cg-round` exists to name
that exception so it reads as a decision. Everything else is 8px. Pills
on ordinary buttons read as a casual app; a tool wants a precise
instrument.

**One label size and weight for every control.** Before this was
enforced, `/contract` had Export at 13/500, Reset at 12/400 and ghost
buttons at an inherited 13.3/400, sitting inches apart. That
inconsistency, not taste, was the whole reason it looked less finished
than the tool it was being compared against.

### Panel type

```css
--cg-panel-title: 13px;    /* group names, switch labels, row titles */
--cg-panel-input: 13.5px;  /* text the user typed */
--cg-panel-hint: 11px;     /* secondary line under a title */
--cg-panel-label: 10.5px;  /* mono uppercase field labels */
```

Side panels are dense instrument surfaces, not reading columns. Sizes
that feel comfortable alone read oversized once six groups, four colour
rows and five toggles stack in a 360px column.

The panel eyebrow stays **11px / 700** and is deliberately outside this
scale. It is the anchor everything else is read against; shrinking it
with the rest preserves a flat hierarchy at a smaller size.

### Icons

Hand-rolled in a local `icons.tsx`, never an icon library. `/contract`
ships around twenty for zero added dependencies, and nothing unused.

```
24px viewBox · 1.5px stroke · fill="none" · stroke="currentColor"
round linecap and linejoin · aria-hidden · focusable="false"
```

Sized with a shared CSS class, not `width`/`height` attributes, and
`currentColor` so they theme for free. They are decorative: the control
they sit in already carries the accessible name.

**Brand marks are the exception and are filled**, because a real wordmark
(Behance's, for instance) has no honest outline form and an approximated
one stops reading as the brand. The rule that matters: whatever you
choose, **every mark in the same row shares it**. One filled logo beside
two hairline outlines reads as two different families, which is exactly
how `/contract`'s footer looked until the other two were filled to match.

### Layout

```css
--cg-radius: 10px;    /* surfaces, not controls */
--cg-form-w: 380px;   /* 360 once a right panel docks */
--cg-side-w: 300px;
--cg-bar-h: 56px;     /* toolbar AND both panel headers */
```

`--cg-bar-h` governs three bars. The toolbar and both panel headers are
the same height and flush to the top of their column, so labels and
collapse buttons share a line straight across the app.

### Theme

Declared twice, once per theme, never on `:root`:

```
--cg-bg  --cg-panel  --cg-fg  --cg-fg-2  --cg-line  --cg-line-2
--cg-field  --cg-accent  --cg-accent-fg
--cg-paper  --cg-paper-fg  --cg-paper-shadow  --cg-dot
```

The `--cg-paper-*` set is the artifact the tool produces, on its own axis
from the chrome around it. Also set `color-scheme: only light` / `only
dark` per theme block, or native inputs, scrollbars and autofill follow
the OS instead of your toggle.

**On its own axis means the artifact does not follow the toggle.**
`/contract` defaults to dark chrome and its document is paper-white in
both themes, because the artifact is the thing being printed and a
contract that previews dark then prints white is a preview that lies. The
toggle dresses the working surface; a user who wants a dark sheet sets the
document's own Background and Text.

Two consequences. `color-scheme: only dark` is right for the chrome but
the sheet inside it is light, so give the artifact an explicit
`::selection` or the UA picks a dark-mode highlight and drops it on white.
And any constant mirroring the paper tokens in JS (a contrast readout's
baseline, say) stops being keyed by theme: collapse it rather than leaving
two identical branches and a now-dead `theme` prop feeding them.

---

## 3. Layout shape

```
┌─ TOOLBAR (--cg-bar-h) ───────────────────────────────┐
│ ← logo    label            ring  ghosts  [ PRIMARY ] │
├──────────────┬────────────────────────┬──────────────┤
│ INPUT PANEL  │       ARTIFACT         │ OPTIONS      │
│ --cg-form-w  │         1fr            │ --cg-side-w  │
└──────────────┴────────────────────────┴──────────────┘
```

**Both side panels collapse** to a 44px rail with a vertically rotated
label, and the artifact reclaims the width. State is React only, never
persisted.

**Derive breakpoints from the width budget, do not pick them.** The
artifact needs a floor. For `/contract`: chrome is `360 + 300 = 660`, the
document measures about `paper - 99`, so a 600px floor needs
`W >= 1359`, and the panel docks at 1400. When the layout changes, redo
the arithmetic. A threshold tuned for a column that no longer exists once
left the document at 343px on a 1280 screen, narrower than on a phone.

**A JS media query must match its CSS breakpoint.** `/contract` gates
focus and `inert` handling on `matchMedia("(min-width: 1400px)")`. Leave
it behind when the CSS moves and you get a band where the panel looks
docked but behaves like an overlay.

### Phone (below 1100px)

Top bar holds the back link with logo, the theme toggle, and the primary
action. Nothing else. A **bottom tab bar** carries the surfaces, thumb
reachable, so the options panel is a real destination rather than
unreachable. Infrequent controls (Reset) move into the options tab.

Do not reserve space for site chrome a tool route does not render. An
86px mobile-nav clearance for a nav that was never there cost 20% of an
844px screen before the first field.

---

## 4. Behaviour

**Progressive disclosure.** One accordion group open at a time.

**No empty state.** Unfilled values render as a muted placeholder so the
artifact is whole from the first second. Use a sentinel the user cannot
type (`/contract` uses `U+E000`, displayed as `--`) rather than a literal
string. A literal `--` meant a user typing "Q3--Q4" had their real text
styled as an unfilled field.

**Live feedback is the reward loop.** Every keystroke repaints the
artifact. A completion ring is the only progress chrome. No toasts.

**Press feedback** lives in the route stylesheet, listed by selector, not
in `globals.css`. `cricket.css` and `pond.css` do the same. Controls
press to `0.97`; under `prefers-reduced-motion` they dim instead.

**Motion tokens only:** `--ease-quint`, `--dur-press`, `--dur-hover`,
`--dur-state`, `--dur-panel`. Where a JS animation library cannot read a
custom property, `duration: 0.42` with `ease: [0.22, 1, 0.36, 1]` is the
same curve. Every animation needs a reduced-motion path.

**Replace native `<select>` and `<input type="date">`.** Their popups are
OS-drawn and unreachable from CSS. Build a listbox and a calendar with
full keyboard contracts (arrows, Home/End, Escape returning focus to the
trigger). Styling the closed control is not enough.

**Declaring an ARIA role means implementing its contract.** A
`role="menu"` without focus management is worse than no role, because it
promises a screen reader something that will not happen.

---

## 5. Output, if the tool produces a document

**One source of truth.** The artifact's content lives in exactly one
module as a pure function of state, returning structured blocks. Every
renderer consumes that one array. `/contract` has four (screen, markdown,
Word HTML, and previously an index rail) and derives numbering from array
position, so no renderer owns the numbers.

The one place `/contract` hand-wrote the same block in three renderers,
the document header, drifted within a single branch: one said "Project",
two said "Project Name", and the placeholder appeared on screen but not
in the exports.

**PDF is a print stylesheet, not a canvas library.** Text stays vector
and selectable. `@page { size: A4; margin: 18mm }`.

**In paged media, width queries evaluate against the page box,** not the
window. An A4 page box minus 18mm margins is about 658px, so a
`max-width: 1099px` mobile rule fires while printing at any window size.
This printed a blank PDF once and a one-page-clipped PDF once. In the
print block: force the artifact back to `display: block !important`, undo
any flex height on the shell, and hide every piece of chrome explicitly.

**Word export is HTML with a `.doc` extension.** Tables, headings and
paragraphs with inline styles only; no flex, no grid, no custom
properties. Escape all user input.

**Markdown is plain text.** Do not embed base64 images in it.

---

## 6. Testing

Node's built-in runner (`node --test`), no test framework dependency. It
strips TypeScript natively, so tested modules must avoid `enum`,
`namespace`, decorators and parameter properties, must not import React,
and need explicit `.ts` import extensions, which requires
`allowImportingTsExtensions` in `tsconfig.json`.

Test the pure modules. Verify components in a browser.

**Know what the gates do not cover.** Every test passed while
`/contract` had a Save button that silently discarded edits, a PDF that
printed blank, a document rendering at 343px, and an Export button
off-screen on phones. CSS and cross-component state are the untested
surfaces. Measure the running page.

**Measuring in the Claude browser pane:** a hidden pane does not
composite, so `requestAnimationFrame` never fires, CSS transitions read
stale through `getComputedStyle`, and framer-motion exits never complete.
Settle with `getAnimations().forEach(a => a.finish())` before reading.
If `document.hasFocus()` is false, Chrome fires no blur or focusout at
all, so anything committing on blur cannot work: assert it first. Trust
measured DOM over screenshots.

# Freelance Contract Generator - design

Date: 2026-09-17
Status: approved, ready for implementation planning

A client-side tool that turns a form into a finished freelance service
agreement, previewed live and downloadable as PDF, Word or Markdown. It ships
as playground experiment 03 on aayushvisuals.com.

Reference studied: `rajandube.com/resources/contract-generator`. Its three
panel dashboard (form accordion, live paper, design controls) is the starting
point. This design keeps the first two, replaces the third with three curated
skins, and rebuilds everything on this site's own tokens.

---

## 1. Goals and non-goals

### Goals

- A visitor fills a form and watches a real legal document assemble in front
  of them, live, with no submit step.
- The finished contract leaves the browser in three formats: a paginated PDF,
  an editable Word file, and Markdown.
- The page demonstrates modern minimal dashboard craft: progressive
  disclosure, one primary action, live feedback, hairline chrome.
- Light and dark mode, both fully designed, neither an inversion of the other.
- Zero new npm dependencies.

### Non-goals

- No server, no database, no account. Everything is client side.
- No e-signature, no sending, no sharing link.
- No arbitrary font or colour pickers (see section 6).
- No legal guarantee. The document carries a visible disclaimer telling the
  reader to consult a qualified professional for their jurisdiction.

---

## 2. Placement and file layout

Route `/contract`, top level, reachable from `/playground` as entry 03. This
follows the `/frog` and `/cricket` precedent: a self contained world with its
own route scoped stylesheet, linked from the shelf.

```
app/contract/page.tsx                metadata only, renders the client shell

components/contract/
  ContractGenerator.tsx              client shell, owns all state
  Toolbar.tsx                        back link, title, completion ring, skin,
                                     theme toggle, export menu
  FormPanel.tsx                      the accordion, driven by schema.ts
  ClauseRail.tsx                     the 01-13 sticky index
  DocPaper.tsx                       the live document
  schema.ts                          field groups, the form's source of truth
  clauses.ts                         the contract text as data
  render-html.ts                     clauses -> Word compatible HTML
  render-md.ts                       clauses -> Markdown
  exporters.ts                       print, .doc blob, .md blob
  useContractDraft.ts                state, completion maths, persistence
  contract.css                       every selector prefixed `cg`
```

Changes to existing files, all additive:

- `components/playground/experiments.ts` - add entry 03, drop one `SOON` slot
  so the shelf row still fills.
- `components/playground/covers.tsx` - add `ContractCover`, drawn in CSS and
  SVG like the existing two, no raster asset.
- `DESIGN.md` - a short note in section 1 recording the route scoped theme
  exception and why it does not reopen the removed site wide toggle.

No edits to `app/globals.css`. No new route layout is needed: the skins use
General Sans and Instrument Serif, both already loaded by the root layout.

---

## 3. Layout

Two working columns plus a thin index rail. The reference's third column is
not justified once the design controls collapse to three options, and a third
column would eat the width the document needs to stay legible.

```
+-- TOOLBAR ---------------------------------------------------+
| < Playground   Service Agreement       (o) 72%   [ Export v ]|
+--------------+----+------------------------------------------+
| CONTRACT     | 01 |                                          |
| DATA         | 02 |        Service                           |
|              | 03 |        Agreement                         |
| v Designer   | 04 |                                          |
|   Client     | 05 |   -------------------------------        |
|   Project    | .. |   01. Parties & Effective Date           |
|   Fees       | 13 |   ...                                    |
|   Timeline   |    |                                          |
|   Clauses oo |    |                                          |
+--------------+----+------------------------------------------+
     380px      46px                 1fr
```

### Responsive behaviour

| Width | Behaviour |
|---|---|
| `>= 1100px` | Three zones as drawn. Form and rail are sticky, paper scrolls. |
| `640-1099px` | Two tabs in the toolbar: `Contract Data` / `Preview`. The rail folds into the top of the preview tab as a horizontal scroller. |
| `< 640px` | Same tabs. The paper scales with `transform: scale()` on a fixed A4 width rather than scrolling horizontally, so the document always reads as a page. |

The mobile nav is a fixed 58px pill on every page, so the toolbar reserves
`--mnav-clear` on small screens rather than sitting under it.

---

## 4. Dashboard principles

These are the rules the build is held to, and the review criteria for it.

1. **One primary action.** `Export` is the only filled control on the page.
   Everything else is hairline outline or ghost, per `DESIGN.md` section 8.
2. **Progressive disclosure.** Seven accordion groups, one open at a time.
   The user never faces forty inputs at once.
3. **Live feedback is the reward loop.** Every keystroke repaints the
   document. The completion ring is the only progress chrome. No toasts, no
   saved badges, no confirmation dialogs.
4. **No empty state.** Unfilled fields render in the paper as muted
   placeholder text, so a whole contract is visible from the first second.
   This is the single detail that makes the tool feel real rather than like a
   form with a preview bolted on.
5. **Density with air.** 8px base grid, 4px inside controls. Labels are 11px
   mono uppercase at `0.14em` tracking, values 15px.
6. **Hairlines, not boxes.** Dividers over cards. No nested cards, no glass,
   no gradient text, no side stripe accents.
7. **Keyboard complete.** Full tab order, every input labelled, focus rings
   visible in both themes, accordion headers are real buttons with
   `aria-expanded`.

---

## 5. The contract as data

The decisive architectural rule: **the contract text lives in exactly one
place.**

`clauses.ts` exports a function of the form state that returns an ordered
array of clause objects. Each clause is a heading plus typed blocks:

```ts
type Block =
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; rows: [string, string][] }
  | { kind: "subhead"; text: string }
  | { kind: "signature" };

type Clause = {
  id: string;
  title: string;
  optional?: boolean;   // can be switched off in the form
  blocks: Block[];
};
```

Three renderers consume that one array:

```
clauses.ts --+--> DocPaper.tsx      React, for screen and print
             +--> render-html.ts    HTML string, for the .doc blob
             +--> render-md.ts      Markdown string, for the .md blob
```

Numbering is derived at render time from position in the filtered array, never
hardcoded in the text. Switching off an optional clause removes it and
renumbers everything below it, in the preview, the rail, and both exports, in
the same frame.

Without this rule the Word export drifts from the preview within a week. With
it, a typo is fixed once.

### The thirteen clauses

Matching the reference's spine, which is a sound freelance agreement:

| # | Clause | Optional |
|---|---|---|
| 01 | Parties & Effective Date | no |
| 02 | Project Scope & Deliverables | no |
| 03 | Timeline & Delays | no |
| 04 | Fees, Expenses & Payment Policy | no |
| 05 | Changes & Revisions | no |
| 06 | Intellectual Property & Ownership | no |
| 07 | Client Responsibilities | no |
| 08 | Attribution & Portfolio Rights | yes |
| 09 | Confidentiality & Non-Solicitation | yes |
| 10 | Warranties, Liability & Indemnification | yes |
| 11 | Termination & Suspension | yes |
| 12 | General Provisions | no |
| 13 | Signatures | no |

The four optional clauses are the `Optional Clauses` accordion group. They are
the tool's one piece of real delight: a switch that visibly rewrites a legal
document.

Clause 04 also contains a late payment fee that can be switched off, but that
toggle lives in the `Fees & Payment` group beside the percentage it controls,
not in `Optional Clauses`. It suppresses a sub clause, not a whole numbered
clause, so it triggers no renumbering.

---

## 6. Form schema

`schema.ts` describes seven groups. The form panel and the completion maths
both read it, so adding a field is a one line change.

| Group | Fields |
|---|---|
| Designer | name, role, email, phone, address, entity type (Individual / Sole Proprietor / Company), GST number (optional) |
| Client | name or company, contact person, email, phone, address |
| Project | project name, description, deliverables (repeatable list), acceptance window in business days |
| Fees & Payment | currency, total fee, advance percentage, hourly rate, late fee toggle and percentage, expense markup |
| Timeline | effective date, start date, end date, feedback turnaround in business days |
| Jurisdiction | governing city, state, country |
| Optional Clauses | five toggles (see section 5) |

### Defaults

India first but switchable. Ships prefilled with Aayush Raj as the Designer.
Currency is a dropdown (INR, USD, EUR, GBP) that drives the symbol and the
number formatting throughout the document, including Indian grouping for INR
(`1,50,000`) and Western grouping for the rest (`150,000`). Jurisdiction is
free text, defaulted to India. GST is an optional field that disappears from
the document when empty.

### Completion

A percentage over the required fields only. Optional fields and toggles never
count against it. It reads out in the toolbar as a ring plus a number and is
the only progress indicator on the page.

---

## 7. Skins

Three curated skins replace the reference's font and colour pickers. A font
dropdown would let a stranger render this contract in a face that is not part
of this site's system, and the output would stop looking like Aayush's work.

| Skin | Display face | Paper | Character |
|---|---|---|---|
| Studio | General Sans 600 | cream | the house look, default |
| Editorial | Instrument Serif 400 | warm white | generous leading, large display |
| Plain | General Sans 500, mono labels | pure white | maximum legality, tightest |

The skin sets the paper's own tokens only. It is independent of the light and
dark theme, which paints the dashboard chrome around it.

---

## 8. Theme

Tokens are declared on `.cgShell[data-cg-theme="light"]` and
`.cgShell[data-cg-theme="dark"]`, never on `:root`.

Light is the site's cream and ink family. Dark is near black with off white.
`--purple` is the accent in both, adjusted for contrast on the dark ground.
Both themes clear 4.5:1 for body text and 3:1 for large text, per `DESIGN.md`
section 2.

State is React local. There is no persistence, the choice resets on leave, and
nothing outside `.cgShell` is touched. This is why it does not reopen the
problem that removed the site wide toggle: no visitor can be stranded on a
look they have no way back from, because leaving the route is the way back.
`DESIGN.md` gets a note saying exactly this.

The theme toggle defaults to `prefers-color-scheme` on first paint.

---

## 9. Export

All three outputs are produced from the same clause array (section 5).

### Save as PDF

A real print stylesheet, not a screenshot. `@page { size: A4; margin: 18mm }`.
In print, the toolbar, form, rail and every control are `display: none`, the
paper goes to full width at its natural size, `break-inside: avoid` protects
each clause, and the signature block gets `break-before: auto` with enough
reserved space that it is never orphaned. Text stays vector and selectable,
which no canvas based library can offer.

The Export menu item opens `window.print()`. The browser's own page headers
and footers (URL, date, page numbers) are not controllable from CSS, so the
18mm margin is sized to sit clear of them and the document does not attempt to
draw its own running header. The disclaimer sits once at the end of the
document rather than repeating per page.

### Word (.doc)

`render-html.ts` produces a Word compatible HTML document, wrapped in a
`Blob` with type `application/msword`, downloaded via an object URL and a
synthetic anchor. This opens editable in Word, Pages and Google Docs. No
dependency, no zip, no Office Open XML packaging.

### Markdown (.md)

`render-md.ts` produces plain Markdown with the tables rendered as pipe
tables. Blob, download, done.

Filenames are derived from the project name and the date, slugified, falling
back to `service-agreement` when the project name is empty.

---

## 10. Persistence

The draft, and only the draft, autosaves to `localStorage` under `cg-draft`,
debounced. `Reset all` at the foot of the form clears it and restores the
defaults.

This is deliberately different from the theme decision. A thirteen section
form is long enough that losing it to an accidental refresh is painful, and
what is stored is data the user typed rather than a look they can get stuck
on. The reset control is visible and unconditional, so there is always a way
out. A malformed or outdated stored draft is discarded on read rather than
throwing, and every read and write is wrapped so that a private window or
blocked site data degrades to a working, unsaved tool.

---

## 11. Motion

Per `DESIGN.md` section 5, using the existing tokens.

- Accordion open and close: height and opacity on `--dur-panel` with
  `--ease-quint`.
- Clause removal and renumbering: framer-motion layout animation on the paper
  and the rail, `--dur-panel`.
- Theme swap: colour only, `--dur-state`.
- Controls press to `0.97`, listed by name rather than blanket styled. The
  selector list lives in `contract.css`, not in the MICRO-INTERACTION LAYER
  block of `globals.css`: route scoped worlds own their own press feedback
  here, which is why no `ckt` or `pond` selector appears in `globals.css`
  either. This is what keeps section 2's "no edits to globals.css" true.
- Under `prefers-reduced-motion: reduce`: accordions snap, layout animation is
  disabled, the theme swap is instant. Press feedback dims instead of scaling.

There are no perpetual ambient loops on this route, so nothing needs adding to
the reduced motion safety net list.

---

## 12. Accessibility

- Accordion headers are `<button aria-expanded>` controlling labelled regions.
- Every input has a real `<label>`, not a placeholder standing in for one.
- The clause rail is a `<nav>` of anchors that scroll the paper.
- The live document is the source of truth, not an `aria-live` region: it is
  too large to announce on every keystroke. Instead the completion percentage
  is `aria-live="polite"` and announces only when it changes.
- Focus rings visible in both themes, never removed.
- Touch targets 44px minimum on the toggles and the accordion headers.

---

## 13. Verification

There is no test infrastructure in this repo, so verification is done in the
browser preview and evidenced with screenshots.

1. Type through all seven groups, confirm the paper repaints live and the
   completion ring tracks.
2. Toggle light and dark, confirm the rest of the site is unaffected by
   navigating away and back.
3. Switch each of the three skins.
4. Switch each optional clause off and on, confirm the paper, the rail and
   both text exports renumber together.
5. Download the `.doc` and the `.md`, open both, confirm the text matches the
   preview exactly including the renumbering.
6. Open the print dialog and screenshot the paginated result, confirming no
   clause is split across a page break and no chrome appears.
7. Check the three responsive breakpoints.
8. Run with reduced motion on and confirm every animation has a path.
9. `npm run build` passes with no new type errors.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| The Word HTML renders badly in Google Docs | Keep the HTML conservative: tables, headings, paragraphs, inline styles only. No flexbox, no grid, no custom properties. |
| Print pagination splits a clause awkwardly | `break-inside: avoid` per clause, verified by screenshot at step 6 rather than assumed. |
| The contract text drifts between renderers | Structurally prevented by section 5. There is no second copy of the text to drift. |
| `contract.css` grows into another 3000 line file | Seven components, each owning a named block in the file, with the section comments this repo already uses. Revisit if it passes ~1200 lines. |
| Legal exposure from a generated contract | A visible disclaimer in the document footer and on the page, matching the reference's own posture. |

# Alternate pixel homepage at /test

**Date:** 2026-10-07
**Goal:** A full-viewport pixel-art hero at `/test`, traced as closely as
possible from a supplied reference image.

## Decisions taken

| Question | Decision |
|---|---|
| Scope | The hero screen only. Nothing below the fold. |
| Motion | Alive but restrained: sticker drift, mosaic shimmer, pixel cursor, hover response. No physics. |
| Chrome | Keeps the existing site navbar. Not edge-to-edge. |
| Letterforms | Hand-drawn on a pixel grid, not a stock pixel font. |
| Name | "Aayush's", replacing the reference's "Neetin's". |
| Indexing | `robots: noindex` - /test is a scratch route, not a real page. |

## Why hand-drawn and not a font

The reference wordmark is not a stock face. The `P` is notched, the `o` is a
rounded square, the `f` curls. Pixelify Sans is the closest thing on Google
Fonts and is still a visibly different alphabet. Any substitute font puts
every letter in the wrong shape, which is the one thing "pixel by pixel"
cannot survive. So the letterforms are authored as bitmaps.

**Exception:** "Neetin's" in the reference is smooth and anti-aliased, not
pixelated. Hand-drawing it would diverge from the image, so that single line
uses a real bold geometric sans.

## Architecture

Three units, each independently understandable:

1. **`pixelFont.ts`** - data only, no rendering. Exports glyph bitmaps as
   arrays of strings (`#` filled, `.` empty) plus metrics. Two sizes: a tall
   display set for the wordmark, a compact set for stickers.
2. **`PixelText.tsx`** - takes a string, looks up glyphs, renders SVG rects.
   The heavy outline is **computed, not drawn**: any empty cell orthogonally
   adjacent to a filled cell becomes an outline cell. One pass, so the
   outline can never fall out of sync with the letterform.
3. **`TestHero.tsx`** - composition only. Stage, mosaic, glow, wordmark,
   stickers, cursor.

## The stage

- Purple ground with a large-cell mosaic: blocks of varying lightness,
  softened, with a radial highlight toward the centre-left and a vignette.
- Blurred, out-of-focus card shapes at the corners for depth of field.
- Two-line wordmark centred, sitting on a dark purple glow blob.
- Magenta light-leaks inside the `o` of Port and the `t`.
- Five stickers, each rotated: HELLO and OMG! speech bubbles, WELCOME label,
  dark "Best works ahead" bar, and a cut-off bar bottom-left.
- A pixel cursor arrow tracking the real pointer, which is hidden.

## Motion

Everything respects `prefers-reduced-motion`.

- Stickers: slow independent drift and wobble, a few degrees and pixels.
- Mosaic: cells shift lightness very slowly.
- Cursor: follows the pointer directly, no easing.
- Wordmark: letters lift slightly on hover.

## Out of scope

Below-the-fold sections, grabbable physics stickers, replacing the real
homepage, mobile-specific art direction beyond scaling the stage down.

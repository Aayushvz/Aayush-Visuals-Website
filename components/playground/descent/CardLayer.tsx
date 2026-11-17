"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DescentCard } from "./cards";
import type { ScreenMap } from "./CardAnchors";

/*
  The DOM half of each card, parked on top of its panel in the scene.

  One fixed layer, one transform per card per frame, written straight to
  style rather than through React state — eight setStates a frame would
  re-render this list sixty times a second for no reason. The only state
  here is which card is open and which is nearest, and both change rarely.
*/
/* world units: a card is at full strength this close, and gone by the
   second. Tuned against CARD_SIDE_OFFSET — a card you are level with sits
   about 8 units away. */
const FADE_START = 14;
const FADE_END = 34;

/*
  Where card `i` of `n` belongs on screen once they have all gathered.

  The ring in the scene is spaced so the panels never overlap in world
  space, but a DOM card is a fixed 300px however far away its panel is,
  so projecting eight of them lands a heap in the middle of the screen.
  The finale is the one moment the whole page builds to, so the cards
  stop tracking their panels and lay themselves out to be read instead.
*/
function finaleSlot(index: number, n: number, vw: number, vh: number, cardW: number, cardH: number) {
  const cols = vw > 1180 ? 4 : vw > 820 ? 3 : 2;
  const rows = Math.ceil(n / cols);
  const gap = 14;
  const pad = 24;

  /* shrink to fit rather than overflow: eight full-size cards do not fit
     a laptop screen, let alone a phone */
  const slotW = (vw - pad * 2 - gap * (cols - 1)) / cols;
  const slotH = (vh - pad * 2 - gap * (rows - 1)) / rows;
  const scale = Math.min(1, slotW / cardW, slotH / cardH);

  const col = index % cols;
  const row = Math.floor(index / cols);
  const blockW = cols * slotW + (cols - 1) * gap;
  const blockH = rows * slotH + (rows - 1) * gap;

  return {
    x: (vw - blockW) / 2 + col * (slotW + gap) + slotW / 2,
    y: (vh - blockH) / 2 + row * (slotH + gap) + slotH / 2,
    scale,
  };
}

export default function CardLayer({
  cards,
  screens,
}: {
  cards: DescentCard[];
  screens: React.RefObject<ScreenMap>;
}) {
  const refs = useRef(new Map<string, HTMLLIElement>());
  const [open, setOpen] = useState<string | null>(null);
  const [nearest, setNearest] = useState<string | null>(null);

  /* the gallery reads in the journey's order, not in whatever order the
     refs map happens to iterate */
  const order = useMemo(() => new Map(cards.map((c, i) => [c.id, i])), [cards]);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      let bestId: string | null = null;
      let bestDist = Infinity;
      const margin = 16;

      /*
        One scale for the whole gallery, taken from the tallest card.

        Cards are not all the same height — the ones without a poster are
        shorter — so scaling each to its own slot gave a gallery at three
        different sizes, which reads as a mistake rather than a layout.
      */
      let widest = 0;
      let tallest = 0;
      for (const el of refs.current.values()) {
        if (el.offsetWidth > widest) widest = el.offsetWidth;
        if (el.offsetHeight > tallest) tallest = el.offsetHeight;
      }

      for (const [id, el] of refs.current) {
        const s = screens.current.get(id);
        if (!s) continue;

        /* fully lit up close, gone by FADE_END, so only the card you are
           actually passing is on screen */
        const fade = 1 - (s.dist - FADE_START) / (FADE_END - FADE_START);
        /*
          Except in the finale, where seeing all eight at once IS the
          moment. The ring sits ~20 units out, which the distance rule
          would quietly dim to two thirds.
        */
        const lit = Math.max(fade, s.finale);
        const opacity = s.z > 1 ? 0 : lit < 0 ? 0 : lit > 1 ? 1 : lit;
        const visible = opacity > 0.02;

        /*
          Keep the card fully on screen. Its panel can sit half out of
          frame quite happily — it is part of the scene — but a caption
          with its text sliced off by the viewport edge is just broken.
        */
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const halfW = w / 2;
        const halfH = h / 2;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let x = Math.min(Math.max(s.x, halfW + margin), vw - halfW - margin);
        let y = Math.min(Math.max(s.y, halfH + margin), vh - halfH - margin);
        let scale = 1;

        /* ease from tracking the panel to the laid-out gallery */
        if (s.finale > 0) {
          const slot = finaleSlot(order.get(id) ?? 0, cards.length, vw, vh, widest, tallest);
          const t = s.finale;
          x += (slot.x - x) * t;
          y += (slot.y - y) * t;
          scale = 1 + (slot.scale - 1) * t;
        }

        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        el.style.opacity = String(opacity);
        el.style.pointerEvents = visible ? "auto" : "none";
        /* keep it out of the tab order while it is off screen, or the
           keyboard walks through eight invisible cards */
        el.setAttribute("aria-hidden", visible ? "false" : "true");

        if (visible && s.dist < bestDist) {
          bestDist = s.dist;
          bestId = id;
        }
      }

      setNearest((prev) => (prev === bestId ? prev : bestId));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screens, cards.length, order]);

  return (
    <ul className="descent__layer">
      {cards.map((c) => (
        <li
          className="descent__float"
          key={c.id}
          ref={(el) => {
            if (el) refs.current.set(c.id, el);
            else refs.current.delete(c.id);
          }}
        >
          {/* only the nearest card plays its loop. Eight videos decoding
              at once would end any phone; the rest hold their poster. */}
          {c.video && nearest === c.id ? (
            <video
              className="descent__media"
              src={c.video}
              poster={c.poster}
              muted
              loop
              playsInline
              autoPlay
            />
          ) : c.poster ? (
            <img className="descent__media" src={c.poster} alt="" loading="lazy" />
          ) : null}

          <span className="descent__kind">{c.kind}</span>
          <a className="descent__cardTitle descent__floatTitle" href={c.href}>
            {c.title}
          </a>

          <button
            className="descent__more"
            type="button"
            aria-expanded={open === c.id}
            onClick={() => setOpen(open === c.id ? null : c.id)}
          >
            {open === c.id ? "Close" : "Know more"}
          </button>

          {open === c.id ? <p className="descent__blurb">{c.blurb}</p> : null}
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import PixelText from "./PixelText";
import { DISPLAY, STICKER } from "./pixelFont";

/*
  The /test stage: a traced recreation of a pixel-art portfolio hero.

  Layering, back to front: purple ground, blurred mosaic, radial highlight,
  out-of-focus corner cards, the wordmark on its glow blob, the stickers,
  then the pixel cursor. Everything is positioned in percentages against the
  stage so the whole composition scales with the viewport rather than
  reflowing - the reference is a picture, and a picture should not reflow.

  The one thing deliberately NOT copied from the reference: "Neetin's" is
  smooth, anti-aliased type, not pixel art. It stays a real typeface here.
*/

/* Deterministic per-cell noise. Math.random() would differ between the
   server render and the client's, and React would discard the markup. */
function noise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const MOSAIC_COLS = 16;
const MOSAIC_ROWS = 9;

function Mosaic() {
  const cells = [];
  for (let i = 0; i < MOSAIC_COLS * MOSAIC_ROWS; i++) {
    const n = noise(i);
    cells.push(
      <span
        key={i}
        className="pxMosaic__cell"
        style={{
          /* Tints of the ground, NOT white and black. White cells over
             purple grey the whole stage out and read as a checkerboard;
             the reference's blocks are all purple, only lighter and
             darker than each other. */
          background: n > 0.5 ? "#c2a0ff" : "#2b0d66",
          opacity: 0.06 + n * 0.2,
          animationDelay: `${(noise(i + 999) * 9).toFixed(2)}s`,
        }}
      />,
    );
  }
  return <div className="pxMosaic" aria-hidden>{cells}</div>;
}

function PixelCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* a touch device has no pointer to follow; leaving the native cursor
       hidden there would be hostile */
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setOn(true);
    let raf = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={`pxCursor${on ? " pxCursor--on" : ""}`} aria-hidden>
      {/* the arrow is drawn on the same grid as the letters so it belongs
          to the same world - a smooth OS arrow here looks pasted on */}
      <svg viewBox="0 0 12 16" shapeRendering="crispEdges" width="26" height="35">
        <path
          fill="#140b2b"
          d="M0 0h1v14h1v-1h1v-1h1v3h2v-1h1v-1h-1v-2h3v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1V1h-1V0z"
        />
        <path
          fill="#ffffff"
          d="M1 1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1H6v1h1v2H6v1H5v-2H4v1H3v1H2v1H1V1z"
        />
      </svg>
    </div>
  );
}

type StickerProps = {
  text: string;
  className: string;
  dark?: boolean;
  tail?: "bl" | "br" | null;
  /* cell edge - long labels need a smaller one or they span the frame */
  cell?: number;
};

function Sticker({ text, className, dark, tail = null, cell = 5 }: StickerProps) {
  return (
    <div className={`pxSticker ${className}${dark ? " pxSticker--dark" : ""}`} aria-hidden>
      <PixelText
        text={text}
        set={STICKER}
        cell={cell}
        outline={0}
        fill={dark ? "#ffffff" : "#140b2b"}
        className="pxSticker__text"
      />
      {tail ? <span className={`pxSticker__tail pxSticker__tail--${tail}`} /> : null}
    </div>
  );
}

export default function TestHero() {
  return (
    <section className="pxStage">
      <Mosaic />
      <div className="pxGlow" aria-hidden />
      <div className="pxVignette" aria-hidden />

      {/* out-of-focus cards crowding in from the edges - the reference is
          shot with a shallow depth of field and these sell it */}
      <div className="pxBlurCard pxBlurCard--tl" aria-hidden />
      <div className="pxBlurCard pxBlurCard--tr" aria-hidden />
      <div className="pxBlurCard pxBlurCard--bl" aria-hidden />

      <div className="pxCenter">
        <p className="pxName">Aayush&rsquo;s</p>

        <h1 className="srOnly">Aayush&rsquo;s Portfolio</h1>

        <div className="pxWord" aria-hidden>
          <span className="pxWord__blob" />
          <PixelText text="Port" set={DISPLAY} cell={10} outline={2} className="pxWord__line pxWord__line--a" />
          <PixelText text="folio" set={DISPLAY} cell={10} outline={2} className="pxWord__line pxWord__line--b" />
          {/* magenta light-leaks, screened over the letters */}
          <span className="pxLeak pxLeak--a" />
          <span className="pxLeak pxLeak--b" />
        </div>
      </div>

      <Sticker text="HELLO" className="pxSticker--hello" tail="bl" />
      <Sticker text="OMG!" className="pxSticker--omg" tail="br" />
      <Sticker text="WELCOME" className="pxSticker--welcome" cell={4} />
      <Sticker text="Best works ahead" className="pxSticker--best" dark cell={3} />
      <Sticker text="WORK" className="pxSticker--cut" dark cell={4} />

      <PixelCursor />
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";

/*
  The right-hand properties panel — a live inspector rather than a static
  screenshot of one. X/Y track the cursor in canvas space, and hovering any
  tagged region on the page selects it: its name, its measured W/H and its
  fill all swap in, the way Figma reports whatever is under the pointer.

  Everything here writes straight to refs. A pointermove handler that called
  setState would re-render this subtree on every mouse event — the same
  per-event re-render cost that was just removed from Process and Services.
  Nothing in this panel needs React's help to change a string.

  Regions opt in via data-figp-node (the label) and data-figp-fill, which is
  either "image:<url>" for a picture or a plain CSS colour for a text block.
*/
type Props = {
  name: string;
  width: number;
  height: number;
  fillImage: string;
};

export default function FigmaPropertiesPanel({ name, width, height, fillImage }: Props) {
  const selRef = useRef<HTMLParagraphElement>(null);
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);
  const wRef = useRef<HTMLSpanElement>(null);
  const hRef = useRef<HTMLSpanElement>(null);
  const swatchRef = useRef<HTMLSpanElement>(null);
  const fillLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = document.querySelector<HTMLElement>(".figp-canvas");
    if (!canvas) return;
    /* no cursor to report on touch — don't even attach the listener */
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let raf = 0;
    let px = 0;
    let py = 0;
    /* the node currently reported, so hover work only runs when it changes */
    let shownNode: Element | null = null;

    const applyArtboard = () => {
      if (selRef.current) selRef.current.textContent = name;
      if (wRef.current) wRef.current.textContent = String(width);
      if (hRef.current) hRef.current.textContent = String(height);
      if (swatchRef.current) {
        swatchRef.current.style.backgroundImage = `url(${fillImage})`;
        swatchRef.current.style.backgroundColor = "";
      }
      if (fillLabelRef.current) fillLabelRef.current.textContent = "Image";
    };

    const applyNode = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      if (selRef.current) selRef.current.textContent = el.dataset.figpNode || name;
      if (wRef.current) wRef.current.textContent = String(Math.round(rect.width));
      if (hRef.current) hRef.current.textContent = String(Math.round(rect.height));

      const fill = el.dataset.figpFill || "";
      if (swatchRef.current) {
        if (fill.startsWith("image:")) {
          swatchRef.current.style.backgroundImage = `url(${fill.slice(6)})`;
          swatchRef.current.style.backgroundColor = "";
        } else {
          swatchRef.current.style.backgroundImage = "none";
          swatchRef.current.style.backgroundColor =
            fill || getComputedStyle(el).color;
        }
      }
      if (fillLabelRef.current) {
        fillLabelRef.current.textContent = fill.startsWith("image:") ? "Image" : "Solid";
      }
    };

    const flush = () => {
      raf = 0;
      if (xRef.current) xRef.current.textContent = String(px);
      if (yRef.current) yRef.current.textContent = String(py);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      px = Math.round(e.clientX - rect.left);
      py = Math.round(e.clientY - rect.top);
      if (!raf) raf = requestAnimationFrame(flush);

      const node = (e.target as Element | null)?.closest?.("[data-figp-node]") ?? null;
      if (node === shownNode) return;
      shownNode = node;
      if (node) applyNode(node as HTMLElement);
      else applyArtboard();
    };

    /* leaving the canvas entirely returns the panel to the artboard */
    const onLeave = () => {
      shownNode = null;
      applyArtboard();
    };

    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [name, width, height, fillImage]);

  return (
    <aside className="figp-props" aria-label="Properties">
      <div className="figp-phead">
        <span className="figp-ptab">Design</span>
        <span className="figp-pzoom">100%</span>
      </div>
      <p className="figp-pselected" ref={selRef}>
        {name}
      </p>
      <div className="figp-pgrid">
        <div className="figp-pcell">
          <span className="figp-pk">X</span>
          <span className="figp-pv" ref={xRef}>
            0
          </span>
        </div>
        <div className="figp-pcell">
          <span className="figp-pk">Y</span>
          <span className="figp-pv" ref={yRef}>
            0
          </span>
        </div>
        <div className="figp-pcell">
          <span className="figp-pk">W</span>
          <span className="figp-pv" ref={wRef}>
            {width}
          </span>
        </div>
        <div className="figp-pcell">
          <span className="figp-pk">H</span>
          <span className="figp-pv" ref={hRef}>
            {height}
          </span>
        </div>
      </div>
      <div className="figp-psec">
        <p className="figp-plabel">Fill</p>
        <div className="figp-pfill">
          <span
            className="figp-pswatch"
            ref={swatchRef}
            style={{ backgroundImage: `url(${fillImage})` }}
          />
          <span className="figp-pv" ref={fillLabelRef}>
            Image
          </span>
          <span className="figp-pk">Fill</span>
        </div>
      </div>
      <div className="figp-psec">
        <p className="figp-plabel">Export</p>
        <p className="figp-pexport">
          <span className="figp-pk">+</span> PNG 2x
        </p>
      </div>
    </aside>
  );
}

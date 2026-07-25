"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  animate,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";

/*
  The figure that hangs from a rope in the footer flames. The rope + figure are
  one group that rotates around its TOP anchor (transform-origin 50% 0%), so it
  behaves like a real pendulum:

  - idle: a gentle infinite sway (~4deg each way)
  - drag: grab the figure and the whole rope swings toward the pointer; on
    release it springs back through a couple of oscillations, then resumes the
    idle sway.

  Only `rotate` is animated (GPU), driven by one MotionValue, so pointer moves
  never trigger React re-renders. Under prefers-reduced-motion it hangs still.

  The figure image is a user-supplied asset at /footer/spiderman.png. If it is
  not present yet, a neutral placeholder keeps the mechanism visible.
*/

const ASSET = "/footer/spiderman.png";

export default function SpiderHang() {
  const reduce = useReducedMotion();
  const rot = useMotionValue(0);
  const groupRef = useRef<HTMLDivElement>(null);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const dragging = useRef(false);
  const anchor = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);

  // catch an image that already failed before hydration (onError is missed then)
  useEffect(() => {
    const i = imgRef.current;
    if (i && i.complete && i.naturalWidth === 0) setBroken(true);
  }, []);

  const startIdle = () => {
    if (reduce) return;
    anim.current?.stop();
    anim.current = animate(rot, [0, -4, 4, 0], {
      duration: 6,
      ease: "easeInOut",
      repeat: Infinity,
    });
  };

  useEffect(() => {
    startIdle();
    return () => anim.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const onDown = (e: React.PointerEvent) => {
    if (reduce) return;
    dragging.current = true;
    anim.current?.stop();
    const r = groupRef.current!.getBoundingClientRect();
    anchor.current = { x: r.left + r.width / 2, y: r.top }; // rope's top anchor
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - anchor.current.x;
    const dy = Math.max(1, e.clientY - anchor.current.y);
    let deg = (Math.atan2(dx, dy) * 180) / Math.PI;
    deg = Math.max(-34, Math.min(34, deg));
    rot.set(deg);
  };

  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    anim.current = animate(rot, 0, {
      type: "spring",
      stiffness: 42,
      damping: 5,
      restDelta: 0.2,
      onComplete: () => {
        if (!dragging.current) startIdle();
      },
    });
  };

  return (
    <motion.div
      ref={groupRef}
      className="spiderHang"
      style={{ rotate: rot, transformOrigin: "50% 0%" }}
    >
      <span className="spiderHang__rope" aria-hidden />
      {broken ? (
        <span
          className="spiderHang__fallback"
          role="img"
          aria-label="Hanging figure"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      ) : (
        <img
          className="spiderHang__img"
          src={ASSET}
          alt="Aayush Visuals mascot hanging from a web"
          draggable={false}
          onError={() => setBroken(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth === 0) setBroken(true);
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      )}
    </motion.div>
  );
}

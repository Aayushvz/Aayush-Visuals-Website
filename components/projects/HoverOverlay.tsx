"use client";

import { motion, type MotionValue } from "framer-motion";

/*
  The cinematic cover reveal for a project tile: hidden at rest, and on
  hover fades in with a focus-pull (blur settles to sharp), a gentle 103%
  scale, and a soft white vignette at the edges so the photo never reads as
  a harsh rectangle. Purely presentational — ProjectTile owns the :hover
  trigger (CSS) and the parallax offset (framer-motion values passed in).
*/

type Props = {
  src: string;
  alt: string;
  x?: MotionValue<number>;
  y?: MotionValue<number>;
};

export default function HoverOverlay({ src, alt, x, y }: Props) {
  return (
    <div className="projTile__frame" aria-hidden>
      <motion.div className="projTile__coverWrap" style={x && y ? { x, y } : undefined}>
        <img className="projTile__cover" src={src} alt={alt} loading="lazy" />
      </motion.div>
      <div className="projTile__vignette" />
    </div>
  );
}

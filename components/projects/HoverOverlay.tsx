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
  videoSrc?: string;
  alt: string;
  x?: MotionValue<number>;
  y?: MotionValue<number>;
};

export default function HoverOverlay({ src, videoSrc, alt, x, y }: Props) {
  const isVideo = videoSrc && (videoSrc.endsWith(".mp4") || videoSrc.endsWith(".webm"));
  const isAnimatedImg = videoSrc && (videoSrc.endsWith(".webp") || videoSrc.endsWith(".gif"));

  return (
    <div className="projTile__frame" aria-hidden>
      <motion.div className="projTile__coverWrap" style={x && y ? { x, y } : undefined}>
        {isVideo ? (
          <video
            className="projTile__cover"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : isAnimatedImg ? (
          <img className="projTile__cover" src={videoSrc} alt="" />
        ) : (
          <img className="projTile__cover" src={src} alt={alt} loading="lazy" />
        )}
      </motion.div>
      <div className="projTile__sheen" />
      <div className="projTile__mist" />
      <div className="projTile__vignette" />
    </div>
  );
}

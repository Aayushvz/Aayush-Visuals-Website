"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/*
  A case-study loop that behaves like an image - muted, looping, no
  controls - and plays only while it is near the screen.

  It used to be a plain <video autoPlay>. Autoplay overrides preload: the
  browser downloads enough of EVERY such video to start playing it at once,
  so opening the Mike Tyson case study fetched 7.2 MB of webm before the
  visitor had scrolled at all, and every loop kept decoding frames off
  screen for the rest of the visit.

  Now each video asks only for its metadata (enough for the first frame)
  and starts playing a screen before it scrolls into view, so it is already
  moving when it arrives - on screen it looks exactly as it did. It pauses
  when it leaves. The approach margin is generous on purpose: the loop
  should never be seen starting.
*/
export default function CaseVideo({
  src,
  className,
  style,
  width,
  height,
  rise,
  label,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
  rise?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      style={style}
      width={width}
      height={height}
      data-rise={rise ? "shot" : undefined}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
}

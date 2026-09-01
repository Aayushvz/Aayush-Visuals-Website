"use client";

import { useEffect, useRef } from "react";

/*
  One card face, whether the project ships a still or a loop.

  `bgVideoUrl` has always been the field a project uses to say "my card
  should move", but every consumer rendered it through an <img> — so it
  could only ever hold another image, and the name was a promise the code
  did not keep. This component keeps the call sites identical and picks the
  element from the file extension instead.

  Video cards get the treatment a background loop needs and nothing more:
  muted and playsInline because a card that asks for sound or hijacks the
  screen on iOS is a card people leave; `poster` so the frame is filled
  from the first paint rather than showing a black box while 1.4MB
  arrives; and preload="metadata" so a page with several of these does not
  pull every loop before the visitor has scrolled to one.

  Playback starts on approach rather than on mount. `autoplay` OVERRIDES
  preload: a browser told to play immediately downloads enough to do so, so
  the metadata hint was being ignored and a 505KB loop was arriving during
  first load for a card most visitors never scroll to. Holding play() until
  the card is near the viewport lets preload mean what it says, and pausing
  on the way out stops off-screen cards decoding frames forever.

  `disableRemotePlayback` and `disablePictureInPicture` stop Safari and
  Chrome offering to cast or pop out what is, to a viewer, a picture.
*/

const VIDEO = /\.(webm|mp4)$/i;

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** the still shown before a loop has loaded, and for reduced motion */
  poster?: string;
  eager?: boolean;
  priority?: boolean;
};

export default function ProjectMedia({
  src,
  alt,
  className,
  poster,
  eager,
  priority,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || eager) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          /* rejects if the browser blocks playback; nothing to recover from,
             the poster is already showing */
          void v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [eager]);

  if (VIDEO.test(src)) {
    return (
      <video
        ref={videoRef}
        className={className}
        src={src}
        poster={poster}
        /* eager cards are the ones already on screen, so those keep autoplay */
        autoPlay={eager}
        muted
        loop
        playsInline
        preload={eager ? "auto" : "metadata"}
        disableRemotePlayback
        disablePictureInPicture
        /* decorative: the card is labelled by the project title beside it,
           and a loop of a website has nothing to announce */
        aria-hidden
        tabIndex={-1}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      className={className}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
    />
  );
}

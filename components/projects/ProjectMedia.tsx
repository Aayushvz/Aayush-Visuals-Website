"use client";

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
  if (VIDEO.test(src)) {
    return (
      <video
        className={className}
        src={src}
        poster={poster}
        autoPlay
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

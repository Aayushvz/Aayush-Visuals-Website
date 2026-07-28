/*
  A pinned Figma comment thread — always open, never a hover-to-reveal
  tooltip, so the note is legible on a phone's first tap and to a screen
  reader with no hover at all.
*/
type Props = {
  number: number;
  note: string;
  href: string;
  variant: "head" | "shot";
  external?: boolean;
};

export default function CommentPin({ number, note, href, variant, external }: Props) {
  return (
    <a
      className={`figp-pin figp-pin--${variant}`}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      <span className="figp-pin-dot">{number}</span>
      <span className="figp-pin-note">
        <span className="figp-pin-author">
          <span className="figp-pin-avatar" aria-hidden="true">
            A
          </span>
          Aayush
        </span>
        {note}
      </span>
    </a>
  );
}

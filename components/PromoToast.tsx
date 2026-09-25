"use client";

import PageLink from "@/components/PageLink";
import { TagGlyph } from "@/components/playground/tagIcons";
import type { TagIcon } from "@/components/playground/experiments";

/*
  The notification card. Presentation only: which one shows, and when, is
  PromoManager's job.

  After a task-card reference: a white card, a purple band naming what it
  is, a dashed inner card with a title, a meta line, two lines of context,
  a small stack of marks and a status pill, then a row of chips and a
  square action.
*/

export type ToastMark =
  | { kind: "image"; src: string }
  | { kind: "badge"; bg: string; fg: string; node: React.ReactNode };

export type Promo = {
  id: string;
  href: string;
  band: string;
  title: string;
  meta: string;
  text: string;
  marks: ToastMark[];
  status: string;
  statusTone: "green" | "purple";
  chips: { label: string; icon: TagIcon }[];
  action: string;
};

export default function PromoToast({
  promo,
  phase,
  onClose,
  onFollow,
}: {
  promo: Promo;
  phase: "shown" | "leaving" | "fading";
  onClose: () => void;
  onFollow: () => void;
}) {
  const external = /^https?:\/\//.test(promo.href);
  const arrow = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );

  /* the square action at the end of the chip row */
  const go = (extra = "") =>
    external ? (
      <a
        className={`recentToast__go${extra}`}
        href={promo.href}
        target="_blank"
        rel="noreferrer"
        aria-label={promo.action}
        onClick={onFollow}
      >
        {arrow}
      </a>
    ) : (
      <PageLink
        className={`recentToast__go${extra}`}
        href={promo.href}
        aria-label={promo.action}
        onClick={onFollow}
      >
        {arrow}
      </PageLink>
    );

  return (
    <aside
      className={`recentToast${
        phase === "leaving"
          ? " recentToast--leaving"
          : phase === "fading"
            ? " recentToast--fading"
            : ""
      }`}
      aria-label={promo.band}
    >
      <button type="button" className="recentToast__close" aria-label="Dismiss" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className="recentToast__card">
        <div className="recentToast__band">{promo.band}</div>

        <div className="recentToast__body">
          <div className="recentToast__row">
            <h3 className="recentToast__title">{promo.title}</h3>
            <span className="recentToast__date">{promo.meta}</span>
          </div>
          <p className="recentToast__text">{promo.text}</p>
          <div className="recentToast__row recentToast__row--foot">
            {/* the reference's stack of faces, as the destination's own marks */}
            <span className="recentToast__stack" aria-hidden>
              {promo.marks.map((m, i) =>
                m.kind === "image" ? (
                  <img key={i} src={m.src} alt="" width={30} height={30} />
                ) : (
                  <span
                    key={i}
                    className="recentToast__stackBadge"
                    style={{ background: m.bg, color: m.fg }}
                  >
                    {m.node}
                  </span>
                ),
              )}
            </span>
            <span
              className={`recentToast__status${
                promo.statusTone === "purple" ? " recentToast__status--purple" : ""
              }`}
            >
              {promo.status}
            </span>
          </div>
        </div>

        <div className="recentToast__chips">
          {promo.chips.map((t) => (
            <span key={t.label} className="recentToast__chip">
              <TagGlyph icon={t.icon} />
              {t.label}
            </span>
          ))}
          {go()}
        </div>
      </div>
    </aside>
  );
}

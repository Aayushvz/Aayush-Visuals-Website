"use client";

import { motion, useReducedMotion } from "framer-motion";
import PageLink from "@/components/PageLink";
import {
  EXPERIMENTS,
  SOON,
  SOON_THEME,
  type Tag,
  type Theme,
} from "./experiments";
import RigCard from "./RigCard";
import { TagGlyph } from "./tagIcons";

/*
  The shelf, set as a store.

  A storefront grid is the right frame for this section for one reason: a
  playground is a list of things you can go and use, and the cover-first,
  kind-then-title-then-status card is the format everybody can already read
  without instructions. So the layout borrows the grammar of a game store -
  a four-up row, portrait box art - and swaps the money for
  the thing that actually matters here, which is whether you can play it now.

  Two rules keep it from turning into a wall of identical tiles:

  - Weight comes from content, not from span. Every cell is the same size,
    the way a store row is, but the live card carries real art, a badge, a
    play affordance and full contrast, while a vacant slot is dark, dashed
    and quiet. The eye lands on the live one immediately without the grid
    having to break rhythm to make that happen.
  - Vacant slots stay honest. They are not skeletons, they are not teasers
    with invented titles; they are labelled empty and say what kind of thing
    is meant to land there.

  All of it reads off EXPERIMENTS and SOON, so a new toy is still a one-file
  change.
*/



function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.75 12h14.5M13.5 6.25 19.25 12l-5.75 5.75" />
    </svg>
  );
}

/* the arrow for an entry that leaves the site: it points up and out */
function OutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.25 16.75 16.75 7.25M9.25 7.25h7.5v7.5" />
    </svg>
  );
}

/* a theme as the CSS variables the rig, the button and the row read */
const themeVars = (t: Theme) =>
  ({
    "--t-wall": t.wall,
    "--t-ink": t.ink,
    "--t-accent": t.accent,
    "--t-on-accent": t.onAccent,
    "--t-glow": t.glow,
    "--t-light": t.light,
  }) as React.CSSProperties;

const isExternal = (href: string) => /^https?:\/\//.test(href);

/*
  The open button, built as a small piece of the rig: a black housing with
  a lit rim, a slatted purple face, a status light and a dark key holding
  the arrow. The whole row is already the link, so this is a span that
  looks like a control rather than a second, nested one.
*/
function RigButton({ label, external }: { label: string; external: boolean }) {
  const Icon = external ? OutIcon : ArrowIcon;
  return (
    <span className="pgBtn" aria-hidden>
      <span className="pgBtn__face">
        <span className="pgBtn__label">{label}</span>
        <span className="pgBtn__key">
          <span className={`pgBtn__icon${external ? " pgBtn__icon--out" : ""}`}>
            <Icon />
          </span>
        </span>
      </span>
    </span>
  );
}

/* a soft pill with a small tinted badge holding a line icon */
function Tags({ tags }: { tags: Tag[] }) {
  return (
    <ul className="pgTags">
      {tags.map((t) => (
        <li key={t.label} className="pgTag">
          <span className="pgTag__badge">
            <TagGlyph icon={t.icon} />
          </span>
          {t.label}
        </li>
      ))}
    </ul>
  );
}

/* the words beside a rig: the name, one line that sells it, two that
   explain it, then the way in. The rig carries the numbers, so this
   carries the sentence */
function RowCopy({
  title,
  tagline,
  blurb,
  tags,
  children,
}: {
  title: string;
  tagline: string;
  blurb: string;
  tags: Tag[];
  children?: React.ReactNode;
}) {
  return (
    <div className="pgCard__copy">
      {/* the title and the button share a line: name on the left, the way
          in at the far right */}
      <div className="pgCard__head">
        <h3 className="pgCard__title">{title}</h3>
        {children}
      </div>
      <p className="pgCard__tagline">{tagline}</p>
      <p className="pgCard__blurb">{blurb}</p>
      <Tags tags={tags} />
    </div>
  );
}

/*
  Pointer-tracked tilt. The rig leans toward the pointer a few degrees and a
  glare follows it across the glass, which is what makes it read as an
  object on a wall rather than a picture of one. Written straight to CSS
  variables on the art box: no state, no re-render, and nothing runs when
  no pointer is over a row. Touch and reduced motion never get it.
*/
function tilt(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const art = e.currentTarget.querySelector<HTMLElement>(".pgCard__art");
  if (!art) return;
  const r = art.getBoundingClientRect();
  const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
  const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
  art.style.setProperty("--ry", `${((x - 0.5) * 7).toFixed(2)}deg`);
  art.style.setProperty("--rx", `${((0.5 - y) * 5).toFixed(2)}deg`);
  art.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
  art.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
}

function untilt(e: React.PointerEvent<HTMLElement>) {
  const art = e.currentTarget.querySelector<HTMLElement>(".pgCard__art");
  if (!art) return;
  art.style.setProperty("--ry", "0deg");
  art.style.setProperty("--rx", "0deg");
}

/*
  One card's link. Internal hrefs keep the site's page-transition wipe;
  absolute ones are ordinary anchors to another origin.
*/
function CardLink({
  href,
  children,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = isExternal(href);

  if (external) {
    return (
      <a
        href={href}
        className="pgCard__link"
        target="_blank"
        rel="noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <PageLink href={href} className="pgCard__link" {...rest}>
      {children}
    </PageLink>
  );
}

export default function ExperimentShelf() {
  const live = EXPERIMENTS;
  const soon = SOON;

  const reduce = useReducedMotion();

  /*
    Entrance lives on the card rather than in the global [data-reveal] system,
    and it has to. Reveals.tsx queries the document once on mount and observes
    what it finds; anything React adds later is never observed, so it keeps
    opacity:0 forever. framer runs initial -> animate on mount instead, so a
    card is correct however it arrived. Same values as ProjectCard on /work.
  */
  const enter = (i: number) =>
    reduce
      ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.32,
            ease: [0.22, 1, 0.36, 1] as const,
            delay: Math.min(i, 6) * 0.04,
          },
        };

  return (
    <section className="pgShelf" id="experiments">
      <div className="pgShelf__inner">
        {/* Same header grammar as /work: the title on the left, a mono count
            and a short paragraph answering it on the right, then one row of
            controls under both. The two index pages should open the same way. */}
        <header className="pgShelf__head" data-reveal>
          <h2 className="pgShelf__title">
            Experiments<span className="pgShelf__dot">.</span>
          </h2>
          <div className="pgShelf__intro">
            {/* a count, not a date range - the honest at-a-glance fact about a
                shelf is how much of it you can actually play */}
            <span className="pgShelf__meta">
              ({String(EXPERIMENTS.length).padStart(2, "0")} playable)
            </span>
            {/* Sized to the same character count as the /work blurb on
                purpose. The header is bottom-aligned, so this column's height
                is what sets the heading's baseline - let it wrap to two lines
                where /work wraps to three and the two titles stop landing on
                the same line. */}
            <p className="pgShelf__desc">
              Games, toys and sketches I build to try an idea out. None of it
              is client work, and none of it has to justify itself.
            </p>
          </div>
        </header>

        <ul className="pgGrid">
          {live.map((e, i) => (
            <motion.li
              key={e.id}
              className="pgCard"
              style={themeVars(e.theme)}
              {...enter(i)}
            >
              {/*
                An entry can point off-site (the invoice generator is its
                own deployment), and PageLink is built for routes in this
                app: it swallows the click, plays the wipe and hands the
                href to router.push. Playing a page transition on the way
                to another origin is wrong twice over - the wipe promises a
                route change this app is not making, and router.push is not
                the way to leave it. External entries get a plain anchor
                that opens in a new tab and says so.
              */}
              <CardLink
                href={e.href}
                aria-label={`${e.title}. ${e.tagline} ${e.cta}.`}
                onPointerMove={reduce ? undefined : tilt}
                onPointerLeave={reduce ? undefined : untilt}
              >
                <div className="pgCard__art">
                <RigCard
                  index={e.index}
                  title={e.title}
                  kind={e.kind}
                  sub={e.flag ?? "Experiment"}
                  cta={e.cta}
                  shipped={e.shipped}
                  stats={e.stats}
                  meta={e.meta}
                  cover={e.cover}
                />
                </div>
                <RowCopy title={e.title} tagline={e.tagline} blurb={e.blurb} tags={e.tags}>
                  <RigButton label={e.cta} external={isExternal(e.href)} />
                </RowCopy>
              </CardLink>
            </motion.li>
          ))}

          {/* vacant slots: same footprint, no link, and labelled as empty
              rather than dressed up as content that is on its way */}
          {soon.map((s, i) => (
            <motion.li
              key={s.index}
              className="pgCard pgCard--soon"
              style={themeVars(SOON_THEME)}
              {...enter(live.length + i)}
            >
              <div className="pgCard__row">
                <div className="pgCard__art">
                  <RigCard
                    index={s.index}
                    title={s.hint}
                    kind={s.kind}
                    sub="In the workshop"
                    cta="Nothing to open"
                    off
                  />
                </div>
                <RowCopy title={s.hint} tagline={s.tagline} blurb={s.blurb} tags={s.tags}>
                  <span className="pgBtn pgBtn--off" aria-hidden>
                    <span className="pgBtn__face">
                                    <span className="pgBtn__label">Not yet</span>
                    </span>
                  </span>
                </RowCopy>
              </div>
            </motion.li>
          ))}
        </ul>

      </div>
    </section>
  );
}

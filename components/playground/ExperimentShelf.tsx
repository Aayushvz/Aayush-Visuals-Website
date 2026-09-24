"use client";

import { motion, useReducedMotion } from "framer-motion";
import PageLink from "@/components/PageLink";
import {
  EXPERIMENTS,
  SOON,
  SOON_THEME,
  type Tag,
  type TagIcon,
  type Theme,
} from "./experiments";
import RigCard from "./RigCard";

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

/* 24px line glyphs for the tags, drawn to sit on a small round badge */
const TAG_PATHS: Record<TagIcon, string> = {
  game: "M7.5 8.5h9a4.5 4.5 0 0 1 0 9c-1 0-1.8-.5-2.4-1.2l-.6-.8h-3l-.6.8c-.6.7-1.4 1.2-2.4 1.2a4.5 4.5 0 0 1 0-9zM8 11.5v3M6.5 13h3M15.5 12h.01M17.2 14h.01",
  timer: "M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM12 10v3.5l2 1.5M10 2.5h4",
  ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM7.2 6.4c2.8 3.2 2.8 8 0 11.2M16.8 6.4c-2.8 3.2-2.8 8 0 11.2",
  free: "M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20M12 7.5c-1.4-3-5-3.2-5-1.2 0 1.2 2.6 1.2 5 1.2 2.4 0 5 0 5-1.2 0-2-3.6-1.8-5 1.2",
  nosignup: "M10 11a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6zM3 20.5a7 7 0 0 1 11.5-5.4M16.5 15.5l4.5 4.5M21 15.5l-4.5 4.5",
  dashboard: "M4 4h6.5v8.5H4zM13.5 4H20v5h-6.5zM13.5 12H20v8h-6.5zM4 15.5h6.5V20H4z",
  trophy: "M8.5 20.5h7M12 16v4.5M7 3.5h10V9a5 5 0 0 1-10 0zM7 5.5H4.5V7A3 3 0 0 0 7 10M17 5.5h2.5V7A3 3 0 0 1 17 10",
  cube: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  cloud: "M7 18.5a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 12h17M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z",
  machine: "M3.5 17.5h17M5 17.5V15a7 7 0 0 1 14 0v2.5M10 8.4V5h4v3.4",
  pixel: "M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z",
  leaf: "M5 19C5 11 10 5 20 4c-.5 10-6 15.5-14 15.5M5 19l6.5-6.5",
  sparkle: "M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z",
  lock: "M6 11h12v9.5H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12.5h5M10 16.5h5",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5M9.5 16h3",
  pencil: "M4.5 19.5l1-4L16 5l3 3L8.5 18.5zM14 7l3 3",
};

function TagGlyph({ icon }: { icon: TagIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={TAG_PATHS[icon]} />
    </svg>
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

"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import PageLink from "./PageLink";
import useSurfaceTone from "./useSurfaceTone";
import LogoMark from "./LogoMark";

/*
  Four destinations, and the panel shows the ones you are not already on.

  The current route is dropped and "home" takes the freed slot, so the sheet
  spends it on somewhere you can actually go rather than on a link back to the
  page under your thumb. Everywhere except /contact that lands on three rows
  plus the button; on /contact the button is the current page, so it is the
  button that goes and all four rows show. Either way the sheet never offers
  you where you already are. Measured at 390px the two shapes come out 272px
  and 295px tall - close enough that the sheet does not visibly resize as you
  move around the site.

  This replaces an earlier rule that hid "home" unconditionally on the grounds
  that the wordmark in the bar is already that link. It is, but the wordmark is
  a 20px mark in the corner and these are the panel's tallest targets; on a
  project page three taps' worth of nav pointed at sections and none of them
  home.

  "contact" is not in this list any more either. It went where the sheet's
  button goes, so listing it was the same destination twice, once as a row and
  once as the call to action directly beneath it.
*/
const ALL_LINKS = [
  { label: "home", href: "/" },
  { label: "about me", href: "/about" },
  { label: "projects", href: "/work" },
  { label: "games", href: "/playground" },
];

/* `/work/riviera` is inside `projects`, so a prefix match, not equality -
   otherwise a case study drops nothing and shows four rows where every other
   route shows three. "/" would prefix-match everything, so it is exact. */
function isCurrent(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export default function MobileNav({
  position = "top",
}: {
  position?: "top" | "bottom";
}) {
  const barRef = useRef<HTMLElement>(null);
  const pathname = usePathname() ?? "/";
  const reduced = useReducedMotion();
  const links = ALL_LINKS.filter((l) => !isCurrent(l.href, pathname));
  /* the foot button goes to /contact, so on /contact it is a link to self */
  const onContact = isCurrent("/contact", pathname);
  /* the collapsed pill takes the tone of whatever it is over, exactly as the
     desktop bar does; the expanded sheet stays dark on purpose */
  const overLight = useSurfaceTone(barRef) === "light";
  const [open, setOpen] = useState(false);

  const renderBar = (isOpen: boolean) => (
    <div className="mobileNav__bar">
      <button
        type="button"
        className="mobileNav__menuBtn"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!isOpen)}
      >
        {isOpen ? (
          <span className="mobileNav__closeIcon" aria-hidden>
            ✕
          </span>
        ) : (
          <span className="mobileNav__hamburger" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        )}
      </button>

      {/* the mark carries no text, so the link needs its own accessible name */}
      <PageLink
        href="/"
        className="mobileNav__logo"
        aria-label="aayush vz, home"
        onClick={() => setOpen(false)}
      >
        <LogoMark className="mobileNav__logoMark" />
      </PageLink>
    </div>
  );

  return (
    <>
      {!open && (
        <nav
          ref={barRef}
          className={`mobileNav ${position === "top" ? "mobileNav--top" : "mobileNav--bottom"} ${
            overLight ? "mobileNav--overLight" : "mobileNav--overDark"
          }`}
          aria-label="Mobile navigation"
        >
          {renderBar(false)}
        </nav>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className={`mobileNavCard ${position === "top" ? "mobileNavCard--top" : "mobileNavCard--bottom"}`}
            /*
              The sheet OPENS rather than appears.

              No scale - growing from 0.94 made the panel look like it was
              being blown up from a smaller copy of itself; the sheet is the
              same pill with more in it. But a fade alone did not read as
              opening either, because the pill and the sheet share an edge, so
              the only thing that changed was ink.

              A clip-path inset wipes it down from the bar it grows out of, so
              the panel unrolls from the thing you tapped. It composites (no
              layout, no paint of the clipped area) and it costs nothing that
              animating height would have cost.

              Ease-out-expo over a spring: a spring lands with a settle, and a
              settle on a full-screen sheet reads as bounce however low the
              amplitude. 420ms is long enough to be seen as a movement and
              short enough not to be waited on.
            */
            initial={{ opacity: 0, clipPath: "inset(0% 0% 100% 0% round 22px)" }}
            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 22px)" }}
            exit={{ opacity: 0, clipPath: "inset(0% 0% 100% 0% round 22px)" }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }
            }
          >
            {position === "top" && renderBar(true)}

            <div
              className={`mobileNavCard__links ${position === "top" ? "mobileNavCard__links--top" : "mobileNavCard__links--bottom"}`}
            >
              {links.map((l, idx) => (
                <motion.div
                  key={l.href}
                  /* the rows follow the wipe down the sheet rather than
                     arriving with it - 55ms apart, which is fast enough to
                     read as one gesture and slow enough to have a direction */
                  initial={reduced ? false : { opacity: 0, y: position === "top" ? -8 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: reduced ? 0 : idx * 0.055 + 0.1,
                    duration: reduced ? 0.15 : 0.34,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ width: "100%", display: "flex" }}
                >
                  <PageLink
                    href={l.href}
                    className="mobileNavCard__link"
                    onClick={() => setOpen(false)}
                  >
                    <span className="mobileNavCard__linkText">{l.label}</span>
                  </PageLink>
                </motion.div>
              ))}
            </div>

            {/* The reference closes its sheet with a pair of dark action
                buttons. There is one real destination for that here, so it is
                one full-width button rather than two invented ones.

                "Contact me", not "Start a project": it is the only thing this
                button has ever done, and while a "contact" row sat directly
                above it the two labels made one destination look like two. */}
            {onContact ? null : (
            <motion.div
              className="mobileNavCard__foot"
              initial={reduced ? false : { opacity: 0, y: position === "top" ? -8 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: reduced ? 0 : links.length * 0.055 + 0.1,
                duration: reduced ? 0.15 : 0.34,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <PageLink
                href="/contact"
                className="mobileNavCard__cta"
                onClick={() => setOpen(false)}
              >
                Contact me
              </PageLink>
            </motion.div>
            )}

            {position !== "top" && renderBar(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

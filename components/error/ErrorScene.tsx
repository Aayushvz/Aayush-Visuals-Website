"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LooseGlyphs from "./LooseGlyphs";
import "./error-scene.css";

/*
  One page for every way this site can fail to show you something.

  There are four: the address does not exist, the render threw, the whole
  root threw, and the connection is gone. They are different problems with
  the same shape from the reader's side — you asked for something and it is
  not here — so they get one composition and four honest sets of words
  rather than four pages or, worse, one page that says "Something went
  wrong" to all of them.

  The connection case is not a route, it is a condition, so it is read live:
  a 404 while offline is almost never a missing page, it is a request that
  never left the building, and saying "no page at this address" there would
  be a lie the page is in a position to check.
*/

export type ErrorKind = "not-found" | "error" | "offline";

type Copy = {
  chars: string[];
  status: string;
  title: string;
  body: string;
  code: string;
};

const COPY: Record<ErrorKind, Copy> = {
  "not-found": {
    chars: ["4", "0", "4"],
    status: "No page at this address",
    title: "This one came loose.",
    body: "There is nothing here to show you. It may have moved, it may have been renamed, or it may never have existed at all.",
    code: "404",
  },
  error: {
    chars: ["5", "0", "0"],
    status: "Something broke",
    title: "That did not load.",
    body: "Something on my end failed part way through building this page. It is not you, and trying again usually clears it.",
    code: "500",
  },
  offline: {
    chars: ["0", "F", "F"],
    status: "No connection",
    title: "You have gone offline.",
    body: "The page is fine. The connection is not. This will sort itself out the moment you are back on a network.",
    code: "OFF",
  },
};

export default function ErrorScene({
  kind = "not-found",
  /* the error boundaries hand their own recovery in; /404 has none */
  onRetry,
}: {
  kind?: ErrorKind;
  onRetry?: () => void;
}) {
  const [offline, setOffline] = useState(false);
  const [path, setPath] = useState("");
  const [clock, setClock] = useState("--:--:--");
  const [touched, setTouched] = useState(false);

  /*
    Read after mount, never during render.

    navigator.onLine and location differ between the server and the client,
    and a value that disagrees across that boundary is a hydration error on
    a page whose entire job is to be the thing that still works.
  */
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    setPath(window.location.pathname + window.location.search);

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  /* losing the network outranks whichever boundary rendered this */
  const active: ErrorKind = offline ? "offline" : kind;
  const copy = COPY[active];

  const retry = () => {
    if (onRetry) onRetry();
    else window.location.reload();
  };

  const canRetry = active !== "not-found";

  return (
    <main
      className="errScene"
      data-kind={active}
      onPointerDown={() => setTouched(true)}
    >
      <div className="errScene__grid" aria-hidden />
      <div className="errScene__vignette" aria-hidden />

      <LooseGlyphs chars={copy.chars} />

      <div className="errScene__copy">
        <p className="errScene__status">
          <span className="errScene__dot" aria-hidden />
          {copy.status}
        </p>

        {/* the code is only decoration on the stage behind, so the heading
            carries it for anyone who cannot see the numerals move */}
        <h1 className="errScene__title">
          <span className="srOnly">{copy.code}. </span>
          {copy.title}
        </h1>

        <p className="errScene__body">{copy.body}</p>

        <div className="errScene__actions">
          {canRetry ? (
            <button
              type="button"
              className="errBtn errBtn--primary"
              onClick={retry}
              disabled={active === "offline" && offline}
            >
              {active === "offline" ? "Waiting for a network" : "Try again"}
            </button>
          ) : (
            <Link className="errBtn errBtn--primary" href="/">
              Back to the start
            </Link>
          )}

          <Link className="errBtn" href="/work">
            See the work
          </Link>
          <Link className="errBtn" href="/contact">
            Get in touch
          </Link>
        </div>
      </div>

      {/*
        The instrument line, in the same language as the About page's status
        bar: what you asked for, what happened to it, and the time it
        happened, which is the one thing worth quoting if you tell me about
        it.
      */}
      <div className="errScene__meta" aria-hidden>
        <span className="errScene__metaCell">ERR {copy.code}</span>
        <span className="errScene__metaCell errScene__metaPath">
          {path || "/"}
        </span>
        <span className="errScene__metaCell">{clock} IST</span>
      </div>

      <p className="errScene__hint" data-gone={touched} aria-hidden>
        Throw them around, if it helps
      </p>
    </main>
  );
}

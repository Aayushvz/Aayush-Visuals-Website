"use client";

import { useCallback, useEffect, useState } from "react";

/*
  The status card, in the globe's old place: who this is, the time in
  India, availability, and the two things someone on a contact page
  actually wants to do - start the form or take the address away.

  The clock is India time, read on the client and refreshed on the minute,
  so it shows the time on this side rather than the visitor's. It
  renders empty on the server, since the server has no business guessing.
*/
export const CONTACT_EMAIL = "aayushvisuals@gmail.com";

function useIndiaTime() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
    });
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setTime(fmt.format(new Date()).replace(" ", ""));
      /* wake at the top of the next minute rather than polling */
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return time;
}

export default function StatusCard({ onHire }: { onHire: () => void }) {
  const time = useIndiaTime();
  const [copied, setCopied] = useState(false);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* no clipboard (insecure context, denied): fall back to the mail app */
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  }, []);

  return (
    <div className="statusCard">
      <div className="statusCard__panel">
        <div className="statusCard__top">
          <span className="statusCard__role">Product Designer</span>
          <span className="statusCard__time" aria-label={time ? `${time} in India` : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="13" r="7.5" />
              <path d="M12 9.5V13l2.2 1.6M5 4.5 3 6.5M19 4.5l2 2" />
            </svg>
            <span suppressHydrationWarning>{time || "--:--"}</span>
          </span>
        </div>

        <div className="statusCard__who">
          <img
            className="statusCard__avatar"
            src="/about/avatar.webp"
            alt=""
            width={64}
            height={64}
          />
          <div>
            <p className="statusCard__name">Aayush Raj</p>
            <p className="statusCard__avail">
              <span className="statusCard__availDot" aria-hidden />
              Available for work
            </p>
          </div>
        </div>

        <div className="statusCard__actions">
          <button type="button" className="statusCard__btn" onClick={onHire}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 8.5v7M8.5 12h7" />
            </svg>
            Hire Me
          </button>
          <button type="button" className="statusCard__btn" onClick={copyEmail}>
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5 10 17 19 7.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
                <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
                <path d="M15.5 8.5V5.5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
              </svg>
            )}
            <span aria-live="polite">{copied ? "Copied" : "Copy Email"}</span>
          </button>
        </div>
      </div>

      <div className="statusCard__strap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
          <path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z" />
        </svg>
        Currently high on creativity
      </div>
    </div>
  );
}


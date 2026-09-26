"use client";

import { useCallback, useState } from "react";

/*
  The contact section at the foot of every page.

  Simple on purpose: the ask on the left, the form on the right in one light
  card, and a single playful moment - Shotsu, the site's mascot, drawn in CSS
  as a 3D jelly, peeking over the top edge of the card as if it is waiting
  to deliver the message.
*/

const EMAIL = "aayushvisuals@gmail.com";

const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/aayushvz" },
  { label: "Behance", href: "https://www.behance.net/AAYUSHVISUALS" },
  { label: "GitHub", href: "https://github.com/Aayushvz" },
];

export default function HomeContact() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  }, []);

  return (
    <section className="hc hcs" id="contact" aria-labelledby="contact-heading">
      <div className="hcs__inner">
        <div className="hcs__left">
          <h2 className="hcs__heading" id="contact-heading">
            Got something in mind?
          </h2>
          <p className="hcs__tagline">
            A job, a project, a wild idea. Whatever it is, drop me a message and
            let&rsquo;s see what we can make out of it.
          </p>

          <button type="button" className="hcs__copy" onClick={copyEmail}>
            <span className="hcs__copyMail">{EMAIL}</span>
            <span className="hcs__copyTag" aria-live="polite">
              {copied ? "Copied" : "Copy"}
            </span>
          </button>

          <ul className="hcs__links" aria-label="Elsewhere">
            {LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="hcs__right">
          {/* Shotsu, peeking over the card's edge */}
          <div className="cbMascot hcs__mascot" aria-hidden>
            <span className="cbMascot__ears" />
            <span className="cbMascot__body">
              <span className="cbMascot__eye cbMascot__eye--l" />
              <span className="cbMascot__eye cbMascot__eye--r" />
              <span className="cbMascot__shine" />
            </span>
          </div>

          <span className="hcs__paw hcs__paw--l" aria-hidden />
          <span className="hcs__paw hcs__paw--r" aria-hidden />

          <form
            className="hcs__form"
            action="https://formsubmit.co/ajax/aayushvisuals@gmail.com"
            method="POST"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setStatus("sending");
              try {
                const res = await fetch(form.action, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify(Object.fromEntries(new FormData(form))),
                });
                if (res.ok) {
                  setStatus("sent");
                  form.reset();
                  setTimeout(() => setStatus("idle"), 3000);
                } else {
                  setStatus("error");
                }
              } catch {
                setStatus("error");
              }
            }}
          >
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />
            <div className="hcs__row">
              <input className="hcs__input" type="text" name="name" required placeholder="Name*" aria-label="Name" />
              <input className="hcs__input" type="email" name="email" required placeholder="Email*" aria-label="Email" />
            </div>
            <textarea className="hcs__input hcs__textarea" name="message" required placeholder="Message*" aria-label="Message" />
            <button className="hcs__send" type="submit" disabled={status === "sending"}>
              {status === "sent"
                ? "Message sent"
                : status === "sending"
                  ? "Sending..."
                  : status === "error"
                    ? "Try again"
                    : "Send message"}
              {status !== "sent" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              ) : null}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

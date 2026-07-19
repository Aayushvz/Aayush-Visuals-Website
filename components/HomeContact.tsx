"use client";

import { useState } from "react";

export default function HomeContact() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  return (
    <section className="hc" id="contact">
      <div className="hc__inner">
        {/* Left */}
        <div className="hc__left">
          <h2 className="hc__heading">
            Let&rsquo;s work<br />together.
          </h2>
          <p className="hc__tagline">
            Got a project? Drop me a message and I&rsquo;ll respond within 24 hours.
          </p>

          <ul className="hc__bullets" aria-label="Highlights">
            <li className="hc__bullet">
              <span className="hc__bulletMark" aria-hidden>+</span>
              Available for freelance
            </li>
            <li className="hc__bullet">
              <span className="hc__bulletMark" aria-hidden>+</span>
              Based in New Delhi, India
            </li>
            <li className="hc__bullet">
              <span className="hc__bulletMark" aria-hidden>+</span>
              Responds within 24 hours
            </li>
          </ul>
        </div>

        {/* Right: form */}
        <form
          className="hc__form"
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

          <input
            className="hc__input"
            type="text"
            name="name"
            required
            placeholder="Name*"
          />
          <input
            className="hc__input"
            type="email"
            name="email"
            required
            placeholder="Email*"
          />
          <textarea
            className="hc__textarea"
            name="message"
            required
            placeholder="Message*"
          />

          <button className="hc__submit" type="submit" disabled={status === "sending"}>
            {status === "sent"
              ? "Message sent!"
              : status === "sending"
                ? "Sending..."
                : status === "error"
                  ? "Try again"
                  : "Send message"}
            {status !== "sent" && (
              <svg className="hc__submitArrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";


const SOCIALS = [
  {
    label: "Behance",
    href: "https://www.behance.net/AAYUSHVISUALS",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
        {/* The official Behance mark, used as-is. Only transform here is an
            inset so it optically matches the other icons' size - the path
            itself is the real wordmark and must not be redrawn by hand. */}
        <g transform="scale(0.86) translate(1.95 2.01)">
          <path d="M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z" />
        </g>
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/aayush.visuals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/aayushvz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="9" width="4" height="12" />
        <circle cx="5" cy="4.5" r="2" />
        <path d="M11 21v-7a3.5 3.5 0 0 1 7 0v7M11 12.5v-1.5" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "mailto:aayushvisuals@gmail.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
];

function MagneticDotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.closest(".contactPage") as HTMLElement | null;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !wrap || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const GAP = 28;
    const RADIUS = 180;
    const DECAY = 0.92;

    let w = 0, h = 0, cols = 0, rows = 0;
    let heat = new Float32Array(0);
    const pointer = { x: -9999, y: -9999, active: false };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      heat = new Float32Array(cols * rows);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const setPointer = (cx: number, cy: number) => {
      const rect = wrap.getBoundingClientRect();
      pointer.x = cx - rect.left;
      pointer.y = cy - rect.top;
      pointer.active = true;
    };
    const onMove = (e: PointerEvent) => setPointer(e.clientX, e.clientY);
    const onLeave = () => { pointer.active = false; };

    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave, { passive: true });

    const cleanup = () => {
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };

    if (reduced) {
      ctx.fillStyle = "rgba(167, 139, 250, 0.04)";
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          ctx.beginPath();
          ctx.arc(x * GAP, y * GAP, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      return cleanup;
    }

    let raf = 0;
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const px = x * GAP;
          const py = y * GAP;
          if (pointer.active) {
            const d = Math.hypot(px - pointer.x, py - pointer.y);
            if (d < RADIUS) {
              const falloff = Math.pow(1 - d / RADIUS, 1.6);
              if (falloff > heat[i]) heat[i] = falloff;
            }
          }
          const hv = heat[i];
          heat[i] = hv > 0.003 ? hv * DECAY : 0;

          const base = 0.03 + hv * 0.02;
          const purple = hv * 0.45;
          const r = 1 + hv * 1.2;
          ctx!.beginPath();
          ctx!.fillStyle = `rgba(${Math.round(124 + hv * 43)}, ${Math.round(58 + hv * 81)}, ${Math.round(237)}, ${(base + purple).toFixed(3)})`;
          ctx!.arc(px, py, r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, []);

  return <canvas className="contactPage__dots" ref={canvasRef} aria-hidden />;
}

/*
  The status card, in the globe's old place: who this is, the time in
  India, availability, and the two things someone on a contact page
  actually wants to do - start the form or take the address away.

  The clock is India time, read on the client and refreshed on the minute,
  so it shows the time on this side rather than the visitor's. It
  renders empty on the server, since the server has no business guessing.
*/
const CONTACT_EMAIL = "aayushvisuals@gmail.com";

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

function StatusCard({ onHire }: { onHire: () => void }) {
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

export default function ContactPageClient() {
  const [formState, setFormState] = useState<"idle" | "sending" | "sent">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  /* "Hire Me" starts the form: bring it into view and put the cursor in
     the first field */
  const startHire = useCallback(() => {
    const first = formRef.current?.querySelector<HTMLInputElement>("#c-name");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => first?.focus({ preventScroll: true }), 450);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("contact-page-active");
    return () => {
      document.documentElement.classList.remove("contact-page-active");
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formState !== "idle") return;
    setFormState("sending");
    setTimeout(() => {
      setFormState("sent");
      setTimeout(() => setFormState("idle"), 3000);
    }, 1200);
  };

  const filled = name.trim() && email.trim() && message.trim();

  return (
    <div className="contactPage" ref={pageRef}>
      <Navbar />
      <MobileNav />
      <Cursor />


      {/* The stage is the page content proper - the heading, the form and
          the details beside it - with the navbar, the cursor and the footer
          all outside it. That is what a main landmark is, so it is one:
          without it this page had no way to skip past the chrome. */}
      <main className="contactPage__stage">
        <MagneticDotField />

        <div className="contactPage__rails" aria-hidden>
          <span className="contactPage__rail contactPage__rail--left" />
          <span className="contactPage__rail contactPage__rail--right" />
        </div>

        <div className="contactPage__content">
        <div className="contactPage__hero">
          <div className="contactPage__heroInner">
            <span className="contactPage__kicker">Contact</span>
            <h1 className="contactPage__title display">
              <span className="contactPage__titleLight">
                {"let's work".split("").map((ch, i) =>
                  ch === " " ? " " : <span key={i} className="contactPage__letter">{ch}</span>
                )}
              </span>
              <br />
              {"together".split("").map((ch, i) =>
                <span key={i} className="contactPage__letter">{ch}</span>
              )}
              <span className="contactPage__titleDot">.</span>
            </h1>
            <p className="contactPage__subtitle">
              Have a project in mind, want to collaborate, or just want to say hello?
              Drop me a message and I will get back to you soon.
            </p>
          </div>
          <StatusCard onHire={startHire} />
        </div>

        <div className="contactPage__body">
          <div className="contactPage__formWrap">
            <form
              ref={formRef}
              className="contactPage__form"
              onSubmit={handleSubmit}
              autoComplete="off"
            >
              <div className="contactPage__fieldGroup">
                <div className="contactPage__field">
                  <label className="contactPage__label" htmlFor="c-name">
                    Your name
                  </label>
                  <input
                    id="c-name"
                    className="contactPage__input"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="contactPage__field">
                  <label className="contactPage__label" htmlFor="c-email">
                    Your email
                  </label>
                  <input
                    id="c-email"
                    className="contactPage__input"
                    type="email"
                    required
                    placeholder="hello@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="contactPage__field">
                <label className="contactPage__label" htmlFor="c-subject">
                  Subject
                </label>
                <input
                  id="c-subject"
                  className="contactPage__input"
                  type="text"
                  placeholder="Project collaboration, freelance, just saying hi..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="contactPage__field contactPage__field--textarea">
                <label className="contactPage__label" htmlFor="c-message">
                  Message
                </label>
                <textarea
                  id="c-message"
                  className="contactPage__textarea"
                  required
                  rows={5}
                  placeholder="Tell me about your project, timeline, budget..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className={`contactPage__submit ${formState !== "idle" ? "contactPage__submit--active" : ""}`}
                disabled={!filled || formState !== "idle"}
              >
                <span className="contactPage__submitText">
                  {formState === "idle" && "Send message"}
                  {formState === "sending" && "Sending..."}
                  {formState === "sent" && "Sent!"}
                </span>
                <span className="contactPage__submitArrow" aria-hidden>
                  {formState === "sent" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </span>
              </button>
            </form>
          </div>

          <aside className="contactPage__aside">
            <div className="contactPage__infoBlock">
              <h3 className="contactPage__infoTitle">Get in touch</h3>
              <a href={`mailto:${CONTACT_EMAIL}`} className="contactPage__emailLink">
                {CONTACT_EMAIL}
              </a>
            </div>

            <div className="contactPage__infoBlock">
              <h3 className="contactPage__infoTitle">Based in</h3>
              <p className="contactPage__infoText">India</p>
            </div>

            <div className="contactPage__infoBlock">
              <h3 className="contactPage__infoTitle">Socials</h3>
              <div className="contactPage__socials">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.href.startsWith("mailto") ? undefined : "_blank"}
                    rel={s.href.startsWith("mailto") ? undefined : "noreferrer"}
                    className="contactPage__socialLink"
                    aria-label={s.label}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="contactPage__infoBlock contactPage__infoBlock--availability">
              <span className="contactPage__availDot" aria-hidden />
              <span>Available for freelance</span>
            </div>
          </aside>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

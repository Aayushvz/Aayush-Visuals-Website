"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import createGlobe from "cobe";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";


const SOCIALS = [
  {
    label: "Behance",
    href: "https://www.behance.net/AAYUSHVISUALS",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 7h7a3 3 0 0 1 0 6H3zM3 13h7.5a3.2 3.2 0 0 1 0 6.4H3z" />
        <path d="M15.5 9.5h6M14.5 16a3.5 3.5 0 0 0 6.9.7 3.5 3.5 0 0 0-3.4-4.2c-2 0-3.5 1.6-3.5 3.5Z" />
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

function InteractiveGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = 0;
    const onResize = () => {
      width = canvas.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const isLight = () => document.documentElement.dataset.theme === "light";

    const darkTheme = {
      dark: 1 as number,
      diffuse: 1.4,
      mapBrightness: 4,
      mapBaseBrightness: 0.02,
      baseColor: [0.15, 0.15, 0.18] as [number, number, number],
      markerColor: [0.486, 0.231, 0.929] as [number, number, number],
      glowColor: [0.08, 0.05, 0.14] as [number, number, number],
    };

    const lightTheme = {
      dark: 0 as number,
      diffuse: 2,
      mapBrightness: 1.8,
      mapBaseBrightness: 0.04,
      baseColor: [0.92, 0.9, 0.86] as [number, number, number],
      markerColor: [0.486, 0.231, 0.929] as [number, number, number],
      glowColor: [0.9, 0.88, 0.84] as [number, number, number],
    };

    const initTheme = isLight() ? lightTheme : darkTheme;

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: width * 2,
      height: width * 2,
      phi: 1.2,
      theta: 0.25,
      mapSamples: 16000,
      markers: [
        { location: [28.6139, 77.209], size: 0.08 },
      ],
      ...initTheme,
    });

    const observer = new MutationObserver(() => {
      const t = isLight() ? lightTheme : darkTheme;
      globe.update(t);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let raf: number;
    function animate() {
      if (pointerInteracting.current === null) {
        phiRef.current += 0.003;
      }
      globe.update({
        phi: phiRef.current + pointerInteractionMovement.current,
        width: width * 2,
        height: width * 2,
      });
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const onPointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteractionMovement.current += delta / 200;
      pointerInteracting.current = e.clientX;
    }
  }, []);

  return (
    <div className="contactPage__globe">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerUp}
        onPointerMove={onPointerMove}
        style={{ width: "100%", height: "100%", cursor: "grab", contain: "layout paint size" }}
      />
      <div className="contactPage__globeLabel">
        <span className="contactPage__globePulse" aria-hidden />
        India
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


      <div className="contactPage__stage">
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
          <InteractiveGlobe />
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
                  <span className="contactPage__inputLine" aria-hidden />
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
                  <span className="contactPage__inputLine" aria-hidden />
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
                <span className="contactPage__inputLine" aria-hidden />
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
                <span className="contactPage__inputLine" aria-hidden />
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
              <a href="mailto:aayushvisuals@gmail.com" className="contactPage__emailLink">
                aayushvisuals@gmail.com
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
      </div>

      <Footer />
    </div>
  );
}

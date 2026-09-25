"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PageLink from "@/components/PageLink";
import PromoManager from "@/components/PromoManager";
import type { Promo } from "@/components/PromoToast";
import "./shotsu.css";

/*
  Shotsu - the site's assistant, living in a purple orb at the bottom right.

  The orb is a glossy sphere with a pair of eyes that follow the pointer
  and blink now and then. It does two jobs:
  - it talks: the notification cards (PromoManager) now rise out of it as
    speech bubbles, with a tail pointing back down at the orb;
  - it listens: click it and a chat panel opens above it, in the same
    design language as those cards (white card, purple band, dashed inner
    card), where visitors can ask about Aayush. Answers stream from
    /api/shotsu, grounded in his resumes.

  It lives in the root layout, so a conversation survives moving between
  pages. It stays off the games and tools, which have interfaces of their
  own in that corner.
*/

type Msg = { role: "user" | "assistant"; content: string };

/* the "things you can ask" cards on the empty chat */
const ACTIONS: {
  title: string;
  sub: string;
  ask: string;
  tone: "violet" | "blue" | "green" | "amber";
  icon: string;
}[] = [
  {
    title: "Best work",
    sub: "Case studies worth your time",
    ask: "Show me his best work",
    tone: "violet",
    icon: "M4 7.5h16v11H4zM9 7.5V5.5h6v2M4 12h16",
  },
  {
    title: "Experience",
    sub: "KPMG, LayOver, Riviera and more",
    ask: "Walk me through his experience",
    tone: "blue",
    icon: "M5 20V9l7-5 7 5v11M9.5 20v-6h5v6",
  },
  {
    title: "Skills & tools",
    sub: "How he designs and builds",
    ask: "What's his design and tech stack?",
    tone: "green",
    icon: "M8 8 4 12l4 4M16 8l4 4-4 4M13.5 5.5l-3 13",
  },
  {
    title: "Hire Aayush",
    sub: "Availability and how to reach him",
    ask: "Is he open to work, and how do I reach him?",
    tone: "amber",
    icon: "M4 6.5h16v11H4zM4.5 7l7.5 6 7.5-6",
  },
];

/* quick follow-ups, offered above the field once a chat has started */
const FOLLOW_UPS = [
  "Most recent project?",
  "Awards",
  "Leadership",
  "How to contact him?",
];

/* Shotsu's face: two glowing pill eyes that follow the pointer (the
   --look vars) and blink. Deliberately just the eyes - enough to feel
   attentive, not a mascot. Sized in em off the orb's font-size, so the
   same face fits the big orb and the pocket one */
function Face() {
  return (
    <span className="shotsuFace">
      <span className="shotsuFace__eye shotsuFace__eye--l" />
      <span className="shotsuFace__eye shotsuFace__eye--r" />
    </span>
  );
}

/* a pocket version of the orb, used as Shotsu's avatar in the panel */
function MiniOrb({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className={`shotsuMini shotsuMini--${size}`} aria-hidden>
      <span className="shotsuMini__swirl" />
      <Face />
      <span className="shotsuMini__shine" />
    </span>
  );
}

function onOrbRoute(path: string) {
  return (
    path === "/" ||
    path === "/about" ||
    path === "/contact" ||
    path === "/playground" ||
    path === "/work" ||
    path.startsWith("/work/")
  );
}

/* answers use markdown links for site pages and plain emails; render both
   as real links and everything else as text */
function RichText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|([\w.+-]+@[\w-]+\.[\w.]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[3]) {
      parts.push(
        <a key={i++} href={`mailto:${m[3]}`} className="shotsu__link">
          {m[3]}
        </a>,
      );
    } else if (m[2].startsWith("/")) {
      parts.push(
        <PageLink key={i++} href={m[2]} className="shotsu__link" onClick={onNavigate}>
          {m[1]}
        </PageLink>,
      );
    } else {
      parts.push(
        <a key={i++} href={m[2]} target="_blank" rel="noreferrer" className="shotsu__link">
          {m[1]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Orb({
  open,
  talking,
  onClick,
}: {
  open: boolean;
  talking: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  /* the eyes look toward the pointer, a couple of pixels at most */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const pull = Math.min(1, d / 260);
        el.style.setProperty("--look-x", `${((dx / d) * 2.6 * pull).toFixed(2)}px`);
        el.style.setProperty("--look-y", `${((dy / d) * 2.2 * pull).toFixed(2)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className={`shotsuOrb${open ? " shotsuOrb--open" : ""}${talking ? " shotsuOrb--talking" : ""}`}
      aria-label={open ? "Close Shotsu" : "Ask Shotsu, Aayush's assistant"}
      aria-expanded={open}
      onClick={onClick}
    >
      <span className="shotsuOrb__glow" aria-hidden />
      <span className="shotsuOrb__ball" aria-hidden>
        <span className="shotsuOrb__swirl" />
        <span className="shotsuOrb__glass" />
        <Face />
        <span className="shotsuOrb__shine" />
      </span>
      <span className="shotsuOrb__floor" aria-hidden />
      <span className="shotsuOrb__label" aria-hidden>
        Ask Shotsu
      </span>
    </button>
  );
}

export default function Shotsu({ promos }: { promos: Promo[] }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [talking, setTalking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const visible = onOrbRoute(pathname);

  /* keep the newest message in view */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  /* focus the field on open; Escape closes */
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 250);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* leaving for a page without the orb closes the chat */
  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;
      const history: Msg[] = [...msgs, { role: "user", content: q }];
      setMsgs([...history, { role: "assistant", content: "" }]);
      setDraft("");
      setBusy(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch("/api/shotsu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(String(res.status));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setMsgs([...history, { role: "assistant", content: answer }]);
        }
      } catch (err) {
        /* the visitor went back to the start; drop this answer quietly */
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMsgs([
          ...history,
          {
            role: "assistant",
            content:
              "I couldn't reach my notes just now. Try again in a moment, or email aayushvisuals@gmail.com.",
          },
        ]);
      } finally {
        if (abortRef.current === ctrl) {
          abortRef.current = null;
          setBusy(false);
        }
      }
    },
    [busy, msgs],
  );

  /* back to the start screen: stop any answer mid-stream and clear the chat */
  const goHome = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMsgs([]);
    setBusy(false);
    setDraft("");
  }, []);

  if (!visible) return null;

  const empty = msgs.length === 0;

  return (
    <div className="shotsu">
      {/* the notification cards speak from the orb; paused while chatting */}
      <PromoManager promos={promos} paused={open} onActive={setTalking} />

      {open ? (
        <section
          className={`shotsuChat${empty ? " shotsuChat--empty" : ""}`}
          role="dialog"
          aria-label="Chat with Shotsu"
        >
          {/* the gradient wash, with two slow colour glows drifting in it */}
          <span className="shotsuChat__wash" aria-hidden>
            <i />
            <i />
          </span>

          <header className="shotsuChat__head">
            {!empty ? (
              <button
                type="button"
                className="shotsuChat__back"
                aria-label="Back to Shotsu home"
                onClick={goHome}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 5.5 8.5 12l6.5 6.5" />
                </svg>
              </button>
            ) : null}
            <MiniOrb />
            <span className="shotsuChat__who">
              <span className="shotsuChat__name">Shotsu</span>
              <span className="shotsuChat__status">
                <span className="shotsuChat__live" aria-hidden />
                {busy ? "Thinking..." : "Online · Aayush's assistant"}
              </span>
            </span>
            <button
              type="button"
              className="shotsuChat__close"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            {busy ? <span className="shotsuChat__progress" aria-hidden /> : null}
          </header>

          <div className="shotsuChat__list" ref={listRef} aria-live="polite">
            {empty ? (
              <div className="shotsuChat__hero">
                <h2 className="shotsuChat__hello">
                  Hey there!
                  <br />
                  What would you like to know about <em>Aayush</em>?
                </h2>
                <p className="shotsuChat__kicker">Things you can ask</p>
                <div className="shotsuChat__actions">
                  {ACTIONS.map((act, i) => (
                    <button
                      key={act.title}
                      type="button"
                      className={`shotsuAction shotsuAction--${act.tone}`}
                      style={{ "--d": `${i * 60}ms` } as React.CSSProperties}
                      onClick={() => ask(act.ask)}
                    >
                      <span className="shotsuAction__icon" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d={act.icon} />
                        </svg>
                      </span>
                      <span className="shotsuAction__text">
                        <span className="shotsuAction__title">{act.title}</span>
                        <span className="shotsuAction__sub">{act.sub}</span>
                      </span>
                      <span className="shotsuAction__go" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) =>
                m.role === "user" ? (
                  <p key={i} className="shotsuMsg shotsuMsg--user">
                    {m.content}
                  </p>
                ) : (
                  <div key={i} className="shotsuMsg shotsuMsg--bot">
                    <MiniOrb size="sm" />
                    <div className="shotsuMsg__bubble">
                      {m.content ? (
                        <RichText text={m.content} onNavigate={() => setOpen(false)} />
                      ) : (
                        <span className="shotsuMsg__typing" aria-label="Shotsu is typing">
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                    </div>
                  </div>
                ),
              )
            )}
          </div>

          <div className="shotsuChat__foot">
            {!empty && !busy ? (
              <div className="shotsuChat__follow">
                {FOLLOW_UPS.map((f) => (
                  <button key={f} type="button" className="shotsuChat__chip" onClick={() => ask(f)}>
                    {f}
                  </button>
                ))}
              </div>
            ) : null}
            <form
              className="shotsuChat__form"
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
            >
              <input
                ref={inputRef}
                className="shotsuChat__input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask anything about Aayush..."
                maxLength={600}
                aria-label="Your question"
              />
              <button
                type="submit"
                className="shotsuChat__send"
                aria-label="Send"
                disabled={busy || !draft.trim()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
                </svg>
              </button>
            </form>
            <p className="shotsuChat__note">Answers come from Aayush&apos;s resume and can miss things.</p>
          </div>
        </section>
      ) : null}

      <Orb open={open} talking={talking && !open} onClick={() => setOpen((o) => !o)} />
    </div>
  );
}

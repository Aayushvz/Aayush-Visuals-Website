"use client";

import { useEffect, useRef, useState } from "react";
import type { CityAudio } from "./audio";
import { TRACKS } from "./audio";
import type { Discovery } from "./world";
import "./gameboy.css";

type GameBoyProps = {
  isOpen: boolean;
  onClose: () => void;
  audio: CityAudio | null;
  discoveries: Discovery[];
  found: string[];
  isDay: boolean;
  onToggleDay: () => void;
  onWarp: (tx: number, ty: number) => void;
  onOpenWork: (id: string) => void;
  district: string;
};

type ViewMode = "status" | "works" | "shotsu" | "music" | "world";
type ChatMsg = { role: "user" | "assistant"; content: string };

const QUICK_SHOTSU_QUESTIONS = [
  "Show me his best work",
  "Walk me through his experience",
  "What is his design & tech stack?",
  "How can I contact Aayush?",
];

export default function GameBoy({
  isOpen,
  onClose,
  audio,
  discoveries,
  found,
  isDay,
  onToggleDay,
  onWarp,
  onOpenWork,
  district,
}: GameBoyProps) {
  const [view, setView] = useState<ViewMode>("status");
  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedWorkIdx, setSelectedWorkIdx] = useState(0);
  const [volume, setVolume] = useState(70);

  // Embedded Shotsu Assistant State
  const [shotsuMsgs, setShotsuMsgs] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm Shotsu, Aayush's AI assistant. Ask me about his projects, experience, skills, or background!",
    },
  ]);
  const [shotsuDraft, setShotsuDraft] = useState("");
  const [shotsuBusy, setShotsuBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (audio) {
      setTrackIdx(audio.currentTrack);
      setIsPlaying(!audio.muted);
    }
  }, [audio, isOpen]);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [shotsuMsgs, shotsuBusy, view]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept typing in Shotsu input field
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      const k = e.key.toLowerCase();
      if (k === "escape" || k === "b") {
        audio?.playSelect();
        onClose();
      } else if (k === "arrowleft") {
        cycleView(-1);
      } else if (k === "arrowright") {
        cycleView(1);
      } else if (k === "arrowup") {
        audio?.playBeep();
        if (view === "works") {
          setSelectedWorkIdx((i) => (i - 1 + discoveries.length) % discoveries.length);
        } else if (view === "music") {
          prevTrack();
        }
      } else if (k === "arrowdown") {
        audio?.playBeep();
        if (view === "works") {
          setSelectedWorkIdx((i) => (i + 1) % discoveries.length);
        } else if (view === "music") {
          nextTrack();
        }
      } else if (k === "enter" || k === "a") {
        handleActionA();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, view, trackIdx, selectedWorkIdx, isDay]);

  const cycleView = (dir: number) => {
    const views: ViewMode[] = ["status", "works", "shotsu", "music", "world"];
    const idx = views.indexOf(view);
    const next = views[(idx + dir + views.length) % views.length];
    setView(next);
    audio?.playSelect();
  };

  const nextTrack = () => {
    if (!audio) return;
    const n = (trackIdx + 1) % TRACKS.length;
    setTrackIdx(n);
    audio.setTrack(n);
  };

  const prevTrack = () => {
    if (!audio) return;
    const n = (trackIdx - 1 + TRACKS.length) % TRACKS.length;
    setTrackIdx(n);
    audio.setTrack(n);
  };

  const setSoundState = (enable: boolean) => {
    if (!audio) return;
    audio.setMuted(!enable);
    setIsPlaying(enable);
    audio.playSelect();
  };

  const handleActionA = () => {
    audio?.playSelect();
    if (view === "status") {
      setSoundState(!isPlaying);
    } else if (view === "works") {
      const target = discoveries[selectedWorkIdx];
      if (target) {
        onWarp(target.tx, target.ty);
        onClose();
      }
    } else if (view === "music") {
      setSoundState(!isPlaying);
    } else if (view === "world") {
      onToggleDay();
    }
  };

  const askShotsu = async (question: string) => {
    const q = question.trim();
    if (!q || shotsuBusy) return;
    const history: ChatMsg[] = [...shotsuMsgs, { role: "user", content: q }];
    setShotsuMsgs([...history, { role: "assistant", content: "" }]);
    setShotsuDraft("");
    setShotsuBusy(true);
    audio?.playBeep();
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
        setShotsuMsgs([...history, { role: "assistant", content: answer }]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShotsuMsgs([
        ...history,
        {
          role: "assistant",
          content: "Couldn't reach my notes just now. Try again or email aayushvisuals@gmail.com!",
        },
      ]);
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setShotsuBusy(false);
      }
    }
  };

  if (!isOpen) return null;

  const currentTrack = TRACKS[trackIdx] || TRACKS[0];

  return (
    <div
      className="gb__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          audio?.playSelect();
          onClose();
        }
      }}
    >
      {/* Classic Game Boy DMG-01 Chassis with Spider-Man Special Edition Styling */}
      <aside
        className="gb__chassis"
        aria-label="Game Boy Spider-Man Edition Controller"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Grooves / Cooling Lines */}
        <div className="gb__topGrooves" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        {/* Close Button on Top Right */}
        <button className="gb__closeBtn" onClick={onClose} aria-label="Close Game Boy">
          ✕
        </button>

        {/* Curved Screen Bezel (Dark Charcoal with Power LED & Game Boy Headings) */}
        <div className="gb__bezel">
          {/* Authentic Spider-Man Themed Bezel Top Bar (Reference Image 3) */}
          <div className="gb__bezelHeader">
            {/* Top-Left Circular Spidey Mask Emblem with White Eyes */}
            <div className="gb__spideyEyeBadge" title="Spider-Sense Sensor">
              <span className="gb__spideyEyeLens gb__spideyEyeLens--l" />
              <span className="gb__spideyEyeLens gb__spideyEyeLens--r" />
            </div>

            {/* Top-Center Blue Tracker Pill Banner */}
            <div className="gb__spideyTrackerPill">
              <span className="gb__trackerText">SPIDEY</span>
              <span className="gb__trackerMaskIcon" />
              <span className="gb__trackerText">TRACKER</span>
            </div>

            {/* Top-Right White Square Spider Badge */}
            <div className="gb__spiderSquareBadge" title="Spider-Man Labs">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="#0d111d" aria-hidden="true">
                <circle cx="8" cy="8" r="2.6" />
                <circle cx="8" cy="4.8" r="1.5" />
                <path d="M5 6L2 4M11 6L14 4M5 8L1.5 8M11 8L14.5 8M5 10L2 12M11 10L14 12M6 11L4 14M10 11L12 14" stroke="#0d111d" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Side Tabs on the Bezel Frame (Image 3 reference) */}
          <div className="gb__sideTab gb__sideTab--1" aria-hidden="true">🕷️</div>
          <div className="gb__sideTab gb__sideTab--2" aria-hidden="true">🕷️</div>

          {/* Bottom-Left Mini Chibi Spider-Man Badge (Image 3 reference) */}
          <div className="gb__chibiSpideyBadge" aria-hidden="true" title="Peter Parker / Spider-Man">
            <span className="gb__chibiHead" />
            <span className="gb__chibiBody" />
          </div>

          {/* Nav Tabs inside Game Boy LCD Window */}
          <nav className="gb__tabs">
            <button
              className={`gb__tab ${view === "status" ? "is-active" : ""}`}
              onClick={() => { setView("status"); audio?.playSelect(); }}
            >
              STATUS
            </button>
            <button
              className={`gb__tab ${view === "works" ? "is-active" : ""}`}
              onClick={() => { setView("works"); audio?.playSelect(); }}
            >
              WORKS
            </button>
            <button
              className={`gb__tab ${view === "shotsu" ? "is-active" : ""}`}
              onClick={() => { setView("shotsu"); audio?.playSelect(); }}
            >
              SHOTSU 🔮
            </button>
            <button
              className={`gb__tab ${view === "music" ? "is-active" : ""}`}
              onClick={() => { setView("music"); audio?.playSelect(); }}
            >
              AUDIO
            </button>
            <button
              className={`gb__tab ${view === "world" ? "is-active" : ""}`}
              onClick={() => { setView("world"); audio?.playSelect(); }}
            >
              TIME
            </button>
          </nav>

          {/* LCD Screen Display Area */}
          <div className="gb__screen">
            {/* Scanlines layer */}
            <div className="gb__scanlines" aria-hidden="true" />

            {/* VIEW 1: STATUS (Upside-Down Hanging Spidey, Spidey Tracker, Sound options) */}
            {view === "status" && (
              <div className="gb__view gb__view--status">
                {/* Hanging Upside-Down Spider-Man (as in Image 3) */}
                <div className="gb__hangingSpidey" aria-hidden="true">
                  <div className="gb__webLine" />
                  <div className="gb__spideyInverted">
                    {/* Feet gripping web line */}
                    <div className="gb__invFeet" />
                    {/* Blue suit torso */}
                    <div className="gb__invTorso" />
                    {/* Mask with white eye lenses looking forward */}
                    <div className="gb__invHead">
                      <span className="gb__invEye gb__invEye--l" />
                      <span className="gb__invEye gb__invEye--r" />
                    </div>
                  </div>
                </div>

                <div className="gb__welcomeText">
                  <p>WELCOME TO THE SPIDEY TRACKER.</p>
                  <p>INTERACT WITH THE MAP TO VIEW</p>
                  <p>SPIDER-MAN SIGHTINGS</p>
                  <p>ALL OVER THE WORLD.</p>
                </div>

                {/* Animated Equalizer Blocks */}
                <div className="gb__eqBar" aria-hidden="true">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span
                      key={i}
                      className={`gb__eqBlock ${isPlaying ? "is-pulsing" : ""}`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>

                <p className="gb__promptText">CHOOSE YOUR SETTINGS AND START TRACKING</p>

                <div className="gb__soundToggles">
                  <button
                    className={`gb__soundBtn ${isPlaying ? "is-active" : ""}`}
                    onClick={() => setSoundState(true)}
                  >
                    SOUND ON
                  </button>
                  <button
                    className={`gb__soundBtn ${!isPlaying ? "is-active" : ""}`}
                    onClick={() => setSoundState(false)}
                  >
                    SOUND OFF
                  </button>
                </div>

                {/* Bottom Tracker Status Bar (Image 3 reference) */}
                <div className="gb__trackerBottomBar">
                  <span>SELECT SOUND OPTION</span>
                  <span className="gb__speakerIcon" aria-hidden="true">🔊</span>
                </div>

                <div className="gb__statusMeta">
                  <span>DISTRICT: {district}</span>
                  <span>DISCOVERED: {found.length}/8</span>
                </div>
              </div>
            )}

            {/* VIEW 2: WORKS (Radar of all 8 experiments with Warp & Open) */}
            {view === "works" && (
              <div className="gb__view gb__view--works">
                <p className="gb__listHeading">EXPERIMENT RADAR ({found.length}/8)</p>
                <div className="gb__worksList">
                  {discoveries.map((d, i) => {
                    const isFound = found.includes(d.id);
                    const isSel = selectedWorkIdx === i;
                    return (
                      <div
                        key={d.id}
                        className={`gb__workItem ${isSel ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedWorkIdx(i);
                          audio?.playBeep();
                        }}
                      >
                        <span className="gb__workDot">{isFound ? "★" : "○"}</span>
                        <div className="gb__workMeta">
                          <strong>{d.label}</strong>
                          <span>{d.title}</span>
                        </div>
                        <div className="gb__workBtns">
                          <button
                            className="gb__actBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWarp(d.tx, d.ty);
                              onClose();
                            }}
                          >
                            WARP
                          </button>
                          <button
                            className="gb__actBtn gb__actBtn--open"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenWork(d.id);
                            }}
                          >
                            OPEN
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: EMBEDDED SHOTSU AI ASSISTANT */}
            {view === "shotsu" && (
              <div className="gb__view gb__view--shotsu">
                {/* Shotsu Mascot Header */}
                <div className="gb__shotsuHeader">
                  <span className="gb__shotsuMascot" aria-hidden="true">🔮</span>
                  <div>
                    <strong>SHOTSU AI ASSISTANT</strong>
                    <span>Ask about Aayush&apos;s work &amp; skills</span>
                  </div>
                </div>

                {/* Chat History Messages */}
                <div className="gb__shotsuChat" ref={chatListRef}>
                  {shotsuMsgs.map((m, idx) => (
                    <div
                      key={idx}
                      className={`gb__chatBubble ${
                        m.role === "user" ? "gb__chatBubble--user" : "gb__chatBubble--bot"
                      }`}
                    >
                      <span className="gb__bubbleRole">
                        {m.role === "user" ? "YOU:" : "SHOTSU:"}
                      </span>
                      <p>{m.content}</p>
                    </div>
                  ))}
                  {shotsuBusy && (
                    <div className="gb__chatBubble gb__chatBubble--bot">
                      <span className="gb__bubbleRole">SHOTSU:</span>
                      <p className="gb__typingDots">
                        <span>•</span>
                        <span>•</span>
                        <span>•</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Chips */}
                <div className="gb__quickChips">
                  {QUICK_SHOTSU_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      className="gb__chip"
                      onClick={() => askShotsu(q)}
                      disabled={shotsuBusy}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input Prompt Form */}
                <form
                  className="gb__shotsuForm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    askShotsu(shotsuDraft);
                  }}
                >
                  <input
                    type="text"
                    value={shotsuDraft}
                    onChange={(e) => setShotsuDraft(e.target.value)}
                    placeholder="Ask Shotsu anything..."
                    className="gb__shotsuInput"
                    disabled={shotsuBusy}
                  />
                  <button
                    type="submit"
                    className="gb__shotsuSend"
                    disabled={shotsuBusy || !shotsuDraft.trim()}
                  >
                    SEND
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 4: AUDIO SYNTHESIZER */}
            {view === "music" && (
              <div className="gb__view gb__view--music">
                <div className="gb__nowPlaying">
                  <span className="gb__trackNum">TRACK {trackIdx + 1} / {TRACKS.length}</span>
                  <h4>{currentTrack.title}</h4>
                  <p>{currentTrack.kind}</p>
                </div>

                {/* Bouncing Visualizer */}
                <div className="gb__visualizer" aria-hidden="true">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span
                      key={i}
                      className={`gb__vBar ${isPlaying ? "is-dancing" : ""}`}
                      style={{ animationDelay: `${(i % 5) * 0.15}s` }}
                    />
                  ))}
                </div>

                <div className="gb__audioControls">
                  <button className="gb__soundBtn" onClick={prevTrack}>◀ PREV</button>
                  <button
                    className={`gb__soundBtn ${isPlaying ? "is-active" : ""}`}
                    onClick={() => setSoundState(!isPlaying)}
                  >
                    {isPlaying ? "❚❚ PAUSE" : "▶ PLAY"}
                  </button>
                  <button className="gb__soundBtn" onClick={nextTrack}>NEXT ▶</button>
                </div>

                <div className="gb__volumeRow">
                  <span>VOL:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setVolume(v);
                      audio?.setVolume(v / 100);
                    }}
                    className="gb__volSlider"
                  />
                  <span>{volume}%</span>
                </div>
              </div>
            )}

            {/* VIEW 5: TIME & ATMOSPHERE */}
            {view === "world" && (
              <div className="gb__view gb__view--world">
                <div className="gb__worldCard">
                  <span className="gb__worldTitle">METROPOLIS CYCLE</span>
                  <div className="gb__worldMode">
                    <span>{isDay ? "☀️ DAYLIGHT" : "🌙 NIGHTFALL"}</span>
                    <button
                      className="gb__soundBtn is-active"
                      onClick={() => {
                        onToggleDay();
                        audio?.playSelect();
                      }}
                    >
                      SWITCH TO {isDay ? "NIGHT" : "DAY"}
                    </button>
                  </div>
                </div>

                <div className="gb__worldStats">
                  <div>
                    <span>CURRENT DISTRICT</span>
                    <strong>{district}</strong>
                  </div>
                  <div>
                    <span>EXPERIMENTS FOUND</span>
                    <strong>{found.length} / {discoveries.length}</strong>
                  </div>
                </div>

                <p className="gb__hint">Press [T] anytime in game to toggle lighting.</p>
              </div>
            )}
          </div>
        </div>

        {/* Embossed Classic Game Boy Typography */}
        <div className="gb__logoLockup">
          <span className="gb__logoMain">GAME BOY</span>
          <span className="gb__logoSub">SPIDER-MAN EDITION</span>
        </div>

        {/* Classic Game Boy Lower Physical Controls */}
        <div className="gb__controls">
          {/* Directional D-PAD (Cross with Center Dimple) */}
          <div className="gb__dpad">
            <button
              className="gb__dpBtn gb__dpUp"
              onClick={() => {
                audio?.playBeep();
                if (view === "works") setSelectedWorkIdx((i) => (i - 1 + discoveries.length) % discoveries.length);
                else prevTrack();
              }}
              aria-label="Up"
            >
              ▲
            </button>
            <button
              className="gb__dpBtn gb__dpLeft"
              onClick={() => cycleView(-1)}
              aria-label="Left"
            >
              ◀
            </button>
            <div className="gb__dpCenter" />
            <button
              className="gb__dpBtn gb__dpRight"
              onClick={() => cycleView(1)}
              aria-label="Right"
            >
              ▶
            </button>
            <button
              className="gb__dpBtn gb__dpDown"
              onClick={() => {
                audio?.playBeep();
                if (view === "works") setSelectedWorkIdx((i) => (i + 1) % discoveries.length);
                else nextTrack();
              }}
              aria-label="Down"
            >
              ▼
            </button>
          </div>

          {/* Angled Oval SELECT and START Pill Buttons */}
          <div className="gb__selectStart">
            <div className="gb__pillWrap">
              <button
                className="gb__pillBtn"
                onClick={() => cycleView(1)}
                aria-label="Select"
              />
              <span className="gb__pillLabel">SELECT</span>
            </div>
            <div className="gb__pillWrap">
              <button
                className="gb__pillBtn"
                onClick={handleActionA}
                aria-label="Start"
              />
              <span className="gb__pillLabel">START</span>
            </div>
          </div>

          {/* Angled Round B & A Action Buttons */}
          <div className="gb__actionButtons">
            <div className="gb__roundWrap">
              <button
                className="gb__roundBtn gb__roundBtn--b"
                onClick={onClose}
                aria-label="B Button (Close)"
              >
                B
              </button>
              <span className="gb__btnLabel">B</span>
            </div>
            <div className="gb__roundWrap">
              <button
                className="gb__roundBtn gb__roundBtn--a"
                onClick={handleActionA}
                aria-label="A Button (Action)"
              >
                A
              </button>
              <span className="gb__btnLabel">A</span>
            </div>
          </div>
        </div>

        {/* Diagonal Speaker Grille Slits on Bottom Right */}
        <div className="gb__speakerGrille" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </aside>
    </div>
  );
}

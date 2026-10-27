import type { ComponentType } from "react";
import "./demos.css";

/*
  Animated product-demo covers for the playground ball - the looping
  "launch video" shot a SaaS site puts in its hero: an app window floating
  on a soft gradient, a cursor doing the one thing the product is for, the
  UI answering, a success toast.

  Pure CSS animation on DOM + inline SVG, sized in container units (cqw)
  so each loop is sharp at any card size and ships no video file. Every
  loop is 8s and seamless. Cards turned away from the viewer pause them
  (.pgs-card:not(.is-live) in sphere.css).

  Keyed by experiment id; a preview of { type: "demo" } renders DEMOS[id].
*/

const Cursor = () => (
  <svg className="dm-cursor" viewBox="0 0 24 24" aria-hidden>
    <path d="M5 3l14 8-6.2 1.6L9.6 19z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

const Bar = ({ title, dark }: { title: string; dark?: boolean }) => (
  <div className={`dm-bar${dark ? " dm-bar--dark" : ""}`}>
    <i />
    <i />
    <i />
    <span>{title}</span>
  </div>
);

const Check = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- 01 Design Premier League: an over, ball by ball ---------- */
function DplDemo() {
  return (
    <div className="dm dm--dpl">
      <div className="dm-glow" />
      <div className="dm-win">
        <Bar title="DPL · Over 1" />
        <div className="dpl-body">
          <div className="dpl-score">
            <span className="dpl-team">Falcons</span>
            <span className="dm-ticker dpl-runs" aria-hidden>
              <span>
                <b>0</b>
                <b>6</b>
                <b>12</b>
                <b>18</b>
                <b>24</b>
                <b>30</b>
                <b>36</b>
              </span>
            </span>
            <span className="dpl-wk">/0</span>
          </div>
          <div className="dpl-balls">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} style={{ "--i": i } as React.CSSProperties}>
                6
              </span>
            ))}
          </div>
          <div className="dpl-meter">
            <span className="dpl-zone" />
            <span className="dpl-needle" />
          </div>
          <div className="dpl-chart">
            <span className="dpl-chart__label">Runs per ball</span>
            <div className="dpl-bars">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <i key={i} />
              ))}
            </div>
          </div>
          <div className="dpl-btn">Swing</div>
        </div>
      </div>
      <div className="dm-toast">
        <span className="dm-toast__ic">
          <Check />
        </span>
        Six! Clean strike
      </div>
      <Cursor />
    </div>
  );
}

/* ---------- 02 CAT Operator Assistant: a tour of the real app ---------- */
const CAT_SCREENS = [
  { src: "/projects/cat-operator-assistant/home-telemetry.webp", tab: "Telemetry", note: "Live engine data" },
  { src: "/projects/cat-operator-assistant/machine-health.webp", tab: "Health", note: "Faults before they stop you" },
  { src: "/projects/cat-operator-assistant/night-mode.webp", tab: "Night", note: "Night mode, glove-sized" },
  { src: "/projects/cat-operator-assistant/fleet-a.webp", tab: "Fleet", note: "The whole site at a glance" },
];
function CatDemo() {
  return (
    <div className="dm dm--cat">
      <div className="dm-glow" />
      <div className="cat-device">
        <div className="cat-chrome">
          <i />
          <i />
          <i />
          <span className="cat-url">cat-operator-assistant</span>
        </div>
        <div className="cat-screen">
          {CAT_SCREENS.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.src} src={s.src} alt="" draggable={false} decoding="async" />
          ))}
        </div>
      </div>
      <div className="cat-tabs">
        <span className="cat-tabs__ind" />
        {CAT_SCREENS.map((s) => (
          <span key={s.tab}>{s.tab}</span>
        ))}
      </div>
      {CAT_SCREENS.map((s) => (
        <span key={s.note} className="cat-note">
          <i />
          {s.note}
        </span>
      ))}
      <Cursor />
    </div>
  );
}

/* ---------- 03 Lotus Pond: the frog's afternoon ---------- */
function PondDemo() {
  return (
    <div className="dm dm--pond">
      <div className="dm-glow" />
      <div className="dm-win">
        <Bar title="Lotus Pond" />
        <div className="pond-scene">
          <span className="pond-ripple" />
          <span className="pond-ripple pond-ripple--b" />
          <span className="pond-pad" />
          <span className="pond-pad pond-pad--b" />
          <span className="pond-frog">
            <i className="pond-eye" />
            <i className="pond-eye pond-eye--r" />
            <i className="pond-tongue" />
          </span>
          <span className="pond-fly" />
          <span className="pond-hud">
            Bugs <b className="dm-ticker">
              <span>
                <b>02</b>
                <b>03</b>
              </span>
            </b>
          </span>
        </div>
      </div>
      <div className="dm-toast">
        <span className="dm-toast__ic">+1</span>
        Caught a firefly
      </div>
    </div>
  );
}

/* ---------- 04 Invoice Generator: bill a client, send it ---------- */
function InvoiceDemo() {
  return (
    <div className="dm dm--inv">
      <div className="dm-glow" />
      <div className="dm-win">
        <Bar title="Invoice #0042" />
        <div className="inv-body">
          <div className="inv-head">
            <span className="inv-to">
              <i />
              <b>Northwind Studio</b>
            </span>
            <span className="inv-status">
              <span>Draft</span>
              <span>Paid</span>
            </span>
          </div>
          {[
            ["Brand workshop", "$800"],
            ["UI design, 3 screens", "$1,200"],
            ["Prototype", "$450"],
          ].map(([a, b], i) => (
            <div className="inv-line" key={a} style={{ "--i": i } as React.CSSProperties}>
              <span>{a}</span>
              <b>{b}</b>
            </div>
          ))}
          <div className="inv-total">
            <span>Total</span>
            <b className="dm-ticker">
              <span>
                <b>$0</b>
                <b>$800</b>
                <b>$2,000</b>
                <b>$2,450</b>
              </span>
            </b>
          </div>
          <div className="inv-btn">Send invoice</div>
        </div>
      </div>
      <div className="dm-toast">
        <span className="dm-toast__ic">
          <Check />
        </span>
        Sent to Northwind · $2,450
      </div>
      <Cursor />
    </div>
  );
}

/* ---------- 05 Contract Generator: write it, sign it ---------- */
function ContractDemo() {
  return (
    <div className="dm dm--con">
      <div className="dm-glow" />
      <div className="dm-win">
        <Bar title="Freelance Agreement.pdf" />
        <div className="con-body">
          <div className="con-doc">
            <b className="con-h">Services Agreement</b>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="con-l" style={{ "--i": i } as React.CSSProperties} />
            ))}
            <svg className="con-sig" viewBox="0 0 120 40">
              <path pathLength={1} d="M4,28 C14,6 22,6 22,22 C22,34 30,34 36,20 C40,12 44,12 46,24 C48,32 54,30 60,20 C66,10 70,14 72,22 C74,30 82,26 90,18 C98,10 106,14 116,16" />
            </svg>
          </div>
          <div className="con-side">
            {["Scope", "Payment", "Revisions", "Rights"].map((t, i) => (
              <span key={t} className="con-item" style={{ "--i": i } as React.CSSProperties}>
                <i>
                  <Check />
                </i>
                {t}
              </span>
            ))}
            <span className="con-stamp">Signed</span>
          </div>
        </div>
      </div>
      <div className="dm-toast">
        <span className="dm-toast__ic">
          <Check />
        </span>
        Ready to send
      </div>
      <Cursor />
    </div>
  );
}

/*
  The live product in a browser window: macOS chrome, the real address in
  the bar, and inside it a real recording or a real capture of the thing.
  The backdrop is a dark room lit from above in the entry's own accent,
  with a fine grain so it reads as a surface rather than a flat fill.
  `aspect` sizes the window to a wide recording instead of cropping it.
*/
export function BrowserShot({
  url,
  video,
  poster,
  image,
  aspect,
  accent,
}: {
  url: string;
  video?: string;
  poster?: string;
  image?: string;
  aspect?: number;
  accent: string;
}) {
  return (
    <div className="bs" style={{ "--bs-accent": accent } as React.CSSProperties}>
      <div
        className={`bs-win${aspect ? " bs-win--fit" : ""}`}
        style={aspect ? ({ "--bs-ar": aspect } as React.CSSProperties) : undefined}
      >
        <div className="bs-bar">
          <i />
          <i />
          <i />
          <span className="bs-url">
            <svg viewBox="0 0 12 12" aria-hidden>
              <path d="M3.5 5.5V4a2.5 2.5 0 015 0v1.5M3 5.5h6v4.5H3z" fill="none" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            <span>{url}</span>
          </span>
        </div>
        <div className={`bs-view${image ? " bs-view--pan" : ""}`}>
          {video ? (
            <video src={video} poster={poster} muted loop playsInline preload="metadata" disablePictureInPicture aria-hidden />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" draggable={false} decoding="async" />
          )}
        </div>
      </div>
    </div>
  );
}

/*
  A brand reel: an identity's real applications, one after another with a
  slow push-in, on the same lit dark room as the browser shots. Frames run
  on a fixed 12.5s cycle (2.5s each) so the CSS can stay one keyframe.
*/
export function Reel({ images, accent }: { images: string[]; accent: string }) {
  return (
    <div className="bs" style={{ "--bs-accent": accent, "--n": images.length } as React.CSSProperties}>
      <div className="bs-plate">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            decoding="async"
            style={{ animationDelay: `${i * 2.5 - 0.6}s` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export const DEMOS: Record<string, ComponentType> = {
  dpl: DplDemo,
  cat: CatDemo,
  pond: PondDemo,
  invoice: InvoiceDemo,
  contract: ContractDemo,
};

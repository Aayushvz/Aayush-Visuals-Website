"use client";

/*
  The "HI!!" collage panel, built to the supplied reference layout.

  Geometry note: the reference is a 1200x869 artboard, so this is built as a
  fixed-ratio canvas with `container-type: inline-size` and EVERY size and
  position expressed in cqw / %. One container query unit is 12px at the
  reference width, which means the whole composition scales as one locked
  image instead of reflowing — the only way a collage like this survives a
  resize with its overlaps intact. Below 900px it drops to a stacked mobile
  arrangement (see .collage--stack rules in globals.css).

  The decorative marks (flame, splat, starburst, squiggles, badge) are drawn
  here as original SVG rather than traced from the reference, which belongs
  to another designer. The composition, type hierarchy and rhythm follow the
  reference; the artwork inside it is this site's own.
*/

const BADGE_TEXT = "DESIGNER · DESIGN ENGINEER · ARTIST · ";

export default function CollagePanel() {
  return (
    <div className="collage">
      <div className="collage__canvas">
        {/* ---------- left cluster ---------- */}

        {/* flame mark, top left */}
        <svg className="collage__flame" viewBox="0 0 40 54" aria-hidden>
          <path
            d="M20 2c1.6 7.4-3.2 10.6-6.6 14.6C9.4 21.4 7 25.6 7 31c0 8.3 5.8 14 13 14s13-5.7 13-14c0-4.2-1.6-7.3-3.6-10.2-.7 2.4-2 3.9-3.6 4.6 1-6.6-2.2-12.6-5.8-16.2C19.4 8 19.8 5 20 2Z"
            fill="currentColor"
          />
          <text className="collage__flameNo" x="20" y="52" textAnchor="middle">
            1
          </text>
        </svg>

        {/* the signature */}
        <span className="collage__script">About Me</span>

        {/* pink plus marks + smile */}
        <svg className="collage__plus" viewBox="0 0 96 62" aria-hidden>
          <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
            <path d="M10 14v20M2 24h16M42 6v22M31 17h22" />
            <path d="M6 44c10 14 34 16 48 2" fill="none" strokeWidth="4.5" />
          </g>
        </svg>

        {/* rotating type badge */}
        <div className="collage__badge">
          <svg viewBox="0 0 200 200" aria-hidden>
            <defs>
              <path
                id="collageBadgePath"
                d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
              />
            </defs>
            <text className="collage__badgeText">
              <textPath href="#collageBadgePath" startOffset="0%">
                {BADGE_TEXT}
              </textPath>
            </text>
          </svg>
          {/* pink scrawl sitting inside the ring */}
          <svg className="collage__scrawl" viewBox="0 0 70 46" aria-hidden>
            <path
              d="M6 30c8-16 14-16 20 0 5 13 11 13 17 0M4 16c14-8 30-8 46 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ---------- the photograph ---------- */}
        <figure className="collage__polaroid">
          <div className="collage__photoWrap">
            <img
              src="/about/collage-portrait.webp"
              alt="Aayush Raj, product designer and design engineer"
              className="collage__photo"
              width="800"
              height="859"
            />
          </div>
          <figcaption className="collage__caption">
            <span className="collage__captionA">4+ YEARS</span>
            <span className="collage__captionB">
              BASED IN:
              <br />
              INDIA
            </span>
          </figcaption>
        </figure>

        {/* ink splat, overlapping the photo's top right */}
        <svg className="collage__splat" viewBox="0 0 150 180" aria-hidden>
          <path
            d="M74 10c26-6 46 8 52 30 5 19-4 34-18 43 12 9 16 24 9 37-9 17-32 22-50 13-16-8-22-25-17-40-14 2-27-6-32-19-6-16 2-33 18-40 4-14 17-22 38-24Z"
            className="collage__splatBody"
            strokeWidth="3.5"
          />
          <g className="collage__splatInk" strokeWidth="3.5" strokeLinecap="round">
            <path d="M42 62 108 34M108 62 42 34" />
          </g>
          <circle cx="60" cy="112" r="4" className="collage__splatDot" />
          <circle cx="92" cy="126" r="4" className="collage__splatDot" />
          <circle cx="74" cy="146" r="4" className="collage__splatDot" />
        </svg>

        {/* starburst */}
        <svg className="collage__burst" viewBox="0 0 100 100" aria-hidden>
          <path
            d="M50 0 60 32 88 14 72 44l28 6-28 6 16 30-28-18-10 32-10-32-28 18 16-30-28-6 28-6L2 14l28 18Z"
            className="collage__burstBody"
            strokeWidth="3"
          />
        </svg>

        {/* the big pink gesture */}
        <svg className="collage__gesture" viewBox="0 0 220 250" aria-hidden>
          <path
            d="M32 8c-6 46 2 92 14 120 6 14 16 12 18-4 3-22-2-52 2-72 3-14 14-14 18 2 5 20 4 54 10 74 5 16 16 14 20-2 5-20 8-52 14-70M96 210c-24 30-58 34-76 18-14-13-8-34 12-38 24-5 44 12 52 34 6 16-2 26-14 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* ---------- right column ---------- */}
        <div className="collage__copy">
          <h2 className="collage__hi">HI!!</h2>

          <p className="collage__lede">
            My name is Aayush Raj, I&apos;m a product designer / design
            engineer / artist based in India.
          </p>

          <p className="collage__para">
            <span className="collage__lead">Ever since</span> I can remember
            I&apos;ve been pulled toward how things are made, from a first
            rough wireframe to the last hover state in the browser.
          </p>

          <p className="collage__para">
            <span className="collage__lead">I live to</span> design products
            end to end, and to build the systems that keep them coherent long
            after I hand them over.
          </p>
        </div>

        {/* corner bracket, bottom right */}
        <span className="collage__bracket" aria-hidden />

        {/* ---------- footer block ---------- */}
        <div className="collage__mark" aria-hidden>
          <svg viewBox="0 0 34 30">
            <path
              d="M2 28 17 2l15 26-8 0-7-12-7 12Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>
          <span className="collage__wordmark">
            AAYUSH
            <br />
            RAJ
          </span>
        </div>

        <div className="collage__contact">
          <a className="collage__pill" href="mailto:aayushvisuals@gmail.com">
            aayushvisuals@gmail.com
          </a>
          <span className="collage__ast" aria-hidden>
            &#10037;
          </span>
          <a
            className="collage__pill"
            href="https://www.linkedin.com/in/aayushvz"
            target="_blank"
            rel="noreferrer"
          >
            linkedin.com/in/aayushvz
          </a>
          <span className="collage__ast" aria-hidden>
            &#10037;
          </span>
          <a
            className="collage__pill"
            href="https://www.behance.net/AAYUSHVISUALS"
            target="_blank"
            rel="noreferrer"
          >
            behance.net/aayushvisuals
          </a>
        </div>
      </div>
    </div>
  );
}

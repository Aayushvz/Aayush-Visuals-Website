import { PixelWebHero } from "./doodles";

export default function Footer() {
  return (
    <footer className="footer dotsInk" id="contact">
      <div className="footer__glow" aria-hidden />
      <div className="railsLight" aria-hidden>
        <span className="railsLight__line railsLight__line--left" />
        <span className="railsLight__line railsLight__line--right" />
      </div>
      <div className="footer__hero">
        <div className="display footer__watermark" aria-hidden>
          Aayush
          <br />
          Visuals
        </div>
        <PixelWebHero className="footer__dude" />
      </div>
      <div className="footer__rule" />
      <div className="footer__cta">
        <div>
          <p className="footer__lead">Got an idea?</p>
          <p className="display footer__big">
            Let&rsquo;s build it
            <br />
            together
          </p>
        </div>
        <div className="footer__reach">
          <span>Reach out</span>
          <div className="footer__icons">
            <a
              href="https://www.behance.net/AAYUSHVISUALS"
              target="_blank"
              rel="noreferrer"
              aria-label="Behance"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 7h7a3 3 0 0 1 0 6H3zM3 13h7.5a3.2 3.2 0 0 1 0 6.4H3z" />
                <path d="M15.5 9.5h6M14.5 16a3.5 3.5 0 0 0 6.9.7 3.5 3.5 0 0 0-3.4-4.2c-2 0-3.5 1.6-3.5 3.5Z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/aayushvisuals"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/aayushvisuals"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="9" width="4" height="12" />
                <circle cx="5" cy="4.5" r="2" />
                <path d="M11 21v-7a3.5 3.5 0 0 1 7 0v7M11 12.5v-1.5" />
              </svg>
            </a>
            <a href="mailto:aayushvisuals@gmail.com" aria-label="Email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="footer__base">
        <span>
          Designed by <strong>Aayush Raj</strong>
        </span>
        <span>
          Built with <strong>Claude Code</strong>
        </span>
      </div>
    </footer>
  );
}

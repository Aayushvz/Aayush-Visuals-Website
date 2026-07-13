import { PixelDude } from "./doodles";

export default function Footer() {
  return (
    <footer className="footer dotsInk" id="contact">
      <div className="footer__hero">
        <div className="display footer__watermark" aria-hidden>
          Aayush
          <br />
          Visuals
        </div>
        <PixelDude className="footer__dude" />
      </div>
      <div className="footer__rule" />
      <div className="footer__cta">
        <div>
          <p className="footer__lead">Let&rsquo;s build something</p>
          <p className="display footer__big">
            Bold and
            <br />
            memorable
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
              Bē
            </a>
            <a
              href="https://www.instagram.com/aayushvisuals"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              ◎
            </a>
            <a href="mailto:aayush.visuals@gmail.com" aria-label="Email">
              @
            </a>
          </div>
        </div>
      </div>
      <div className="footer__base">
        <span>
          Designed by <strong>Aayush Raj</strong>
        </span>
        <span>
          Created with <strong>Claude Code</strong>
        </span>
      </div>
    </footer>
  );
}

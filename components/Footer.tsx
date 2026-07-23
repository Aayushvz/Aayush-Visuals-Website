import { PixelWebHero } from "./doodles";
import PageLink from "./PageLink";

export default function Footer() {
  return (
    <footer className="footer dotsInk">
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
          <PageLink href="/contact" className="footer__contactCta">
            Get in touch
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </PageLink>
          <div className="footer__icons">
            <a
              href="https://www.behance.net/AAYUSHVISUALS"
              target="_blank"
              rel="noreferrer"
              aria-label="Behance"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8.2 8.6c.5 0 1 0 1.4.1.4.1.8.2 1.1.5.3.2.6.5.7.9.2.4.3.8.3 1.3 0 .6-.1 1-.4 1.4-.3.4-.7.7-1.2.9.7.2 1.2.5 1.6 1 .3.5.5 1.1.5 1.8 0 .6-.1 1-.3 1.5-.2.4-.6.7-.9 1-.4.3-.9.5-1.4.6-.5.1-1 .2-1.5.2H2V8.6h6.2zm-.4 4.2c.4 0 .8-.1 1-.3.3-.2.4-.5.4-1s-.1-.7-.2-.9c-.2-.2-.4-.3-.6-.4-.2-.1-.5-.1-.8-.1H5v2.7h2.8zm.2 4.5c.3 0 .5 0 .8-.1.2 0 .5-.1.7-.3.2-.1.3-.3.5-.5.1-.2.2-.5.2-.8 0-.6-.2-1-.5-1.3-.4-.2-.8-.4-1.4-.4H5v3.4h3.2zM16.6 16.8c.3.3.8.5 1.5.5.5 0 .9-.1 1.2-.4.3-.2.5-.5.6-.7h2.1c-.3 1-.9 1.8-1.6 2.2-.7.5-1.6.7-2.6.7-.7 0-1.4-.1-1.9-.3-.6-.2-1-.5-1.5-1-.4-.4-.7-.9-.9-1.5-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9c.2-.6.5-1.1 1-1.5.4-.4.9-.7 1.4-1 .6-.2 1.2-.3 1.9-.3.8 0 1.4.1 2 .4.6.3 1 .7 1.4 1.2.4.5.6 1 .8 1.7.1.6.2 1.3.1 2h-6.4c0 .7.3 1.3.6 1.6zM19 12.4c-.3-.3-.7-.4-1.3-.4-.4 0-.7.1-1 .2-.2.1-.4.3-.6.5-.1.2-.2.4-.3.6 0 .2-.1.4-.1.5h3.9c-.1-.7-.3-1.2-.6-1.5zM15 8.9h5v1.2h-5z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/aayush.visuals"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1C2.6 9.5 2.6 9.9 2.6 12s0 2.5.1 3.3c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.3-.4-.4-.8-.6-1.3-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.3-8.3a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/aayushvz"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6.94 5.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM3.25 8.98h3.4V21h-3.4V8.98zM9.1 8.98h3.26v1.64h.05c.45-.86 1.56-1.77 3.22-1.77 3.44 0 4.08 2.27 4.08 5.22V21h-3.4v-5.34c0-1.27-.02-2.9-1.77-2.9-1.77 0-2.04 1.38-2.04 2.81V21H9.1V8.98z" />
              </svg>
            </a>
            <a href="mailto:aayushvisuals@gmail.com" aria-label="Email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m3.5 7 8.5 6 8.5-6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="footer__base">
        <span>
          Designed by <strong>Aayush Raj</strong>
        </span>
      </div>
    </footer>
  );
}

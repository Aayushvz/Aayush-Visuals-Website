/*
  Single source of truth for everything SEO touches: canonical URLs, the
  sitemap, robots, JSON-LD and the absolute OG image URL.

  >>> SITE_URL must match the live domain exactly, including https and with
  >>> no trailing slash. A canonical tag pointing at a domain you don't serve
  >>> actively suppresses the real one in search results, so this is the one
  >>> value worth double-checking before deploying.
*/
export const SITE_URL = "https://aayushvisuals.com";

export const PERSON_NAME = "Aayush Raj";
export const BRAND_NAME = "Aayush Visuals";
export const ROLE = "Product Designer & Design Engineer";

export const DEFAULT_TITLE = `${PERSON_NAME} - ${ROLE}`;

export const DEFAULT_DESCRIPTION =
  "Aayush Raj (Aayush Visuals) is a product designer and design engineer in India, crafting digital products, brand identity, UI/UX and motion for real launches.";

/* Profiles Google uses to confirm this site and the person behind it are the
   same entity (schema.org sameAs). Keep in sync with Footer.tsx / the contact
   page — the more of these that link back here, the stronger the signal. */
export const SOCIAL_PROFILES = [
  "https://www.behance.net/AAYUSHVISUALS",
  "https://www.instagram.com/aayush.visuals",
  "https://www.linkedin.com/in/aayushvz",
  "https://github.com/Aayushvz",
];

export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: `Aayush Visuals — Designing Interfaces, Shaping Brands. ${PERSON_NAME}, ${ROLE}.`,
};

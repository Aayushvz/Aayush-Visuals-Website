import type { Metadata, Viewport } from "next";
import {
  Archivo,
  Instrument_Serif,
  Cinzel_Decorative,
  Cinzel,
  Inter,
  Caveat,
  Permanent_Marker,
  Grenze_Gotisch,
} from "next/font/google";
import localFont from "next/font/local";
import Preloader from "@/components/Preloader";
import PromoManager from "@/components/PromoManager";
import { buildPromos } from "@/components/promos";
import PageTransition from "@/components/PageTransition";
import AnimationBudget from "@/components/AnimationBudget";
import ScrollRestore from "@/components/ScrollRestore";
import {
  SITE_URL,
  PERSON_NAME,
  BRAND_NAME,
  ROLE,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  SOCIAL_PROFILES,
  OG_IMAGE,
} from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const cinzelDec = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel-dec",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

/*
  The three faces below exist only for the About page's collage panel, which
  is built on a typographic contrast the rest of the site doesn't use: a thin
  flowing pen, a fat marker, and a modern gothic. They are deliberately
  scoped to `.collage` in globals.css — none of them belong anywhere else.

  Caveat is the thin pen (the "About Me" signature). Permanent Marker is the
  fat marker used for the annotations written across the photo. Grenze
  Gotisch is the gothic display that leads each paragraph. Pen vs marker is a
  real contrast axis, not two lookalike handwriting fonts.
*/
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-caveat",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
  display: "swap",
});

const grenzeGotisch = Grenze_Gotisch({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-gothic",
  display: "swap",
});

// Figma's own UI typeface — scoped to the Figma-styled project-page chrome
// (tab bar, panels, dock) only; the rest of the site keeps its own fonts.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// General Sans self-hosted (was a render-blocking fontshare.com <link>).
// next/font inlines the @font-face, preloads the files, and adds a size-
// adjusted fallback so there's no layout shift or third-party round-trip.
const generalSans = localFont({
  variable: "--font-general",
  display: "swap",
  /* it is the fallback behind Aeonik now, not the interface face, so it is no
     longer worth a preload on every page - it loads only if a glyph Aeonik
     lacks actually appears. It stays registered because it is also an option
     in the contract tool's own font picker. */
  preload: false,
  fallback: ["system-ui", "sans-serif"],
  src: [
    { path: "../public/fonts/GeneralSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/GeneralSans-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/GeneralSans-Bold.woff2", weight: "700", style: "normal" },
  ],
});

/*
  Aeonik, the site's interface typeface.

  This is the full cut, converted from the supplied TTFs to WOFF2 (692KB ->
  177KB across the five weights kept). It replaces a trial cut that carried 66
  glyphs; this one carries 471, which is every character the site was falling
  back on except the decorative diamond and Devanagari.

  WEIGHTS ARE DECLARED TRUTHFULLY, AND 600 IS THE INTERESTING ONE. It is the
  most-used weight on the site - 76 rules - and Aeonik has no Semibold, so
  CSS font matching resolves it upward to Bold. That is not a compromise here:
  measured as normalised ink area over "Handgloves", Aeonik Bold is 1.795
  against General Sans Semibold's 1.825, a 1.6% difference, where Aeonik
  Medium is 20% lighter. The default behaviour lands on the right face, so
  there is no weight-range hack and there should not be one.

  Two weights DO shift, because the two families distribute weight
  differently and that is what changing typeface means:
    400  Aeonik Regular is ~18% heavier ink than General Sans Regular
    700  Aeonik Bold is ~18% lighter ink than General Sans Bold
  800 resolves up to Black, which lands within 3.5% of what it used to get.

  No italics: the only italic on the site is Instrument Serif in the hero
  lockup, so shipping Aeonik's would be 73KB nothing asks for.
*/
const aeonik = localFont({
  variable: "--font-aeonik",
  display: "swap",
  fallback: ["General Sans", "system-ui", "sans-serif"],
  src: [
    { path: "../public/fonts/aeonik/aeonik-light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/aeonik/aeonik-regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/aeonik/aeonik-medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/aeonik/aeonik-bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/aeonik/aeonik-black.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  /* metadataBase is what turns every relative image/canonical path below into
     the absolute URL that crawlers and link unfurlers require. Without it
     og:image silently ships as "/og.png", which no scraper can fetch. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    /* every child page sets a bare title and inherits this suffix, so the
       name is present in every search result headline */
    template: `%s - ${PERSON_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: BRAND_NAME,
  authors: [{ name: PERSON_NAME, url: SITE_URL }],
  creator: PERSON_NAME,
  publisher: PERSON_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BRAND_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_IN",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/*
  The CSS in globals.css already locks this, but the stylesheet is not the
  first thing the browser makes a decision with: Chrome's auto dark theme
  and Samsung Internet's dark mode look for a colour scheme as the document
  head arrives. Declaring it here puts it in the markup ahead of the CSS, so
  there is no window where the page still looks like a pre-dark-mode site
  and gets inverted for it. `only` is what forbids that override; the
  surfaces we paint dark re-declare their own in CSS.
*/
export const viewport: Viewport = {
  colorScheme: "only light",
};

/*
  Structured data is the highest-leverage piece for ranking on a person's
  name: it states outright that this site, "Aayush Raj" and "Aayush Visuals"
  are one entity, and sameAs corroborates that against profiles Google
  already trusts. alternateName carries the spelling variants people
  actually type ("Ayush Visuals", "Ayush Raj") without stuffing them into
  visible copy.
*/
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: PERSON_NAME,
      alternateName: ["Aayush", "Ayush Raj", "Aayush Visuals", "Ayush Visuals"],
      url: SITE_URL,
      image: `${SITE_URL}${OG_IMAGE.url}`,
      jobTitle: ROLE,
      description: DEFAULT_DESCRIPTION,
      address: { "@type": "PostalAddress", addressCountry: "IN" },
      sameAs: SOCIAL_PROFILES,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: BRAND_NAME,
      alternateName: ["Ayush Visuals", "Aayush Raj Portfolio"],
      description: DEFAULT_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

/*
  One thing before the first paint, and it is no longer the theme.

  This script used to resolve a stored light/dark preference, and project
  pages used to open on their own side of it. Both are gone: there is a
  single palette now, so there is nothing to resolve and nothing that could
  flash the wrong way.

  What is left is /cricket. CricketExperience adds `dpl-page` on mount, but
  on a cold load of that route "on mount" is after hydration, and everything
  the class is there to suppress - the cream body under a dark full-bleed
  scene, the root preloader - is on screen for that whole window. Setting it
  here makes the class true from the first byte; the component's copy is
  then a no-op, and its cleanup still takes the class off if you navigate
  away.
*/
const prePaint = `(function(){if(location.pathname.indexOf("/cricket")===0){document.documentElement.classList.add("dpl-page");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${generalSans.variable} ${aeonik.variable} ${archivo.variable} ${instrumentSerif.variable} ${cinzelDec.variable} ${cinzel.variable} ${inter.variable} ${caveat.variable} ${permanentMarker.variable} ${grenzeGotisch.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/*
          [data-reveal] elements sit at opacity:0 until Reveals' observer adds
          .revealed. With scripting off that class never lands and the content
          is simply invisible — a scroll animation must never be the thing
          deciding whether copy exists. The About page leans on it heavily.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Preloader />
        {/* the notification cards: which one, and when, is decided per page */}
        <PromoManager promos={buildPromos()} />
        <PageTransition />
        <AnimationBudget />
        <ScrollRestore />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
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
import PageTransition from "@/components/PageTransition";
import AnimationBudget from "@/components/AnimationBudget";
import ScrollRestore from "@/components/ScrollRestore";
import { DARK_CASE_STUDIES } from "@/components/projects/projectData";
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
  fallback: ["system-ui", "sans-serif"],
  src: [
    { path: "../public/fonts/GeneralSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/GeneralSans-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/GeneralSans-Bold.woff2", weight: "700", style: "normal" },
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
  Runs before first paint so the theme never flashes.

  The site is dark by default and does not ask the OS. It used to: anyone
  arriving from a light-set machine landed on a light homepage, which is not
  the site as designed. A stored choice still wins here — the header toggle
  would mean nothing otherwise — but absent one, dark is the answer.

  A project page is the exception and opens on its OWN side of the switch,
  stored choice or not: most of those pages are screenshots of light
  interfaces, and a dark canvas around them fights the thing they exist to
  present. Projects designed dark say so with `theme: "dark"` and arrive in
  DARK_CASE_STUDIES, which is inlined here as a literal — this script runs
  before React and cannot import anything, and a theme resolved after
  hydration is a white flash on a black page rather than a preference.

  Note the trailing slash — this catches /work/<project> and deliberately
  not the /work index, which is a listing and stays dark with everything
  else. The dock's toggle still works once you are there; this sets where a
  page starts, not where it has to stay.

  The same script marks /cricket before first paint. CricketExperience adds
  `dpl-page` on mount for the client-side case, but on a cold load of that
  route "on mount" is after hydration, and everything the class is there to
  suppress — the cream body under a dark full-bleed scene, the root
  preloader — is on screen for that whole window. Setting it here makes the
  class true from the first byte; the component's copy is then a no-op, and
  its cleanup still takes the class off if you navigate away.
*/
const themeInit = `(function(){var d=document.documentElement,path=location.pathname,p=path.indexOf("/work/")===0;if(path.indexOf("/cricket")===0){d.classList.add("dpl-page");}var dark=${JSON.stringify(
  DARK_CASE_STUDIES
)},proj=p?path.slice(6).replace(/\\/$/,""):"",pt=dark.indexOf(proj)>=0?"dark":"light";try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="dark";}d.dataset.theme=p?pt:t;}catch(e){d.dataset.theme=p?pt:"dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${generalSans.variable} ${archivo.variable} ${instrumentSerif.variable} ${cinzelDec.variable} ${cinzel.variable} ${inter.variable} ${caveat.variable} ${permanentMarker.variable} ${grenzeGotisch.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          The hero's collage is served from Framer's CDN, and one of those
          images is the page's Largest Contentful Paint. Without this the
          browser cannot even start that request until it has done a DNS
          lookup and a TLS handshake against a cold third-party origin, and
          LCP waits for all of it. Warming the connection costs one line.
        */}
        <link rel="preconnect" href="https://framerusercontent.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://framerusercontent.com" />
      </head>
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
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Preloader />
        <PageTransition />
        <AnimationBudget />
        <ScrollRestore />
        {children}
      </body>
    </html>
  );
}

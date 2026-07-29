import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Cinzel_Decorative, Cinzel, Inter } from "next/font/google";
import localFont from "next/font/local";
import Preloader from "@/components/Preloader";
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

const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${generalSans.variable} ${archivo.variable} ${instrumentSerif.variable} ${cinzelDec.variable} ${cinzel.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
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

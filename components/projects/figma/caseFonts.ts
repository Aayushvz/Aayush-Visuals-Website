/*
  Faces a case study needs in order to SET a specimen, rather than describe
  one.

  A typography section that renders "Body — IBM Plex Sans" in the portfolio's
  own Archivo is not showing you a decision, it is claiming one. These three
  are loaded so the `typeset` block can set each sample in the face it is
  talking about, and the reader can judge the pairing the way the pairing was
  judged.

  `preload: false` on all three, deliberately. next/font would otherwise emit
  a preload hint on every page that imports this module — and that is every
  case study, because they all share one renderer — to fetch faces that only
  one project's page ever puts on screen. Without the hint the @font-face
  rules still ship (a few hundred bytes in the shared CSS) but the actual
  files are only fetched when something renders in them, which is exactly the
  behaviour wanted: Mike Tyson's page pays, CPGRAMS does not.

  The fourth face in that project, Legend, is not here. It is a free display
  face off Behance rather than a Google font, and there is no webfont to
  load — its specimen is an image, which is also the honest way to show a
  headline face that the site itself does not have.
*/
import { Boldonse, Chakra_Petch, IBM_Plex_Sans, Oxanium } from "next/font/google";

/*
  Boldonse is a display face and one of the three headline candidates. It is
  the only one of the three the web can actually load — Legend and
  OneTwoHours ship as vector outlines exported from the design file, because
  neither has a webfont and a specimen set in a substitute face is not a
  specimen, it is a lie about what was tested.
*/
export const boldonse = Boldonse({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-boldonse",
  display: "swap",
  preload: false,
});

export const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
  preload: false,
});

export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
  preload: false,
});

export const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-oxanium",
  display: "swap",
  preload: false,
});

/** every specimen face, for the wrapper that scopes them to the body */
export const caseFontVars = `${chakraPetch.variable} ${ibmPlexSans.variable} ${oxanium.variable} ${boldonse.variable}`;

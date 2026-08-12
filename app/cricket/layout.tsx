import { Anton, Bungee } from "next/font/google";
import localFont from "next/font/local";

/*
  Three display faces loaded for this route only, not in the root layout,
  so the rest of the site never pays for them.

  Anton is the sports-poster condensed: it carries a scoreboard at any size
  and stays readable when the number is 60px tall. Bungee is the signage
  face, used only for the shouts (SIX, FOUR, OUT) where the job is to be
  loud for one second. Neither belongs anywhere else on the site.

  Gimora is the geometric display face, and it is scoped deliberately
  narrowly: headings and the things you press, nothing else. In particular
  every NUMBER in the game stays on Anton. The scoreboard, the XP counters
  and the stat cells all rely on `font-variant-numeric: tabular-nums` to
  stop digits jittering as they count, and swapping a condensed face with
  tabular figures for a wide geometric one would both break that alignment
  and blow out the width of a three-digit score.

  LICENCE: this is the DEMO cut, which its foundry (Say Studio) releases
  for personal use only — a commercial licence has to be bought from
  sayfont.com before this is used on anything that sells work.
*/
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--ckt-display",
});

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--ckt-shout",
});

/*
  The DEMO release ships one cut, Regular, and `weight` says so rather than
  claiming 700. Declaring a weight the file does not contain is what makes
  a browser synthesise a fake bold — it smears the glyphs horizontally, and
  on a geometric face with even stroke widths that is immediately obvious.
  The face is heavy enough at Regular to carry a heading on its own; the
  selectors that use it drop their font-weight accordingly.
*/
const gimora = localFont({
  src: "../../public/fonts/GimoraDEMO-Regular.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--ckt-title",
  /* Anton, not Arial: if Gimora is slow or blocked the headings should
     fall back to the game's own display face rather than to a system UI
     font that belongs to a different design entirely */
  adjustFontFallback: false,
  fallback: ["Anton", "Impact", "sans-serif"],
});

export default function CricketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${anton.variable} ${bungee.variable} ${gimora.variable}`}>
      {children}
    </div>
  );
}

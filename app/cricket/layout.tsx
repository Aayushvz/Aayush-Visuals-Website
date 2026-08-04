import { Anton, Bungee } from "next/font/google";

/*
  Two display faces loaded for this route only, not in the root layout, so
  the rest of the site never pays for them.

  Anton is the sports-poster condensed: it carries a scoreboard at any size
  and stays readable when the number is 60px tall. Bungee is the signage
  face, used only for the shouts (SIX, FOUR, OUT) where the job is to be
  loud for one second. Neither belongs anywhere else on the site.
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

export default function CricketLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${anton.variable} ${bungee.variable}`}>{children}</div>;
}

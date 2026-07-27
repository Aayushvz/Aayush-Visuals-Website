/*
  Remounts on every route navigation, letting the incoming page's <main>
  play its entrance (globals.css .pageEnter main). Fixed chrome stays put
  — only content travels. The outgoing/incoming visual transition itself
  is handled by PageTransition.tsx, which fully covers the screen before
  this remount ever becomes visible.
*/
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="pageEnter">{children}</div>;
}

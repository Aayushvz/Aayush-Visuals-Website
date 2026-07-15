"use client";

import { useEffect } from "react";

/*
  Remounts on every route navigation: clears the leave state set by
  PageLink and lets the incoming page's <main> play its entrance
  (globals.css .pageEnter main). Fixed chrome stays put — only content
  travels.
*/
export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("page-leaving");
  }, []);

  return <div className="pageEnter">{children}</div>;
}

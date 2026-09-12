"use client";

import { useEffect } from "react";
import ErrorScene from "@/components/error/ErrorScene";
import "./globals.css";

/*
  The last boundary: the root layout itself threw.

  This file REPLACES the root layout when it is active, so nothing from it
  is available. No fonts (next/font puts its variables on the layout's own
  elements, so the scene falls through to its system stack), no theme
  script, no nav. globals.css is imported here rather than inherited because
  every --hero-* token the scene is built from lives in it, and without them
  this page would render unstyled at the exact moment the site can least
  afford to look broken.

  Metadata exports are not supported in a client boundary, so the title is a
  plain React <title>, which React 19 hoists into the head.
*/
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[root] layout failed", error.digest ?? "", error);
  }, [error]);

  return (
    /* global-error has to bring its own document */
    <html lang="en">
      <body>
        <title>Something broke - Aayush Raj</title>
        <ErrorScene kind="error" onRetry={unstable_retry} />
      </body>
    </html>
  );
}

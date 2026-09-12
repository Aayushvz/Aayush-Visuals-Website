"use client";

import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import ErrorScene from "@/components/error/ErrorScene";

/*
  Anything that throws while rendering a page.

  `unstable_retry` rather than `reset`: this version of Next prefers it, and
  the difference matters here. `reset` re-renders the boundary's children
  with whatever it already has, which for a failure caused by a request that
  did not come back just fails again. `unstable_retry` re-fetches first,
  which is the thing that actually recovers a page whose data never arrived.

  Note what this cannot catch: the root layout. That is global-error.tsx.
*/
export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    /* the digest is the only handle on a server-side failure, since the
       message itself is scrubbed in production */
    console.error("[case] render failed", error.digest ?? "", error);
  }, [error]);

  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />
      <ErrorScene kind="error" onRetry={unstable_retry} />
    </>
  );
}

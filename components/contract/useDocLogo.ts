"use client";

import { useCallback, useEffect, useState } from "react";

/*
  The logo's own hook, on its own key (cg-logo), separate again from
  both cg-draft and cg-style - see useDocStyle.ts for the shared
  reasoning and the doc-style.md report for the numbers. This one is by
  far the largest thing this route stores and the most likely to hit
  quota, even after logo.ts's downscaling, so unlike the other two
  hooks it surfaces a write failure to its caller instead of only
  swallowing it: a silent failure here would look like "the logo didn't
  save" with no explanation, right after the user picked one.

  Same hydration contract as useContractDraft/useDocStyle: adopt the
  stored value in an effect so server and first client paint agree.
*/

const KEY = "cg-logo";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function useDocLogo() {
  const [logo, setLogoState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLogoState(readStored());
    setHydrated(true);
  }, []);

  /* logo.ts already downscales to comfortably under 200KB before this
     ever runs, so a quota failure here means storage was already
     nearly full from something else (most likely the draft, sharing
     the origin's ~5MB budget). The logo still renders for the rest of
     this session from React state; it just will not survive a reload,
     which is what the returned error explains. */
  const setLogo = useCallback((dataUrl: string | null) => {
    setLogoState(dataUrl);
    setError(null);
    try {
      if (dataUrl) window.localStorage.setItem(KEY, dataUrl);
      else window.localStorage.removeItem(KEY);
    } catch (e) {
      setError(
        isQuotaError(e)
          ? "That image was too large to save. It will show for this session but won't survive a reload - try a smaller file."
          : "Could not save the logo (storage is unavailable). It will still show for this session.",
      );
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { logo, setLogo, hydrated, error, clearError };
}

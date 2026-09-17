"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Draft, Toggles } from "./types";
import { DEFAULT_DRAFT, completion } from "./schema";

/*
  Draft state, and the only thing on this route that persists.

  The theme deliberately does not persist (a visitor must never be stuck
  on a look they cannot get back from), but the form does: thirteen
  sections is long enough that losing it to an accidental refresh is
  painful, and what is stored is data the user typed. `Reset all` is the
  unconditional way out.

  Every storage call is wrapped. A private window, blocked site data or
  a draft written by an older shape of this form all degrade to a
  working, unsaved tool rather than a crash.
*/

const KEY = "cg-draft";
const SAVE_DEBOUNCE = 400;

function readStored(): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || typeof parsed !== "object") return null;
    /* merge over the defaults rather than trusting the stored shape, so
       a field added after this draft was written is simply present */
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      deliverables: Array.isArray(parsed.deliverables)
        ? parsed.deliverables
        : DEFAULT_DRAFT.deliverables,
      toggles: { ...DEFAULT_DRAFT.toggles, ...(parsed.toggles ?? {}) },
    };
  } catch {
    return null;
  }
}

export function useContractDraft() {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  /* hydration: the server render must match the client's first paint, so
     the stored draft is adopted in an effect rather than in useState */
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = readStored();
    if (stored) setDraft(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(draft));
      } catch {
        /* quota, private mode, blocked storage: the tool still works */
      }
    }, SAVE_DEBOUNCE);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, hydrated]);

  const setField = useCallback(<K extends keyof Draft>(name: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [name]: value }));
  }, []);

  const setToggle = useCallback((name: keyof Toggles, value: boolean) => {
    setDraft((d) => ({ ...d, toggles: { ...d.toggles, [name]: value } }));
  }, []);

  const setDeliverables = useCallback((items: string[]) => {
    setDraft((d) => ({ ...d, deliverables: items }));
  }, []);

  const reset = useCallback(() => {
    setDraft(DEFAULT_DRAFT);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* nothing to clean up if it was never written */
    }
  }, []);

  const pct = useMemo(() => completion(draft), [draft]);

  return { draft, setField, setToggle, setDeliverables, reset, pct, hydrated };
}

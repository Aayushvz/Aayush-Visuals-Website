"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DocStyle } from "./types";

/*
  Document styling state: colours and fonts, modelled closely on
  useContractDraft.ts (same hydration effect, same try/catch around
  every storage call, same merge-over-defaults on read) but kept on its
  own localStorage key rather than folded into Draft, for two reasons.

  First, Draft's exact shape is asserted by the clause and renderer
  tests (clauses.test.ts, render-html.test.ts, render-md.test.ts, and
  schema.test.ts's own DEFAULT_DRAFT checks); mixing paint choices into
  it would put a styling change one storage merge away from touching
  what those tests pin down. Second, a storage failure on one key
  (quota, a value some other tab wrote in a shape this version does not
  expect) cannot take the other down: a corrupt cg-style blob still
  leaves cg-draft - the user's actual form data - readable, and a
  corrupt cg-draft still leaves the user's colour and font choices
  readable. The logo (see useDocLogo.ts) gets a third key for the same
  reason, and because it is by far the largest thing being stored.
*/

const KEY = "cg-style";
const SAVE_DEBOUNCE = 400;

/* "" everywhere: see the DocStyle comment in types.ts. There is no
   colour or font baked in here, because a baked-in default would
   always win over the active skin, which is backwards from what Task 3
   asks for (skin sets the default, an explicit pick overrides it). */
export const DEFAULT_DOC_STYLE: DocStyle = {
  accent: "",
  heading: "",
  background: "",
  text: "",
  titleFont: "",
  headingFont: "",
  bodyFont: "",
};

function readStored(): DocStyle | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DocStyle>;
    if (!parsed || typeof parsed !== "object") return null;
    /* merge over the defaults rather than trusting the stored shape, so
       a field added after this was written (or one an older build never
       knew about) is simply "" rather than crashing the route */
    return { ...DEFAULT_DOC_STYLE, ...parsed };
  } catch {
    return null;
  }
}

export function useDocStyle() {
  const [style, setStyleState] = useState<DocStyle>(DEFAULT_DOC_STYLE);
  /* same reason as useContractDraft: server render and client first
     paint must agree, so the stored value is adopted in an effect
     rather than read straight into useState */
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = readStored();
    if (stored) setStyleState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(style));
      } catch {
        /* quota, private mode, blocked storage: styling stays live for
           this session, cg-draft is untouched either way */
      }
    }, SAVE_DEBOUNCE);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [style, hydrated]);

  const setStyleField = useCallback(<K extends keyof DocStyle>(name: K, value: DocStyle[K]) => {
    setStyleState((s) => ({ ...s, [name]: value }));
  }, []);

  const resetStyle = useCallback(() => {
    setStyleState(DEFAULT_DOC_STYLE);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* nothing to clean up if it was never written */
    }
  }, []);

  return { style, setStyleField, resetStyle, hydrated };
}

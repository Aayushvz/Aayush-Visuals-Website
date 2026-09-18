"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Overrides } from "./types";

/*
  Hand-typed prose, on its own localStorage key (cg-overrides), never
  folded into cg-draft or cg-style. Modelled closely on
  useContractDraft.ts and useDocStyle.ts: same hydration effect (adopt
  the stored value in an effect so server and client first paint agree),
  same try/catch around every storage call, same merge-over-defaults on
  read so an older stored shape cannot crash the route.

  The separate key matters more here than it does for style or logo.
  cg-draft's shape is pinned by clauses.test.ts, render-html.test.ts,
  render-md.test.ts and schema.test.ts, so it is the storage key most
  likely to be touched by an unrelated future change; cg-logo is the
  key most likely to hit quota, being by far the largest thing this
  route stores. Either failing must never take a hand-typed paragraph
  down with it - prose a user typed by hand is the single most
  expensive thing on this route to lose, since everything else is a
  pick from a fixed list or a short field a user can retype in seconds.
*/

const KEY = "cg-overrides";
const SAVE_DEBOUNCE = 400;

/* Pure and exported so it is unit-testable without touching
   localStorage or window at all (see useOverrides.test.ts): turns
   whatever JSON.parse could have handed back - an older shape, a
   hand-edited blob, garbage - into a well-formed Overrides object
   rather than trusting it and letting a bad shape reach clauses.ts's
   own indexing (buildClauses/withOverrides index straight into this
   object with clause ids and numeric keys, with nothing else validating
   it first). Anything that is not a plain object collapses to {}; any
   per-clause entry that is not a plain object is dropped; any per-block
   key that is not an integer, or whose value is not a string, is
   dropped. Non-integer keys matter because listItemOverrideKey (see
   clauses.ts) produces negative integers, not just small positive
   ones - Number.isInteger accepts both. */
export function normalizeOverrides(raw: unknown): Overrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Overrides = {};
  for (const [clauseId, forClause] of Object.entries(raw as Record<string, unknown>)) {
    if (!forClause || typeof forClause !== "object" || Array.isArray(forClause)) continue;
    const entries: Record<number, string> = {};
    for (const [key, text] of Object.entries(forClause as Record<string, unknown>)) {
      const n = Number(key);
      if (!Number.isInteger(n) || typeof text !== "string") continue;
      entries[n] = text;
    }
    if (Object.keys(entries).length > 0) out[clauseId] = entries;
  }
  return out;
}

/* pure merge, `patch` wins per (clauseId, key); a clause present in one
   but not the other passes through untouched. Shared by the setter
   below and by DocPaper, which layers a session's unsaved edits over
   the persisted overrides for its own live preview (see the comment on
   pendingOverrides in ContractGenerator.tsx). */
export function mergeOverrides(base: Overrides, patch: Overrides): Overrides {
  if (Object.keys(patch).length === 0) return base;
  const out: Overrides = { ...base };
  for (const [clauseId, entries] of Object.entries(patch)) {
    out[clauseId] = { ...(out[clauseId] ?? {}), ...entries };
  }
  return out;
}

/* one block's text, folded into `base` under (clauseId, key) */
export function withOverride(base: Overrides, clauseId: string, key: number, text: string): Overrides {
  return mergeOverrides(base, { [clauseId]: { [key]: text } });
}

/*
  Save's compose step, as one pure fold: a session's unsaved edits
  layered over what was already persisted, the pending text winning per
  (clauseId, key). This is the whole of what Save does to the store, so
  it is a function a test can call rather than a loop a test has to
  re-implement (see editSession.test.ts, and the comment at the top of
  editSession.ts for the bug that made that distinction matter).
*/
export function commitPending(saved: Overrides, pending: Overrides): Overrides {
  return mergeOverrides(saved, pending);
}

/* the inverse of a clause gaining an entry: drops it entirely rather
   than leaving an empty {} behind, which matters because
   isClauseEdited (clauses.ts) checks Object.keys(forClause).length,
   not just whether the key exists */
export function withoutClause(base: Overrides, clauseId: string): Overrides {
  if (!(clauseId in base)) return base;
  const next = { ...base };
  delete next[clauseId];
  return next;
}

function readStored(): Overrides | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return normalizeOverrides(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useOverrides() {
  const [overrides, setOverrides] = useState<Overrides>({});
  /* hydration: see useContractDraft.ts for why this cannot be read
     straight into useState */
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = readStored();
    if (stored) setOverrides(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(overrides));
      } catch {
        /* quota, private mode, blocked storage: edits stay live for
           this session, cg-draft and cg-style are untouched either way */
      }
    }, SAVE_DEBOUNCE);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [overrides, hydrated]);

  /* Save's fold, in one functional update rather than one per edited
     block: commitPending is the pure step (see editSession.ts), this is
     the only thing that puts its result into state. */
  const commitOverrides = useCallback((pending: Overrides) => {
    setOverrides((o) => commitPending(o, pending));
  }, []);

  const clearClauseOverride = useCallback((clauseId: string) => {
    setOverrides((o) => withoutClause(o, clauseId));
  }, []);

  const clearAllOverrides = useCallback(() => {
    setOverrides({});
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* nothing to clean up if it was never written */
    }
  }, []);

  return { overrides, commitOverrides, clearClauseOverride, clearAllOverrides, hydrated };
}

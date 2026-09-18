import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeOverrides,
  normalizeOverrides,
  withOverride,
  withoutClause,
} from "./useOverrides.ts";
import { isClauseEdited, listItemOverrideKey } from "./clauses.ts";
import type { Overrides } from "./types.ts";

/*
  useOverrides.ts is a "use client" hook wired to window/localStorage,
  so it is not itself unit-testable under plain node:test the way
  contrast.ts is. The four pure functions it exports (normalizeOverrides,
  mergeOverrides, withOverride, withoutClause) carry all of its actual
  logic - reading, merging and clearing - so those are what get tested
  here, exactly the split useDocStyle.ts/useContractDraft.ts already
  leave untested for the same reason.
*/

test("normalizeOverrides accepts a well-formed Overrides object unchanged in shape", () => {
  const raw = { parties: { 0: "Hand-typed text.", 2: "More text." } };
  assert.deepEqual(normalizeOverrides(raw), raw);
});

test("normalizeOverrides collapses anything that is not a plain object to {}", () => {
  assert.deepEqual(normalizeOverrides(null), {});
  assert.deepEqual(normalizeOverrides(undefined), {});
  assert.deepEqual(normalizeOverrides("a string"), {});
  assert.deepEqual(normalizeOverrides(42), {});
  assert.deepEqual(normalizeOverrides([1, 2, 3]), {});
});

test("normalizeOverrides drops a per-clause entry that is not a plain object", () => {
  const raw = { parties: "not an object", fees: { 0: "kept" } };
  assert.deepEqual(normalizeOverrides(raw), { fees: { 0: "kept" } });
});

test("normalizeOverrides drops non-integer keys and non-string values", () => {
  const raw = {
    parties: {
      "1.5": "fractional key, dropped",
      abc: "not a number, dropped",
      3: 12345, // not a string, dropped
      4: "kept",
    },
  };
  assert.deepEqual(normalizeOverrides(raw), { parties: { 4: "kept" } });
});

test("normalizeOverrides keeps negative keys, since list items encode as negative integers", () => {
  const key = listItemOverrideKey(2, 0);
  assert.ok(key < 0);
  const raw = { deliverables: { [key]: "Wireframes v1--v2 handoff" } };
  assert.deepEqual(normalizeOverrides(raw), raw);
});

test("normalizeOverrides drops a clause left with no valid keys at all", () => {
  const raw = { parties: { abc: "junk" } };
  assert.deepEqual(normalizeOverrides(raw), {});
});

test("mergeOverrides: patch wins per (clauseId, key), untouched clauses pass through", () => {
  const base: Overrides = { parties: { 0: "old" }, fees: { 1: "fee text" } };
  const patch: Overrides = { parties: { 0: "new", 2: "added" } };
  assert.deepEqual(mergeOverrides(base, patch), {
    parties: { 0: "new", 2: "added" },
    fees: { 1: "fee text" },
  });
});

test("mergeOverrides with an empty patch returns the same base reference", () => {
  const base: Overrides = { parties: { 0: "text" } };
  assert.equal(mergeOverrides(base, {}), base);
});

test("withOverride folds a single block's text in without disturbing siblings", () => {
  const base: Overrides = { parties: { 0: "old" } };
  const next = withOverride(base, "parties", 1, "new");
  assert.deepEqual(next, { parties: { 0: "old", 1: "new" } });
  // base itself is not mutated
  assert.deepEqual(base, { parties: { 0: "old" } });
});

test("withoutClause removes exactly one clause and leaves the rest alone", () => {
  const base: Overrides = { parties: { 0: "a" }, fees: { 0: "b" } };
  assert.deepEqual(withoutClause(base, "parties"), { fees: { 0: "b" } });
});

test("withoutClause on a clause id that is not present returns the same reference", () => {
  const base: Overrides = { parties: { 0: "a" } };
  assert.equal(withoutClause(base, "nowhere"), base);
});

test("withoutClause fully detaches a clause from isClauseEdited, not just empties it", () => {
  const base: Overrides = { parties: { 0: "a" } };
  const cleared = withoutClause(base, "parties");
  assert.equal(isClauseEdited("parties", cleared), false);
});

/*
  Folding a session's pendingEdits in entry by entry, rather than in one
  bulk replace, has to land on the same result mergeOverrides gives -
  checked here on a non-empty pending set over a non-empty starting
  store (a save on top of an already-saved earlier edit), entry order
  included. handleSaveEdit no longer drains it this way (it hands the
  whole set to commitPending in one go, see editSession.test.ts), but
  the two have to stay interchangeable: withOverride is still what
  DocPaper's onBlur folds one block in with.

  Note what these two tests could never catch, since it is why Save
  shipped broken twice: they both start from a pending set that already
  holds the edit. Whether the edit ever GETS there before Save reads it
  is a question of event order, and that lives in editSession.test.ts.
*/
test("draining pendingEdits via repeated withOverride calls (the Save commit path) matches mergeOverrides", () => {
  const overrides: Overrides = { parties: { 0: "previously saved opening line" } };
  const pendingEdits: Overrides = {
    parties: { 1: "a second, not-yet-saved paragraph" },
    fees: { 0: "hand-edited fee text" },
  };

  let committed = overrides;
  for (const [clauseId, entries] of Object.entries(pendingEdits)) {
    for (const [key, text] of Object.entries(entries)) {
      committed = withOverride(committed, clauseId, Number(key), text);
    }
  }

  assert.deepEqual(committed, mergeOverrides(overrides, pendingEdits));
  assert.deepEqual(committed, {
    parties: { 0: "previously saved opening line", 1: "a second, not-yet-saved paragraph" },
    fees: { 0: "hand-edited fee text" },
  });
  // the pending set itself is never mutated by draining it
  assert.deepEqual(pendingEdits, {
    parties: { 1: "a second, not-yet-saved paragraph" },
    fees: { 0: "hand-edited fee text" },
  });
});

test("draining an empty pendingEdits leaves overrides untouched (Save with nothing pending is a no-op)", () => {
  const overrides: Overrides = { parties: { 0: "existing" } };
  const pendingEdits: Overrides = {};

  let committed = overrides;
  for (const [clauseId, entries] of Object.entries(pendingEdits)) {
    for (const [key, text] of Object.entries(entries)) {
      committed = withOverride(committed, clauseId, Number(key), text);
    }
  }

  assert.equal(committed, overrides);
});

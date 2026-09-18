import { test } from "node:test";
import assert from "node:assert/strict";
import { exitEditing, EDITABLE_CLASS, type ActiveElementLike } from "./editSession.ts";
import { commitPending } from "./useOverrides.ts";
import { listItemOverrideKey } from "./clauses.ts";
import type { Overrides } from "./types.ts";

/*
  These are the tests that were missing while Save discarded edits twice
  over. The whole suite was green through both attempts because every
  test of this layer exercised the fold on a pending set that was
  already populated - which is never the question. The question is
  whether the block the user was still typing in has had a chance to put
  its text into that set before the fold reads it, and that is a matter
  of ORDER, not of merging.

  So the order is what is tested here. `session()` below stands in for
  the live wiring: `blurBlock` is DocPaper's onBlur -> onEditBlock (the
  only thing that ever moves text out of a block and into pendingEdits),
  and `save` is ContractGenerator's handleSaveEdit. exitEditing is given
  the real, exported implementation, not a copy of it, so reordering its
  three steps in editSession.ts fails these.
*/

function session(text: string, clauseId = "parties", key = 0) {
  let pending: Overrides = {};
  let saved: Overrides = {};
  let refocused = false;
  let blurCount = 0;

  /* an element that behaves the way an edited block does: blurring it is
     what commits its text. Nothing else in this file writes to `pending`. */
  const block: ActiveElementLike = {
    classList: { contains: (token: string) => token === EDITABLE_CLASS },
    blur: () => {
      blurCount += 1;
      pending = { ...pending, [clauseId]: { ...(pending[clauseId] ?? {}), [key]: text } };
    },
  };

  return {
    block,
    get pending() { return pending; },
    get saved() { return saved; },
    get refocused() { return refocused; },
    get blurCount() { return blurCount; },
    seed(existing: Overrides) { saved = existing; },
    save: () => { saved = commitPending(saved, pending); pending = {}; },
    cancel: () => { pending = {}; },
    refocus: () => { refocused = true; },
  };
}

test("Save keeps the edit in the block the user was still typing in", () => {
  const s = session("a paragraph the user hand-typed");

  /* the block has NOT been blurred by anything else - this is Save
     reached without the browser having moved focus off it first, which
     is every click in Safari and Firefox and every activation that
     arrives without a preceding mousedown */
  assert.deepEqual(s.pending, {}, "precondition: nothing committed yet");

  exitEditing(s.block, s.save, s.refocus);

  assert.deepEqual(s.saved, { parties: { 0: "a paragraph the user hand-typed" } });
});

test("Save folds the still-focused block on top of what was already saved", () => {
  const s = session("newly typed", "fees", 2);
  s.seed({ parties: { 0: "saved earlier" }, fees: { 0: "saved earlier too" } });

  exitEditing(s.block, s.save, s.refocus);

  assert.deepEqual(s.saved, {
    parties: { 0: "saved earlier" },
    fees: { 0: "saved earlier too", 2: "newly typed" },
  });
});

test("Save keeps a still-focused list item, whose override key is negative", () => {
  const key = listItemOverrideKey(3, 1);
  assert.ok(key < 0, "precondition: list item keys are negative");
  const s = session("a hand-typed bullet", "parties", key);

  exitEditing(s.block, s.save, s.refocus);

  assert.deepEqual(s.saved, { parties: { [key]: "a hand-typed bullet" } });
});

test("the block is blurred before the exit runs, not after it", () => {
  let blurredFirst = false;
  let ran = false;
  const block: ActiveElementLike = {
    classList: { contains: (t: string) => t === EDITABLE_CLASS },
    blur: () => { if (!ran) blurredFirst = true; },
  };

  exitEditing(block, () => { ran = true; }, () => {});

  assert.equal(blurredFirst, true, "blur must precede the save/cancel step");
});

test("focus is handed back only after the exit has run", () => {
  const order: string[] = [];
  const block: ActiveElementLike = {
    classList: { contains: (t: string) => t === EDITABLE_CLASS },
    blur: () => order.push("blur"),
  };

  exitEditing(block, () => order.push("run"), () => order.push("refocus"));

  assert.deepEqual(order, ["blur", "run", "refocus"]);
});

test("Cancel still discards the block the user was typing in", () => {
  const s = session("typed then abandoned");

  exitEditing(s.block, s.cancel, s.refocus);

  assert.deepEqual(s.saved, {}, "nothing is persisted by Cancel");
  assert.deepEqual(s.pending, {}, "and the session's deltas are dropped");
  assert.equal(s.refocused, true);
});

test("exitEditing leaves focus alone when it is not on an editable block", () => {
  let blurred = false;
  /* a form field, a button, anything else on the route */
  const other: ActiveElementLike = {
    classList: { contains: () => false },
    blur: () => { blurred = true; },
  };

  const flushed = exitEditing(other, () => {}, () => {});

  assert.equal(flushed, false);
  assert.equal(blurred, false, "only an editable block is ever blurred");
});

test("exitEditing still runs the exit when nothing at all is focused", () => {
  let ran = false;
  let refocused = false;

  const flushed = exitEditing(null, () => { ran = true; }, () => { refocused = true; });

  assert.equal(flushed, false);
  assert.equal(ran, true);
  assert.equal(refocused, true);
});

test("commitPending folds every pending clause and block in one step", () => {
  const saved: Overrides = { parties: { 0: "kept" } };
  const pending: Overrides = {
    parties: { 1: "added to an existing clause" },
    fees: { 0: "a clause with no saved override yet" },
  };

  assert.deepEqual(commitPending(saved, pending), {
    parties: { 0: "kept", 1: "added to an existing clause" },
    fees: { 0: "a clause with no saved override yet" },
  });
  assert.deepEqual(saved, { parties: { 0: "kept" } }, "neither input is mutated");
  assert.deepEqual(pending, {
    parties: { 1: "added to an existing clause" },
    fees: { 0: "a clause with no saved override yet" },
  });
});

test("commitPending lets a re-edited block replace what was saved for it", () => {
  const saved: Overrides = { parties: { 0: "the first version" } };
  assert.deepEqual(commitPending(saved, { parties: { 0: "the second version" } }), {
    parties: { 0: "the second version" },
  });
});

test("commitPending with nothing pending is a no-op (Save with no edits)", () => {
  const saved: Overrides = { parties: { 0: "existing" } };
  assert.equal(commitPending(saved, {}), saved);
});

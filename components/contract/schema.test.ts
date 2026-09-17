import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DRAFT, GROUPS, completion } from "./schema.ts";
import type { Draft } from "./types.ts";

test("there are six groups in the documented order", () => {
  assert.deepEqual(
    GROUPS.map((g) => g.id),
    ["designer", "client", "project", "fees", "timeline", "jurisdiction"],
  );
});

test("every field name is a real key of Draft and appears exactly once", () => {
  const names = GROUPS.flatMap((g) => g.fields.map((f) => f.name));
  const unique = new Set(names);
  assert.equal(names.length, unique.size, "a field is declared twice");
  for (const n of names) {
    assert.ok(n in DEFAULT_DRAFT, `${String(n)} is not a key of Draft`);
  }
});

test("the default draft ships prefilled with the designer identity", () => {
  assert.equal(DEFAULT_DRAFT.designerName, "Aayush Raj");
  assert.equal(DEFAULT_DRAFT.currency, "INR");
  assert.equal(DEFAULT_DRAFT.govCountry, "India");
});

test("all four removable clauses default to on", () => {
  assert.equal(DEFAULT_DRAFT.toggles.attribution, true);
  assert.equal(DEFAULT_DRAFT.toggles.confidentiality, true);
  assert.equal(DEFAULT_DRAFT.toggles.warranties, true);
  assert.equal(DEFAULT_DRAFT.toggles.termination, true);
});

/* a cast on the left of an assignment is a TypeScript error, so the write
   goes through an index signature view of the object instead */
function put(d: Draft, key: keyof Draft, value: unknown): void {
  (d as unknown as Record<string, unknown>)[key as string] = value;
}

test("completion counts only required fields", () => {
  const empty: Draft = { ...DEFAULT_DRAFT };
  for (const g of GROUPS) {
    for (const f of g.fields) {
      if (f.required) put(empty, f.name, "");
    }
  }
  assert.equal(completion(empty), 0);
  assert.equal(completion(DEFAULT_DRAFT) > 0, true);
});

test("completion ignores optional fields entirely", () => {
  const withGst: Draft = { ...DEFAULT_DRAFT, designerGst: "27AAAAA0000A1Z5" };
  const withoutGst: Draft = { ...DEFAULT_DRAFT, designerGst: "" };
  assert.equal(completion(withGst), completion(withoutGst));
});

test("a fully filled draft is exactly 100", () => {
  const full: Draft = { ...DEFAULT_DRAFT };
  for (const g of GROUPS) {
    for (const f of g.fields) {
      if (f.required) put(full, f.name, "x");
    }
  }
  /* deliverables is a required list, so the loop above has just written a
     string into it; put the array back */
  full.deliverables = ["one"];
  assert.equal(completion(full), 100);
});

test("whitespace does not count as a filled field", () => {
  const spaces: Draft = { ...DEFAULT_DRAFT, projectName: "   " };
  const filled: Draft = { ...DEFAULT_DRAFT, projectName: "Real" };
  assert.ok(completion(spaces) < completion(filled));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClauses, isClauseEdited, listItemOverrideKey, PLACEHOLDER } from "./clauses.ts";
import { DEFAULT_DRAFT } from "./schema.ts";
import type { Draft, Overrides } from "./types.ts";

const full: Draft = {
  ...DEFAULT_DRAFT,
  clientName: "TechFlow Innovations",
  projectName: "Mobile App Redesign",
  projectDescription: "A complete redesign.",
  deliverables: ["Figma file", "Design system"],
  totalFee: "150000",
  hourlyRate: "3000",
  effectiveDate: "2026-07-07",
  startDate: "2026-07-07",
  endDate: "2026-08-06",
};

test("all thirteen clauses are present when every toggle is on", () => {
  assert.equal(buildClauses(full).length, 13);
});

test("switching off a clause removes exactly that clause", () => {
  const out = buildClauses({
    ...full,
    toggles: { ...full.toggles, confidentiality: false },
  });
  assert.equal(out.length, 12);
  assert.equal(out.some((c) => c.id === "confidentiality"), false);
});

test("switching off all four removable clauses leaves nine", () => {
  const out = buildClauses({
    ...full,
    toggles: {
      attribution: false,
      confidentiality: false,
      warranties: false,
      termination: false,
      lateFee: true,
    },
  });
  assert.equal(out.length, 9);
});

test("signatures is always last, whatever is switched off", () => {
  const out = buildClauses({
    ...full,
    toggles: { ...full.toggles, termination: false, warranties: false },
  });
  assert.equal(out[out.length - 1].id, "signatures");
});

test("clause ids are stable and unique", () => {
  const ids = buildClauses(full).map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("no clause text contains a hardcoded clause number", () => {
  /* numbering is derived from position at render time; a literal number
     followed by a period and a space in the prose is the bug this test
     exists to catch */
  const text = JSON.stringify(buildClauses(full));
  assert.equal(/\b\d{1,2}\.\s/.test(text), false);
});

test("the late fee toggle suppresses a sub clause without changing the count", () => {
  const on = buildClauses(full);
  const off = buildClauses({ ...full, toggles: { ...full.toggles, lateFee: false } });
  assert.equal(on.length, off.length);
  const fees = (cs: typeof on) => JSON.stringify(cs.find((c) => c.id === "fees"));
  assert.notEqual(fees(on), fees(off));
});

test("money appears formatted, never as a raw number string", () => {
  const fees = buildClauses(full).find((c) => c.id === "fees");
  assert.ok(JSON.stringify(fees).includes("₹1,50,000"));
  assert.equal(JSON.stringify(fees).includes("150000"), false);
});

test("the advance splits the total and both halves are shown", () => {
  const fees = buildClauses(full).find((c) => c.id === "fees");
  /* 50% of 1,50,000 */
  assert.ok(JSON.stringify(fees).includes("₹75,000"));
});

test("empty fields fall back to the placeholder, never to an empty gap", () => {
  const bare = buildClauses(DEFAULT_DRAFT);
  const parties = bare.find((c) => c.id === "parties");
  assert.ok(JSON.stringify(parties).includes(PLACEHOLDER));
});

test("deliverables render as a list, and an empty one still renders a placeholder row", () => {
  const withNone = buildClauses({ ...full, deliverables: [] });
  const scope = withNone.find((c) => c.id === "scope");
  const list = scope?.blocks.find((b) => b.kind === "list");
  assert.ok(list && list.kind === "list" && list.items.length > 0);
});

test("GST appears only when it is filled in", () => {
  const without = JSON.stringify(buildClauses(full));
  const withGst = JSON.stringify(buildClauses({ ...full, designerGst: "27AAAAA0000A1Z5" }));
  assert.equal(without.includes("27AAAAA0000A1Z5"), false);
  assert.ok(withGst.includes("27AAAAA0000A1Z5"));
});

test("no clause contains an em dash", () => {
  assert.equal(JSON.stringify(buildClauses(full)).includes("—"), false);
});

test("the jurisdiction reads back the governing location", () => {
  const general = buildClauses({ ...full, govCity: "Berlin", govState: "", govCountry: "Germany" });
  assert.ok(JSON.stringify(general).includes("Berlin, Germany"));
});

test("the designer's role appears in the parties clause", () => {
  const parties = buildClauses({ ...full, designerRole: "Brand Strategist" }).find(
    (c) => c.id === "parties",
  );
  assert.ok(JSON.stringify(parties).includes("Brand Strategist"));
});

test("an unfilled designer role falls back to the placeholder, not an empty gap", () => {
  const parties = buildClauses({ ...full, designerRole: "" }).find((c) => c.id === "parties");
  assert.ok(JSON.stringify(parties).includes(PLACEHOLDER));
});

test("the designer's entity type renders its human label, never the raw enum value", () => {
  const cases: [Draft["designerEntity"], string][] = [
    ["individual", "Individual"],
    ["proprietor", "Sole Proprietor"],
    ["company", "Company"],
  ];
  for (const [entity, label] of cases) {
    const parties = buildClauses({ ...full, designerEntity: entity }).find(
      (c) => c.id === "parties",
    );
    assert.ok(JSON.stringify(parties).includes(label), `${entity} should render as "${label}"`);
  }
  /* the raw stored value must never leak into the document text; "Company"
     containing the substring "company" only by a case difference is the
     reason this is a separate, case-sensitive assertion rather than folded
     into the loop above */
  const parties = buildClauses({ ...full, designerEntity: "proprietor" }).find(
    (c) => c.id === "parties",
  );
  assert.equal(JSON.stringify(parties).includes("proprietor"), false);
});

test("user text containing -- survives unchanged and is never mistaken for the placeholder sentinel", () => {
  /* regression: PLACEHOLDER used to be the visible string "--" itself, so a
     renderer splitting on it would also split a user's own "Q3--Q4 rollout"
     and mute half of it. PLACEHOLDER is now a Private Use Area sentinel a
     user cannot type, so their hyphens must reach the output untouched and
     the sentinel must not appear anywhere in the result. */
  const withHyphens = buildClauses({
    ...full,
    projectDescription: "Q3--Q4 rollout",
    deliverables: ["Wireframes v1--v2 handoff"],
  });
  const scope = withHyphens.find((c) => c.id === "scope");
  const text = JSON.stringify(scope);
  assert.ok(text.includes("Q3--Q4 rollout"));
  assert.ok(text.includes("Wireframes v1--v2 handoff"));
  assert.equal(text.includes(PLACEHOLDER), false);
});

/* ---- overrides ------------------------------------------------------- */

test("calling buildClauses with no overrides is unchanged from calling it with none at all", () => {
  const bare = JSON.stringify(buildClauses(full));
  assert.equal(JSON.stringify(buildClauses(full, undefined)), bare);
  assert.equal(JSON.stringify(buildClauses(full, {})), bare);
});

test("an override on a para replaces that paragraph and nothing else", () => {
  const base = buildClauses(full).find((c) => c.id === "parties")!;
  const overrides: Overrides = { parties: { 0: "A hand written opening line." } };
  const edited = buildClauses(full, overrides).find((c) => c.id === "parties")!;

  assert.deepEqual(edited.blocks[0], { kind: "para", text: "A hand written opening line." });
  /* every other block is untouched, byte for byte */
  for (let i = 1; i < base.blocks.length; i++) {
    assert.deepEqual(edited.blocks[i], base.blocks[i]);
  }
});

test("an override on a subhead replaces it", () => {
  const base = buildClauses(full).find((c) => c.id === "parties")!;
  const overrides: Overrides = { parties: { 1: "Contractor (that's me)" } };
  const edited = buildClauses(full, overrides).find((c) => c.id === "parties")!;

  assert.deepEqual(edited.blocks[1], { kind: "subhead", text: "Contractor (that's me)" });
  assert.deepEqual(edited.blocks[0], base.blocks[0]);
  assert.deepEqual(edited.blocks[2], base.blocks[2]);
});

test("an override on one list item replaces only that item, siblings untouched", () => {
  const base = buildClauses(full).find((c) => c.id === "parties")!;
  const baseList = base.blocks[2];
  assert.equal(baseList.kind, "list");
  if (baseList.kind !== "list") throw new Error("unreachable");

  const overrides: Overrides = { parties: { [listItemOverrideKey(2, 2)]: "Phone: hand edited" } };
  const edited = buildClauses(full, overrides).find((c) => c.id === "parties")!;
  const editedList = edited.blocks[2];
  assert.equal(editedList.kind, "list");
  if (editedList.kind !== "list") throw new Error("unreachable");

  assert.equal(editedList.items[2], "Phone: hand edited");
  for (let i = 0; i < baseList.items.length; i++) {
    if (i === 2) continue;
    assert.equal(editedList.items[i], baseList.items[i]);
  }
});

test("an override targeting a table, ledger or signature block is ignored", () => {
  const base = buildClauses(full);
  const overrides: Overrides = {
    fees: { 1: "should not apply", 3: "should not apply either" },
    signatures: { 1: "should not apply" },
  };
  const edited = buildClauses(full, overrides);

  assert.deepEqual(
    edited.find((c) => c.id === "fees"),
    base.find((c) => c.id === "fees"),
  );
  assert.deepEqual(
    edited.find((c) => c.id === "signatures"),
    base.find((c) => c.id === "signatures"),
  );
});

test("an override for a clause id that does not exist is ignored without throwing", () => {
  const base = JSON.stringify(buildClauses(full));
  const overrides: Overrides = { "no-such-clause": { 0: "ghost text" } };
  assert.doesNotThrow(() => buildClauses(full, overrides));
  assert.equal(JSON.stringify(buildClauses(full, overrides)), base);
});

test("an override with a block index out of range is ignored without throwing", () => {
  const base = buildClauses(full).find((c) => c.id === "parties");
  const overrides: Overrides = { parties: { 999: "out of range" } };
  let edited: ReturnType<typeof buildClauses> = [];
  assert.doesNotThrow(() => {
    edited = buildClauses(full, overrides);
  });
  assert.deepEqual(edited.find((c) => c.id === "parties"), base);
});

test("overrides do not change clause count, order, ids or numbering, with optional clauses switched off", () => {
  const draft = { ...full, toggles: { ...full.toggles, attribution: false, termination: false } };
  const base = buildClauses(draft);
  /* an override sitting on a clause id that is currently switched off must
     not resurrect it, and one on a clause id still present must not add
     or remove entries */
  const overrides: Overrides = {
    attribution: { 0: "unused until the toggle comes back" },
    parties: { 0: "edited opening" },
  };
  const edited = buildClauses(draft, overrides);

  assert.equal(edited.length, base.length);
  assert.deepEqual(
    edited.map((c) => c.id),
    base.map((c) => c.id),
  );
});

test("isClauseEdited returns true only for clauses with at least one override", () => {
  const overrides: Overrides = {
    parties: { 0: "edited" },
    scope: {},
  };
  assert.equal(isClauseEdited("parties", overrides), true);
  assert.equal(isClauseEdited("scope", overrides), false);
  assert.equal(isClauseEdited("fees", overrides), false);
});

test("an override containing -- survives intact and is not confused with the placeholder sentinel", () => {
  /* `full` still leaves designerAddress and designerPhone blank, so those
     unrelated blocks legitimately contain PLACEHOLDER; this test only
     needs to prove the override itself is untouched by the sentinel logic,
     which lives entirely in the renderers, not in buildClauses */
  const overrides: Overrides = { parties: { 0: "Term runs Q3--Q4, no exceptions." } };
  const edited = buildClauses(full, overrides).find((c) => c.id === "parties")!;
  const overriddenBlock = edited.blocks[0];
  assert.deepEqual(overriddenBlock, { kind: "para", text: "Term runs Q3--Q4, no exceptions." });
  assert.equal(
    overriddenBlock.kind === "para" && overriddenBlock.text.includes(PLACEHOLDER),
    false,
  );
});

test("list item override keys never collide with a plain block index", () => {
  /* the encoding must hold even for a block index and item index that,
     read as decimal digits stuck together, would look like another
     block's plain index (e.g. block 3 item 1 must not read as block 31) */
  for (let block = 0; block < 5; block++) {
    for (let item = 0; item < 15; item++) {
      const key = listItemOverrideKey(block, item);
      assert.ok(key < 0, "a list item key must never be a valid non-negative block index");
    }
  }
  /* distinct (block, item) pairs must never encode to the same key */
  const seen = new Set<number>();
  for (let block = 0; block < 5; block++) {
    for (let item = 0; item < 15; item++) {
      const key = listItemOverrideKey(block, item);
      assert.equal(seen.has(key), false, `duplicate key for block ${block} item ${item}`);
      seen.add(key);
    }
  }
});


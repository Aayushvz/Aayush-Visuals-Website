import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClauses, PLACEHOLDER } from "./clauses.ts";
import { DEFAULT_DRAFT } from "./schema.ts";
import type { Draft } from "./types.ts";

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

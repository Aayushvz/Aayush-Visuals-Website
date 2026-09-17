import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "./render-md.ts";
import { DEFAULT_DRAFT } from "./schema.ts";
import type { Draft } from "./types.ts";

const d: Draft = {
  ...DEFAULT_DRAFT,
  clientName: "TechFlow",
  projectName: "Redesign",
  totalFee: "150000",
  effectiveDate: "2026-07-07",
  deliverables: ["Figma file", "Design system"],
};

test("renders a title and a metadata table", () => {
  const md = renderMarkdown(d);
  assert.ok(md.startsWith("# Service Agreement"));
  assert.ok(md.includes("| Designer | Aayush Raj |"));
});

test("clauses are numbered from position, zero padded", () => {
  const md = renderMarkdown(d);
  assert.ok(md.includes("## 01. Parties & Effective Date"));
  assert.ok(md.includes("## 13. Signatures"));
});

test("removing a clause renumbers everything after it", () => {
  const md = renderMarkdown({ ...d, toggles: { ...d.toggles, attribution: false } });
  assert.ok(md.includes("## 12. Signatures"));
  assert.equal(md.includes("## 13."), false);
  assert.equal(md.includes("Attribution & Portfolio Rights"), false);
});

test("lists render as markdown bullets", () => {
  const md = renderMarkdown(d);
  assert.ok(md.includes("- Figma file"));
});

test("two column tables render as pipe tables with a separator row", () => {
  const md = renderMarkdown(d);
  assert.ok(md.includes("| --- | --- |"));
});

test("three column ledgers render as pipe tables", () => {
  const md = renderMarkdown(d);
  assert.ok(md.includes("| Milestone | Amount | Due |"));
  assert.ok(md.includes("| --- | --- | --- |"));
});

test("the signature block renders as fillable lines", () => {
  const md = renderMarkdown(d);
  assert.ok(md.includes("For the Designer"));
  assert.ok(md.includes("For the Client"));
});

test("the disclaimer closes the document exactly once", () => {
  const md = renderMarkdown(d);
  assert.equal(md.split("Consult a qualified legal professional").length - 1, 1);
});

test("pipe characters in user input do not break the table", () => {
  const md = renderMarkdown({ ...d, clientName: "A | B" });
  assert.ok(md.includes("A \\| B"));
});

test("output ends with exactly one trailing newline", () => {
  const md = renderMarkdown(d);
  assert.ok(md.endsWith("\n"));
  assert.equal(md.endsWith("\n\n"), false);
});

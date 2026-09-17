import { test } from "node:test";
import assert from "node:assert/strict";
import { renderWordHtml } from "./render-html.ts";
import { renderMarkdown } from "./render-md.ts";
import { DEFAULT_DRAFT } from "./schema.ts";
import type { Draft } from "./types.ts";

const d: Draft = {
  ...DEFAULT_DRAFT,
  clientName: "TechFlow",
  projectName: "Redesign",
  totalFee: "150000",
  effectiveDate: "2026-07-07",
  deliverables: ["Figma file"],
};

test("emits a complete html document Word will open", () => {
  const html = renderWordHtml(d);
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(html.includes("<meta charset=\"utf-8\">"));
  assert.ok(html.trimEnd().endsWith("</html>"));
});

test("uses only Word-safe layout: tables, headings, paragraphs", () => {
  const html = renderWordHtml(d);
  for (const banned of ["display:flex", "display:grid", "var(--", "grid-template"]) {
    assert.equal(html.includes(banned), false, `${banned} is not safe in Word`);
  }
});

test("numbering matches the markdown renderer exactly", () => {
  const html = renderWordHtml(d);
  const md = renderMarkdown(d);
  const fromHtml = [...html.matchAll(/>(\d{2})\.\s/g)].map((m) => m[1]);
  const fromMd = [...md.matchAll(/^## (\d{2})\./gm)].map((m) => m[1]);
  assert.deepEqual(fromHtml, fromMd);
});

test("removing a clause renumbers the html too", () => {
  const html = renderWordHtml({ ...d, toggles: { ...d.toggles, attribution: false } });
  assert.ok(html.includes("12."));
  assert.equal(html.includes("Attribution & Portfolio Rights"), false);
});

test("user input is html escaped", () => {
  const html = renderWordHtml({ ...d, clientName: "<script>alert(1)</script>" });
  assert.equal(html.includes("<script>"), false);
  assert.ok(html.includes("&lt;script&gt;"));
});

test("ampersands in clause titles are escaped", () => {
  const html = renderWordHtml(d);
  assert.ok(html.includes("Parties &amp; Effective Date"));
});

test("the disclaimer appears exactly once", () => {
  const html = renderWordHtml(d);
  assert.equal(html.split("Consult a qualified legal professional").length - 1, 1);
});

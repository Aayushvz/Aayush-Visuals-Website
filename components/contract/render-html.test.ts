import { test } from "node:test";
import assert from "node:assert/strict";
import { renderWordHtml } from "./render-html.ts";
import { renderMarkdown } from "./render-md.ts";
import { listItemOverrideKey, PLACEHOLDER } from "./clauses.ts";
import { DEFAULT_DRAFT } from "./schema.ts";
import type { Draft, Overrides } from "./types.ts";

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

test("the header table agrees with the markdown renderer, label for label and value for value", () => {
  /* the screen renderer can't be exercised here without a DOM, so this
     checks the two renderers that can be, in the same spirit as the
     numbering parity test above: both must be reading documentMeta rather
     than a hand copied header, or a drift like the branch already shipped
     once (render-md said "Project", the others said "Project Name") would
     go uncaught again */
  const html = renderWordHtml(d);
  const md = renderMarkdown(d);

  const mdHeader = md.slice(0, md.indexOf("## 01."));
  const fromMd = [...mdHeader.matchAll(/^\| (.+) \| (.+) \|$/gm)]
    .filter(([, k]) => k !== "---")
    .map(([, k, v]) => [k, v] as [string, string]);

  const htmlHeader = html.slice(html.indexOf("<h1"), html.indexOf("<h2"));
  const fromHtml = [
    ...htmlHeader.matchAll(/<td[^>]*><strong>(.+?)<\/strong><\/td><td[^>]*>(.*?)<\/td><\/tr>/g),
  ].map(([, k, v]) => [k, v] as [string, string]);

  assert.deepEqual(fromHtml, fromMd);
  assert.deepEqual(
    fromMd.map(([k]) => k),
    ["Effective Date", "Designer", "Client", "Project Name"],
  );
});

test("the placeholder sentinel never reaches the exported html, and an unfilled field still shows --", () => {
  /* DEFAULT_DRAFT leaves most fields blank, so this exercises the fallback
     path directly rather than relying on `d` above, which is mostly filled */
  const html = renderWordHtml(DEFAULT_DRAFT);
  assert.equal(html.includes(PLACEHOLDER), false);
  assert.ok(html.includes("--"));
});

test("an override containing <script> is escaped in the Word html output", () => {
  /* user-typed prose is the least trusted input in the system: it must go
     through the same esc() pass as generated text, not bypass it */
  const overrides: Overrides = { parties: { 0: "<script>alert(1)</script>" } };
  const html = renderWordHtml(d, overrides);
  assert.equal(html.includes("<script>"), false);
  assert.ok(html.includes("&lt;script&gt;"));
});

test("an override containing -- survives intact in the Word html output", () => {
  const overrides: Overrides = { parties: { 0: "Term runs Q3--Q4, no exceptions." } };
  const html = renderWordHtml(d, overrides);
  assert.ok(html.includes("Term runs Q3--Q4, no exceptions."));
  assert.equal(html.includes(PLACEHOLDER), false);
});

test("numbering matches the markdown renderer exactly, with overrides present", () => {
  /* the model for this test is the parity test above; overrides must not
     add, remove or reorder clauses, so the numbering the two renderers
     derive from array position must still agree */
  const overrides: Overrides = {
    parties: { 0: "A hand written opening line.", [listItemOverrideKey(2, 0)]: "Full Name: hand edited" },
    fees: { 1: "ignored, table is not overridable" },
  };
  const html = renderWordHtml(d, overrides);
  const md = renderMarkdown(d, overrides);
  const fromHtml = [...html.matchAll(/>(\d{2})\.\s/g)].map((m) => m[1]);
  const fromMd = [...md.matchAll(/^## (\d{2})\./gm)].map((m) => m[1]);
  assert.deepEqual(fromHtml, fromMd);
  /* and the override itself reached both outputs */
  assert.ok(html.includes("A hand written opening line."));
  assert.ok(md.includes("A hand written opening line."));
});

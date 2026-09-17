# Freelance Contract Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/contract`, a client side tool that turns a form into a finished freelance service agreement, previewed live and downloadable as PDF, Word or Markdown, surfaced as playground experiment 03.

**Architecture:** The contract text lives in exactly one place, a clause array built by a pure function of form state. Three renderers consume it: React for screen and print, an HTML string for the Word blob, a Markdown string for the `.md` blob. The dashboard chrome is themed by tokens scoped to `.cgShell[data-cg-theme]`, never `:root`, so the route can be dark while the rest of the site stays on its single fixed palette.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2.4, framer-motion 12, hand authored CSS in a route scoped stylesheet. No new dependencies. Tests run on Node 24's built in runner with native TypeScript type stripping.

**Spec:** [`docs/superpowers/specs/2026-09-17-contract-generator-design.md`](../specs/2026-09-17-contract-generator-design.md)

## Global Constraints

- **Zero new npm dependencies**, runtime or dev. Verified by `git diff package.json` being empty at the end of every task.
- **Node 24 built in test runner.** Tests run with `node --test "components/contract/**/*.test.ts"`. Node strips types natively, so **test files and every module they import must avoid TypeScript features that require code generation**: no `enum`, no `namespace`, no decorators, no constructor parameter properties. Type only imports must be written `import type { X } from "./y.ts"`.
- **Test imports use relative paths with an explicit `.ts` extension** (`from "./clauses.ts"`). The `@/` alias is a tsconfig path that bare Node does not resolve.
- **Tested modules must not import React or contain JSX.** `schema.ts`, `clauses.ts`, `render-md.ts`, `render-html.ts` and `format.ts` are pure and stay that way. `.tsx` files are verified in the browser instead.
- **No edits to `app/globals.css`.** Every token and selector for this route lives in `components/contract/contract.css`, including press feedback. This matches `cricket.css` and `pond.css`, neither of which has a selector in `globals.css`.
- **Every selector is prefixed `cg`.** The stylesheet is route scoped and must not collide with the global sheet.
- **Theme tokens go on `.cgShell[data-cg-theme="light"]` and `.cgShell[data-cg-theme="dark"]`, never `:root`.**
- **No em dashes in any visible copy or contract text.** Use hyphens, commas, or restructure. This applies to the contract's legal prose too.
- **Minimal, thin outline default.** Hairline dividers over cards, no nested cards, no glass, no gradient text. `Export` is the only filled control on the page.
- **Motion uses the existing tokens** `--ease-quint`, `--dur-press`, `--dur-hover`, `--dur-state`, `--dur-panel`. A hand typed cubic-bezier is a bug unless it does something the tokens cannot.
- **Every animation has a `@media (prefers-reduced-motion: reduce)` path.** Non-negotiable.
- **Read the local Next.js docs before writing route code.** `AGENTS.md` is explicit that this Next version (16.2.10) has breaking changes against training data. Before Task 6 touches `app/contract/`, read the relevant guide in `node_modules/next/dist/docs/` and heed any deprecation notices. Where this plan and those docs disagree, the docs win; where this plan and `app/frog/page.tsx` disagree, the existing route wins.
- **Branch:** `contract-generator`, already created, spec already committed.

## Reference: the two commands used throughout

```bash
# unit tests for the pure modules
node --test "components/contract/**/*.test.ts"

# type check and production build
npm run build
```

There is no test script in `package.json` and adding one is Task 2's job.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/contract/page.tsx` | Route metadata, renders the client shell. Server component. |
| `components/contract/ContractGenerator.tsx` | Client shell. Owns theme, skin, active group, and the draft hook. |
| `components/contract/Toolbar.tsx` | Back link, document title, completion ring, skin picker, theme toggle, export menu. |
| `components/contract/FormPanel.tsx` | The accordion, rendered entirely from `schema.ts`. |
| `components/contract/ClauseRail.tsx` | The sticky 01-13 index. |
| `components/contract/DocPaper.tsx` | The live document. React renderer for the clause array. |
| `components/contract/schema.ts` | Field groups and defaults. The form's single source of truth. Pure. |
| `components/contract/format.ts` | Currency, date and slug formatting. Pure. |
| `components/contract/clauses.ts` | The contract text as data. Pure. |
| `components/contract/render-md.ts` | Clause array to Markdown. Pure. |
| `components/contract/render-html.ts` | Clause array to Word compatible HTML. Pure. |
| `components/contract/exporters.ts` | Blob creation, download trigger, `window.print()`. Browser only. |
| `components/contract/useContractDraft.ts` | State, completion maths, debounced persistence. |
| `components/contract/contract.css` | Every style for the route. |
| `components/playground/experiments.ts` | *Modify.* Add entry 03, drop one `SOON` slot. |
| `components/playground/covers.tsx` | *Modify.* Add `ContractCover`. |
| `DESIGN.md` | *Modify.* Record the route scoped theme exception. |

---

## Task 1: Types, formatting and the test harness

Establishes the shared vocabulary every later task imports, and proves the test runner works before anything depends on it.

**Files:**
- Create: `components/contract/types.ts`
- Create: `components/contract/format.ts`
- Create: `components/contract/format.test.ts`
- Modify: `package.json` (add a `test` script only, no dependencies)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Currency = "INR" | "USD" | "EUR" | "GBP"`
  - `type EntityType = "individual" | "proprietor" | "company"`
  - `type Draft` (the full form state, see Step 1)
  - `type Block`, `type Clause` (see Step 1)
  - `formatMoney(amount: number, currency: Currency): string`
  - `formatDate(iso: string): string`
  - `slugify(input: string): string`
  - `exportFilename(projectName: string, iso: string): string`

- [ ] **Step 1: Create the shared types**

Create `components/contract/types.ts`:

```ts
/*
  The vocabulary the whole tool shares.

  `Draft` is the form. `Clause` and `Block` are the document. Keeping them
  in one file that imports nothing means the three renderers, the schema
  and the state hook all agree on the same shapes without a cycle.
*/

export type Currency = "INR" | "USD" | "EUR" | "GBP";

export type EntityType = "individual" | "proprietor" | "company";

/* The five switches that change what the document contains. Four remove a
   whole numbered clause; `lateFee` suppresses a sub clause inside 04 and
   so triggers no renumbering. */
/* The three curated contract skins. It lives here rather than in
   ContractGenerator.tsx so Toolbar does not have to import from its own
   parent, which would be a (type-only, but avoidable) import cycle. */
export type Skin = "studio" | "editorial" | "plain";

export type Toggles = {
  attribution: boolean;
  confidentiality: boolean;
  warranties: boolean;
  termination: boolean;
  lateFee: boolean;
};

export type Draft = {
  /* designer */
  designerName: string;
  designerRole: string;
  designerEmail: string;
  designerPhone: string;
  designerAddress: string;
  designerEntity: EntityType;
  designerGst: string;

  /* client */
  clientName: string;
  clientContact: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;

  /* project */
  projectName: string;
  projectDescription: string;
  deliverables: string[];
  acceptanceDays: string;

  /* fees */
  currency: Currency;
  totalFee: string;
  advancePct: string;
  hourlyRate: string;
  lateFeePct: string;
  expenseMarkupPct: string;

  /* timeline */
  effectiveDate: string;
  startDate: string;
  endDate: string;
  feedbackDays: string;

  /* jurisdiction */
  govCity: string;
  govState: string;
  govCountry: string;

  toggles: Toggles;
};

export type Block =
  | { kind: "para"; text: string }
  | { kind: "subhead"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; rows: [string, string][] }
  | { kind: "ledger"; head: [string, string, string]; rows: [string, string, string][] }
  | { kind: "signature" };

export type Clause = {
  id: string;
  title: string;
  blocks: Block[];
};
```

- [ ] **Step 2: Write the failing tests for formatting**

Create `components/contract/format.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, formatDate, slugify, exportFilename } from "./format.ts";

test("INR uses Indian digit grouping", () => {
  assert.equal(formatMoney(150000, "INR"), "₹1,50,000");
  assert.equal(formatMoney(2500000, "INR"), "₹25,00,000");
});

test("non-INR currencies use Western grouping", () => {
  assert.equal(formatMoney(150000, "USD"), "$150,000");
  assert.equal(formatMoney(150000, "EUR"), "€150,000");
  assert.equal(formatMoney(150000, "GBP"), "£150,000");
});

test("money drops decimals on whole amounts and keeps them otherwise", () => {
  assert.equal(formatMoney(1500.5, "USD"), "$1,500.50");
  assert.equal(formatMoney(1500, "USD"), "$1,500");
});

test("money handles zero and NaN without printing junk", () => {
  assert.equal(formatMoney(0, "INR"), "₹0");
  assert.equal(formatMoney(Number.NaN, "INR"), "₹0");
});

test("dates render long form, not ISO", () => {
  assert.equal(formatDate("2026-07-07"), "7 July 2026");
  assert.equal(formatDate("2026-12-31"), "31 December 2026");
});

test("an empty or malformed date returns an empty string, never Invalid Date", () => {
  assert.equal(formatDate(""), "");
  assert.equal(formatDate("not-a-date"), "");
});

test("slugify lowercases, strips punctuation and collapses separators", () => {
  assert.equal(slugify("E-Commerce Mobile App Redesign"), "e-commerce-mobile-app-redesign");
  assert.equal(slugify("  Brand   Identity!!  "), "brand-identity");
  assert.equal(slugify("Acme & Co."), "acme-co");
});

test("export filename falls back when the project name is empty", () => {
  assert.equal(exportFilename("", "2026-07-07"), "service-agreement-2026-07-07");
  assert.equal(exportFilename("Redesign", "2026-07-07"), "redesign-2026-07-07");
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
node --test "components/contract/**/*.test.ts"
```

Expected: FAIL. `Cannot find module './format.ts'`.

- [ ] **Step 4: Implement the formatters**

Create `components/contract/format.ts`:

```ts
import type { Currency } from "./types.ts";

/*
  Formatting for the document.

  Currency grouping is the detail worth getting right: INR groups the
  last three digits then twos (1,50,000), everything else groups in
  threes (150,000). `Intl` already knows this, so the locale does the
  work and there is no hand rolled grouping loop to get wrong.
*/

/*
  The locale is chosen for its GROUPING, not for its language: the contract
  is written in English throughout, so a euro amount should read 150,000 and
  1,500.50 like the rest of the document. de-DE would render those as
  150.000 and 1.500,50, which is correct German and wrong here.
*/
const LOCALE: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

const SYMBOL: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function formatMoney(amount: number, currency: Currency): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  /* whole amounts read as fees, not prices, so they lose the .00 */
  const fractionDigits = Number.isInteger(safe) ? 0 : 2;
  const body = new Intl.NumberFormat(LOCALE[currency], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safe);
  return `${SYMBOL[currency]}${body}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  /* en-GB gives "7 July 2026" rather than "July 7, 2026", the form a
     contract uses, and the form the reference uses */
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function exportFilename(projectName: string, iso: string): string {
  const stem = slugify(projectName) || "service-agreement";
  return `${stem}-${iso}`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
node --test "components/contract/**/*.test.ts"
```

Expected: PASS, 8 tests.

- [ ] **Step 6: Add the test script**

In `package.json`, add to `"scripts"` only. Do not touch `dependencies` or `devDependencies`:

```json
"test": "node --test \"components/contract/**/*.test.ts\""
```

- [ ] **Step 7: Confirm no dependency drift and commit**

```bash
git diff --stat package.json   # expect: scripts line only
npm test
git add components/contract/types.ts components/contract/format.ts components/contract/format.test.ts package.json
git commit -m "feat(contract): shared types, formatters and a zero-dependency test harness"
```

---

## Task 2: Form schema and the draft hook

**Files:**
- Create: `components/contract/schema.ts`
- Create: `components/contract/schema.test.ts`
- Create: `components/contract/useContractDraft.ts`

**Interfaces:**
- Consumes: `Draft`, `Currency`, `EntityType` from `types.ts`.
- Produces:
  - `DEFAULT_DRAFT: Draft`
  - `GROUPS: Group[]` where `Group = { id: string; label: string; fields: Field[] }`
  - `Field = { name: keyof Draft; label: string; type: "text" | "email" | "tel" | "date" | "number" | "textarea" | "select" | "list"; required?: boolean; placeholder?: string; options?: { value: string; label: string }[]; half?: boolean }`
  - `completion(draft: Draft): number` returning 0-100
  - `useContractDraft()` returning `{ draft, setField, setToggle, setDeliverables, reset, pct }`

- [ ] **Step 1: Write the failing tests**

Create `components/contract/schema.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DRAFT, GROUPS, completion } from "./schema.ts";
import type { Draft } from "./types.ts";

test("there are seven groups in the documented order", () => {
  assert.deepEqual(
    GROUPS.map((g) => g.id),
    ["designer", "client", "project", "fees", "timeline", "jurisdiction", "clauses"],
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL. `Cannot find module './schema.ts'`.

- [ ] **Step 3: Implement the schema**

Create `components/contract/schema.ts`. Note `deliverables` is type `"list"` and is required, so `completion` has to treat an array specially.

```ts
import type { Draft } from "./types.ts";

/*
  The form, as data.

  FormPanel renders whatever is in here and `completion` scores whatever
  is in here, so adding a field is a one line change in one place rather
  than an edit in three. `half: true` puts two fields on one row.
*/

export type Field = {
  name: keyof Draft;
  label: string;
  type: "text" | "email" | "tel" | "date" | "number" | "textarea" | "select" | "list";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  half?: boolean;
};

export type Group = { id: string; label: string; fields: Field[] };

export const DEFAULT_DRAFT: Draft = {
  designerName: "Aayush Raj",
  designerRole: "Product Designer",
  designerEmail: "aayushvisuals@gmail.com",
  designerPhone: "",
  designerAddress: "",
  designerEntity: "individual",
  designerGst: "",

  clientName: "",
  clientContact: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",

  projectName: "",
  projectDescription: "",
  deliverables: [],
  acceptanceDays: "5",

  currency: "INR",
  totalFee: "",
  advancePct: "50",
  hourlyRate: "",
  lateFeePct: "1.5",
  expenseMarkupPct: "20",

  effectiveDate: "",
  startDate: "",
  endDate: "",
  feedbackDays: "5",

  govCity: "Pune",
  govState: "Maharashtra",
  govCountry: "India",

  toggles: {
    attribution: true,
    confidentiality: true,
    warranties: true,
    termination: true,
    lateFee: true,
  },
};

export const GROUPS: Group[] = [
  {
    id: "designer",
    label: "Designer",
    fields: [
      { name: "designerName", label: "Name", type: "text", required: true, placeholder: "Your full name" },
      { name: "designerRole", label: "Role", type: "text", required: true, placeholder: "Product Designer" },
      { name: "designerEmail", label: "Email", type: "email", required: true, half: true, placeholder: "you@studio.com" },
      { name: "designerPhone", label: "Phone", type: "tel", required: true, half: true, placeholder: "+91 00000 00000" },
      { name: "designerAddress", label: "Address", type: "textarea", required: true, placeholder: "Studio, street, city, postcode" },
      {
        name: "designerEntity",
        label: "Type",
        type: "select",
        half: true,
        options: [
          { value: "individual", label: "Individual" },
          { value: "proprietor", label: "Sole Proprietor" },
          { value: "company", label: "Company" },
        ],
      },
      { name: "designerGst", label: "GST Number", type: "text", half: true, placeholder: "Optional" },
    ],
  },
  {
    id: "client",
    label: "Client",
    fields: [
      { name: "clientName", label: "Name or Company", type: "text", required: true, placeholder: "Client company" },
      { name: "clientContact", label: "Contact Person", type: "text", required: true, placeholder: "Who signs and approves" },
      { name: "clientEmail", label: "Email", type: "email", required: true, half: true, placeholder: "client@company.com" },
      { name: "clientPhone", label: "Phone", type: "tel", half: true, placeholder: "Optional" },
      { name: "clientAddress", label: "Address", type: "textarea", required: true, placeholder: "Registered address" },
    ],
  },
  {
    id: "project",
    label: "Project",
    fields: [
      { name: "projectName", label: "Project Name", type: "text", required: true, placeholder: "E-Commerce App Redesign" },
      {
        name: "projectDescription",
        label: "Description",
        type: "textarea",
        required: true,
        placeholder: "What the engagement covers, in two or three sentences.",
      },
      { name: "deliverables", label: "Deliverables", type: "list", required: true, placeholder: "Add a deliverable" },
      { name: "acceptanceDays", label: "Acceptance Window (business days)", type: "number", required: true },
    ],
  },
  {
    id: "fees",
    label: "Fees & Payment",
    fields: [
      {
        name: "currency",
        label: "Currency",
        type: "select",
        half: true,
        options: [
          { value: "INR", label: "INR" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
          { value: "GBP", label: "GBP" },
        ],
      },
      { name: "totalFee", label: "Total Project Fee", type: "number", required: true, half: true, placeholder: "150000" },
      { name: "advancePct", label: "Advance %", type: "number", required: true, half: true },
      { name: "hourlyRate", label: "Hourly Rate", type: "number", required: true, half: true, placeholder: "3000" },
      { name: "lateFeePct", label: "Late Fee % per month", type: "number", half: true },
      { name: "expenseMarkupPct", label: "Expense Markup %", type: "number", half: true },
    ],
  },
  {
    id: "timeline",
    label: "Timeline",
    fields: [
      { name: "effectiveDate", label: "Effective Date", type: "date", required: true, half: true },
      { name: "feedbackDays", label: "Feedback Turnaround (days)", type: "number", required: true, half: true },
      { name: "startDate", label: "Estimated Start", type: "date", required: true, half: true },
      { name: "endDate", label: "Estimated End", type: "date", required: true, half: true },
    ],
  },
  {
    id: "jurisdiction",
    label: "Jurisdiction",
    fields: [
      { name: "govCity", label: "City", type: "text", required: true, half: true },
      { name: "govState", label: "State or Region", type: "text", half: true },
      { name: "govCountry", label: "Country", type: "text", required: true },
    ],
  },
  /* No fields: the toggles are their own control type and FormPanel
     renders this group from Draft["toggles"] directly. It is still a
     group so the accordion, the rail and the completion maths all see
     the same seven. */
  { id: "clauses", label: "Optional Clauses", fields: [] },
];

const REQUIRED: (keyof Draft)[] = GROUPS.flatMap((g) =>
  g.fields.filter((f) => f.required).map((f) => f.name),
);

function isFilled(value: Draft[keyof Draft]): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value != null;
}

export function completion(draft: Draft): number {
  if (REQUIRED.length === 0) return 100;
  const done = REQUIRED.filter((name) => isFilled(draft[name])).length;
  return Math.round((done / REQUIRED.length) * 100);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, 16 tests total.

- [ ] **Step 5: Implement the draft hook**

Create `components/contract/useContractDraft.ts`:

```ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Draft, Toggles } from "./types";
import { DEFAULT_DRAFT, completion } from "./schema";

/*
  Draft state, and the only thing on this route that persists.

  The theme deliberately does not persist (a visitor must never be stuck
  on a look they cannot get back from), but the form does: thirteen
  sections is long enough that losing it to an accidental refresh is
  painful, and what is stored is data the user typed. `Reset all` is the
  unconditional way out.

  Every storage call is wrapped. A private window, blocked site data or
  a draft written by an older shape of this form all degrade to a
  working, unsaved tool rather than a crash.
*/

const KEY = "cg-draft";
const SAVE_DEBOUNCE = 400;

function readStored(): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || typeof parsed !== "object") return null;
    /* merge over the defaults rather than trusting the stored shape, so
       a field added after this draft was written is simply present */
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      deliverables: Array.isArray(parsed.deliverables)
        ? parsed.deliverables
        : DEFAULT_DRAFT.deliverables,
      toggles: { ...DEFAULT_DRAFT.toggles, ...(parsed.toggles ?? {}) },
    };
  } catch {
    return null;
  }
}

export function useContractDraft() {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  /* hydration: the server render must match the client's first paint, so
     the stored draft is adopted in an effect rather than in useState */
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = readStored();
    if (stored) setDraft(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(draft));
      } catch {
        /* quota, private mode, blocked storage: the tool still works */
      }
    }, SAVE_DEBOUNCE);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, hydrated]);

  const setField = useCallback(<K extends keyof Draft>(name: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [name]: value }));
  }, []);

  const setToggle = useCallback((name: keyof Toggles, value: boolean) => {
    setDraft((d) => ({ ...d, toggles: { ...d.toggles, [name]: value } }));
  }, []);

  const setDeliverables = useCallback((items: string[]) => {
    setDraft((d) => ({ ...d, deliverables: items }));
  }, []);

  const reset = useCallback(() => {
    setDraft(DEFAULT_DRAFT);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* nothing to clean up if it was never written */
    }
  }, []);

  const pct = useMemo(() => completion(draft), [draft]);

  return { draft, setField, setToggle, setDeliverables, reset, pct, hydrated };
}
```

- [ ] **Step 6: Commit**

```bash
npm test
git add components/contract/schema.ts components/contract/schema.test.ts components/contract/useContractDraft.ts
git commit -m "feat(contract): form schema, completion maths and the draft hook"
```

---

## Task 3: The clause array

The heart of the build. Everything downstream renders this and nothing downstream contains contract prose.

**Files:**
- Create: `components/contract/clauses.ts`
- Create: `components/contract/clauses.test.ts`

**Interfaces:**
- Consumes: `Draft`, `Clause`, `Block` from `types.ts`; `formatMoney`, `formatDate` from `format.ts`.
- Produces: `buildClauses(draft: Draft): Clause[]`, and `PLACEHOLDER` (the muted stand in string, exported so `DocPaper` can style it).

- [ ] **Step 1: Write the failing tests**

Create `components/contract/clauses.test.ts`:

```ts
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
  /* numbering is derived from position at render time; a literal "09." in
     the prose is the bug this test exists to catch */
  const text = JSON.stringify(buildClauses(full));
  assert.equal(/\b0[1-9]\.\s/.test(text), false);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL. `Cannot find module './clauses.ts'`.

- [ ] **Step 3: Implement the clause builder**

Create `components/contract/clauses.ts`. Write all thirteen clauses, adapting the prose from the spec's clause table. Key rules the implementer must hold to:

- Never write a clause number into any string. Numbering is positional and added by the renderers.
- Every interpolated draft value goes through `v()` so an empty field becomes `PLACEHOLDER`, never an empty gap.
- Money goes through `formatMoney`, dates through `formatDate`.
- No em dashes anywhere in the prose.

```ts
import type { Block, Clause, Draft } from "./types.ts";
import { formatDate, formatMoney } from "./format.ts";

/*
  The contract, as data.

  This is the only place the legal prose exists. DocPaper, render-html and
  render-md all consume the array this returns, which is what stops the
  Word export drifting from what the preview shows: there is no second
  copy to drift.

  Numbering is never written into the text. The renderers derive "01." and
  so on from position in the returned array, so switching a clause off
  renumbers the whole document for free.
*/

/* Two hyphens, deliberately not an em dash: the no-em-dash rule applies to
   the contract prose too, and clauses.test.ts asserts it by serialising the
   whole output, which would catch an em dash hiding in this constant. */
export const PLACEHOLDER = "--";

/* value-or-placeholder: the document is never allowed to show an empty gap */
function v(value: string): string {
  const t = value.trim();
  return t.length > 0 ? t : PLACEHOLDER;
}

function num(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function jurisdiction(d: Draft): string {
  return [d.govCity, d.govState, d.govCountry].map((p) => p.trim()).filter(Boolean).join(", ")
    || PLACEHOLDER;
}

export function buildClauses(d: Draft): Clause[] {
  const total = num(d.totalFee);
  const advancePct = num(d.advancePct);
  const advance = Math.round((total * advancePct) / 100);
  const balance = total - advance;
  const money = (n: number) => formatMoney(n, d.currency);

  const out: Clause[] = [];

  /* ---- 01 Parties ---------------------------------------------------- */
  const designerLines: string[] = [
    `Full Name: ${v(d.designerName)}`,
    `Address: ${v(d.designerAddress)}`,
    `Email: ${v(d.designerEmail)}`,
    `Phone: ${v(d.designerPhone)}`,
  ];
  if (d.designerGst.trim()) designerLines.push(`GST Number: ${d.designerGst.trim()}`);

  out.push({
    id: "parties",
    title: "Parties & Effective Date",
    blocks: [
      {
        kind: "para",
        text: `This Freelance Services Agreement ("Agreement") is entered into as of ${
          formatDate(d.effectiveDate) || PLACEHOLDER
        }, between:`,
      },
      { kind: "subhead", text: "Designer (Contractor)" },
      { kind: "list", items: designerLines },
      { kind: "subhead", text: "Client" },
      {
        kind: "list",
        items: [
          `Full Name / Company: ${v(d.clientName)}`,
          `Contact Person: ${v(d.clientContact)}`,
          `Address: ${v(d.clientAddress)}`,
          `Email: ${v(d.clientEmail)}`,
          `Phone: ${v(d.clientPhone)}`,
        ],
      },
      { kind: "para", text: 'Together referred to as the "Parties."' },
    ],
  });

  /* ---- 02 Scope ------------------------------------------------------ */
  out.push({
    id: "scope",
    title: "Project Scope & Deliverables",
    blocks: [
      { kind: "subhead", text: "Project Description" },
      {
        kind: "para",
        text: `The Designer agrees to provide the following services, described below and in any attached Project Brief or Statement of Work, which is incorporated into this Agreement by reference: ${v(
          d.projectDescription,
        )}`,
      },
      { kind: "subhead", text: "Deliverables" },
      {
        kind: "list",
        items: d.deliverables.filter((x) => x.trim()).length
          ? d.deliverables.filter((x) => x.trim())
          : [PLACEHOLDER],
      },
      { kind: "subhead", text: "Acceptance" },
      {
        kind: "para",
        text: `Upon delivery, the Client has ${v(
          d.acceptanceDays,
        )} business days to review each deliverable and notify the Designer in writing of any deficiencies. If no written notice is received within this period, the deliverable is deemed accepted.`,
      },
    ],
  });

  /* ---- 03 Timeline --------------------------------------------------- */
  out.push({
    id: "timeline",
    title: "Timeline & Delays",
    blocks: [
      {
        kind: "table",
        rows: [
          ["Estimated Start Date", formatDate(d.startDate) || PLACEHOLDER],
          ["Estimated End Date", formatDate(d.endDate) || PLACEHOLDER],
        ],
      },
      {
        kind: "para",
        text: "These dates are provided in good faith as working estimates and do not constitute hard contractual deadlines. The Designer's ability to meet the agreed schedule depends on the Client providing timely feedback, approvals and content as requested.",
      },
      {
        kind: "para",
        text: "Any delay caused by the Client, including late feedback, a change of direction, or deviation from the agreed process, extends the delivery timeline proportionally. Such delays do not constitute a breach of this Agreement by the Designer.",
      },
    ],
  });

  /* ---- 04 Fees ------------------------------------------------------- */
  const feeBlocks: Block[] = [
    { kind: "subhead", text: "Project Fee" },
    {
      kind: "table",
      rows: [
        ["Total Project Fee", total > 0 ? money(total) : PLACEHOLDER],
        ["Payment Currency", d.currency],
      ],
    },
    { kind: "subhead", text: "Payment Schedule" },
    {
      kind: "ledger",
      head: ["Milestone", "Amount", "Due"],
      rows: [
        [
          "Advance (non-refundable)",
          total > 0 ? `${advancePct}% of total fee (${money(advance)})` : PLACEHOLDER,
          "Before work commences",
        ],
        [
          "Final Payment",
          total > 0 ? `${100 - advancePct}% of total fee (${money(balance)})` : PLACEHOLDER,
          "Before final files are handed over",
        ],
      ],
    },
    {
      kind: "para",
      text: "No work begins until the advance payment is received. Final deliverables and source files are not released until the outstanding balance is paid in full.",
    },
  ];

  if (d.toggles.lateFee) {
    feeBlocks.push(
      { kind: "subhead", text: "Late Payments" },
      {
        kind: "para",
        text: `Invoices not settled within 14 days of the due date attract a monthly service charge of ${v(
          d.lateFeePct,
        )}% (or the maximum permitted by applicable law) on the outstanding balance. The Client is also responsible for any reasonable legal or collection costs arising from late or non-payment.`,
      },
    );
  }

  feeBlocks.push(
    { kind: "subhead", text: "Expenses & Taxes" },
    {
      kind: "para",
      text: `Any pre-approved out-of-pocket expenses incurred on behalf of the Client, such as stock imagery, third-party tools or physical prototypes, are invoiced separately with a ${v(
        d.expenseMarkupPct,
      )}% handling markup. The Client is responsible for all applicable taxes, duties or levies on the fees paid.`,
    },
  );

  out.push({ id: "fees", title: "Fees, Expenses & Payment Policy", blocks: feeBlocks });

  /* ---- 05 Revisions -------------------------------------------------- */
  out.push({
    id: "revisions",
    title: "Changes & Revisions",
    blocks: [
      { kind: "subhead", text: "Included Revisions" },
      {
        kind: "para",
        text: "The project fee includes two rounds of revisions per deliverable, within the agreed scope. Each revision round must be submitted as a consolidated set of feedback rather than in piecemeal messages.",
      },
      { kind: "subhead", text: "Additional Revisions" },
      {
        kind: "para",
        text: `Revisions beyond the included rounds, or requests that fall outside the original scope, are billed at the Designer's standard hourly rate of ${
          num(d.hourlyRate) > 0 ? `${money(num(d.hourlyRate))} per hour` : PLACEHOLDER
        }, with prior written agreement.`,
      },
      { kind: "subhead", text: "Scope Creep" },
      {
        kind: "para",
        text: "If the Client requests changes that materially alter the project scope or increase the estimated time by more than 10 percent, the Designer may submit a revised proposal. Work on expanded scope does not begin until the revised proposal is signed and the corresponding advance is received.",
      },
    ],
  });

  /* ---- 06 IP --------------------------------------------------------- */
  out.push({
    id: "ip",
    title: "Intellectual Property & Ownership",
    blocks: [
      { kind: "subhead", text: "Assignment of Final Deliverables" },
      {
        kind: "para",
        text: "Upon receipt of full payment, the Designer assigns to the Client all intellectual property rights, including copyright, in the final approved deliverables listed under Project Scope & Deliverables. The Client is the sole owner of these final design files.",
      },
      { kind: "subhead", text: "Designer's Retained Rights" },
      {
        kind: "list",
        items: [
          "All preliminary work, exploratory concepts, rejected ideas and draft iterations",
          "All proprietary tools, frameworks, code libraries, templates, design systems and methodologies used in creating the work",
          "Any creative work not explicitly listed as a final deliverable",
        ],
      },
      { kind: "subhead", text: "Condition of Transfer" },
      {
        kind: "para",
        text: "The assignment of rights takes effect only upon full payment of all invoices under this Agreement. Until that point the Designer retains all rights and the Client has no licence to use, publish or distribute the deliverables in any form.",
      },
      { kind: "subhead", text: "Third-Party Materials" },
      {
        kind: "para",
        text: "If any third-party assets such as stock imagery, typefaces or open-source code are incorporated into the deliverables, the Client is responsible for obtaining and maintaining the appropriate licences for commercial use.",
      },
    ],
  });

  /* ---- 07 Client duties ---------------------------------------------- */
  out.push({
    id: "duties",
    title: "Client Responsibilities",
    blocks: [
      { kind: "para", text: "To keep the project moving efficiently, the Client agrees to:" },
      {
        kind: "list",
        items: [
          "Provide all required content, copy, brand assets and reference materials in a timely manner",
          "Designate a single point of contact authorised to give approvals and feedback",
          "Ensure that all materials, claims and content provided do not infringe any third-party rights",
          "Proofread thoroughly before final approval. If a deliverable is approved and later found to contain errors in content the Client supplied, correction costs are charged separately",
          `Respond to feedback requests within ${v(d.feedbackDays)} business days to avoid project delays`,
        ],
      },
    ],
  });

  /* ---- 08 Attribution (optional) ------------------------------------- */
  if (d.toggles.attribution) {
    out.push({
      id: "attribution",
      title: "Attribution & Portfolio Rights",
      blocks: [
        {
          kind: "para",
          text: "The Designer retains the right to reproduce, display and publish the completed work, in whole or in part, in their portfolio, on their website, across social media channels and in design awards or competitions, once the project has been made public by the Client.",
        },
        {
          kind: "para",
          text: "The Designer may request an appropriate credit line where the work is published online. The Client is not obliged to provide this, but agrees to give the Designer reasonable notice before making the work public.",
        },
      ],
    });
  }

  /* ---- 09 Confidentiality (optional) --------------------------------- */
  if (d.toggles.confidentiality) {
    out.push({
      id: "confidentiality",
      title: "Confidentiality & Non-Solicitation",
      blocks: [
        { kind: "subhead", text: "Confidentiality" },
        {
          kind: "para",
          text: "Both Parties agree to hold each other's confidential business information, trade secrets, client data and proprietary methodologies in strict confidence. This obligation survives termination of this Agreement for a period of two years.",
        },
        { kind: "subhead", text: "Non-Solicitation" },
        {
          kind: "para",
          text: "The Client agrees not to directly recruit, solicit or hire any employee, subcontractor or collaborator of the Designer during the term of this Agreement and for six months thereafter.",
        },
      ],
    });
  }

  /* ---- 10 Warranties (optional) -------------------------------------- */
  if (d.toggles.warranties) {
    out.push({
      id: "warranties",
      title: "Warranties, Liability & Indemnification",
      blocks: [
        { kind: "subhead", text: "Designer's Warranty" },
        {
          kind: "para",
          text: "The Designer warrants that the final deliverables are original works and, to the best of their knowledge, do not infringe any third-party intellectual property rights. The Designer does not conduct formal trademark or patent clearance searches; that is the Client's responsibility.",
        },
        { kind: "subhead", text: "Limitation of Liability" },
        {
          kind: "para",
          text: "The Designer's total liability under this Agreement does not exceed the total fees paid by the Client for this project. In no event is the Designer liable for indirect, incidental or consequential damages, including lost profits, loss of business or reputational damage.",
        },
        { kind: "subhead", text: "Client Indemnification" },
        {
          kind: "list",
          items: [
            "Content, trademarks or materials provided by the Client",
            "The Client's use of the deliverables beyond the scope of this Agreement",
            "Any misrepresentation made by the Client",
          ],
        },
      ],
    });
  }

  /* ---- 11 Termination (optional) ------------------------------------- */
  if (d.toggles.termination) {
    out.push({
      id: "termination",
      title: "Termination & Suspension",
      blocks: [
        { kind: "subhead", text: "Suspension" },
        {
          kind: "para",
          text: "If the project is placed on hold by the Client for more than 30 consecutive days, the Designer may charge a suspension fee to compensate for reserved capacity, agreed in writing at the time of suspension.",
        },
        { kind: "subhead", text: "Termination by Client" },
        {
          kind: "list",
          items: [
            "All fees for work completed and approved up to the date of termination",
            "All outstanding reimbursable expenses incurred to date",
            "A kill fee of 25 percent of the remaining unpaid project fee, to compensate for lost opportunity",
          ],
        },
        { kind: "subhead", text: "Termination by Designer" },
        {
          kind: "para",
          text: "The Designer may terminate this Agreement if the Client materially breaches any term and fails to remedy the breach within 10 business days of written notice. The Client remains liable for all work completed to date. No kill fee applies in this case.",
        },
      ],
    });
  }

  /* ---- 12 General ---------------------------------------------------- */
  out.push({
    id: "general",
    title: "General Provisions",
    blocks: [
      { kind: "subhead", text: "Independent Contractor" },
      {
        kind: "para",
        text: "The Designer is an independent contractor. Nothing in this Agreement creates an employment relationship, partnership, joint venture or agency between the Parties.",
      },
      { kind: "subhead", text: "Force Majeure" },
      {
        kind: "para",
        text: "Neither Party is in breach of this Agreement for any failure or delay caused by events beyond their reasonable control, including natural disasters, government actions, pandemics or severe illness.",
      },
      { kind: "subhead", text: "Governing Law & Dispute Resolution" },
      {
        kind: "para",
        text: `This Agreement is governed by and construed in accordance with the laws of ${jurisdiction(
          d,
        )}. In the event of a dispute, the Parties agree to first attempt resolution through good-faith negotiation, followed by mediation if necessary, before pursuing arbitration or litigation.`,
      },
      { kind: "subhead", text: "Entire Agreement" },
      {
        kind: "para",
        text: "This Agreement, together with any attached Statement of Work or Project Brief, constitutes the entire agreement between the Parties and supersedes all prior discussions, representations or agreements on this subject. No amendment is valid unless made in writing and signed by both Parties. If any provision is found unenforceable, the remaining provisions continue in full force.",
      },
    ],
  });

  /* ---- 13 Signatures ------------------------------------------------- */
  out.push({
    id: "signatures",
    title: "Signatures",
    blocks: [
      {
        kind: "para",
        text: "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.",
      },
      { kind: "signature" },
    ],
  });

  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, 30 tests total.

- [ ] **Step 5: Commit**

```bash
git add components/contract/clauses.ts components/contract/clauses.test.ts
git commit -m "feat(contract): the thirteen clauses as data, with derived numbering"
```

---

## Task 4: Markdown renderer

**Files:**
- Create: `components/contract/render-md.ts`
- Create: `components/contract/render-md.test.ts`

**Interfaces:**
- Consumes: `buildClauses` from `clauses.ts`, `Draft` from `types.ts`, `formatDate` from `format.ts`.
- Produces: `renderMarkdown(draft: Draft): string`

- [ ] **Step 1: Write the failing tests**

Create `components/contract/render-md.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL. `Cannot find module './render-md.ts'`.

- [ ] **Step 3: Implement the renderer**

Create `components/contract/render-md.ts`:

```ts
import type { Block, Draft } from "./types.ts";
import { buildClauses } from "./clauses.ts";
import { formatDate } from "./format.ts";

/*
  Clause array to Markdown.

  Numbering is derived here from index, exactly as DocPaper and
  render-html derive it, so all three agree without any of them owning
  the numbers.
*/

export const DISCLAIMER =
  "This template was prepared for freelance design and strategy engagements. Consult a qualified legal professional for jurisdiction-specific advice before use.";

/* a pipe inside a cell would split it into two columns */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function block(b: Block): string {
  switch (b.kind) {
    case "para":
      return `${b.text}\n`;
    case "subhead":
      return `### ${b.text}\n`;
    case "list":
      return `${b.items.map((i) => `- ${i}`).join("\n")}\n`;
    case "table":
      return `${b.rows.map((r) => `| ${cell(r[0])} | ${cell(r[1])} |`).join("\n")}\n`;
    case "ledger":
      return [
        `| ${b.head.map(cell).join(" | ")} |`,
        "| --- | --- | --- |",
        ...b.rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
      ].join("\n") + "\n";
    case "signature":
      return [
        "**For the Designer**",
        "",
        "Name: ______________________",
        "",
        "Date: ______________________",
        "",
        "**For the Client**",
        "",
        "Name: ______________________",
        "",
        "Date: ______________________",
      ].join("\n") + "\n";
  }
}

export function renderMarkdown(d: Draft): string {
  const clauses = buildClauses(d);
  const parts: string[] = [
    "# Service Agreement",
    "",
    "| | |",
    "| --- | --- |",
    `| Effective Date | ${cell(formatDate(d.effectiveDate))} |`,
    `| Designer | ${cell(d.designerName)} |`,
    `| Client | ${cell(d.clientName)} |`,
    `| Project | ${cell(d.projectName)} |`,
    "",
  ];

  clauses.forEach((c, i) => {
    parts.push(`## ${pad(i + 1)}. ${c.title}`, "");
    /* a two column table needs its separator row directly under the
       first row, which the block renderer cannot know, so it is added
       here where the position is known */
    for (const b of c.blocks) {
      if (b.kind === "table") {
        parts.push("| | |", "| --- | --- |");
      }
      parts.push(block(b), "");
    }
  });

  parts.push("---", "", `_${DISCLAIMER}_`);
  /* collapse the runs of blank lines the loop above leaves behind, then
     guarantee exactly one trailing newline */
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, 40 tests total.

- [ ] **Step 5: Commit**

```bash
git add components/contract/render-md.ts components/contract/render-md.test.ts
git commit -m "feat(contract): markdown renderer"
```

---

## Task 5: Word HTML renderer and the exporters

**Files:**
- Create: `components/contract/render-html.ts`
- Create: `components/contract/render-html.test.ts`
- Create: `components/contract/exporters.ts`

**Interfaces:**
- Consumes: `buildClauses`, `Draft`, `formatDate`, `DISCLAIMER` from `render-md.ts`.
- Produces:
  - `renderWordHtml(draft: Draft): string`
  - `downloadWord(draft: Draft): void`
  - `downloadMarkdown(draft: Draft): void`
  - `printContract(): void`

- [ ] **Step 1: Write the failing tests**

Create `components/contract/render-html.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL. `Cannot find module './render-html.ts'`.

- [ ] **Step 3: Implement the HTML renderer**

Create `components/contract/render-html.ts`. Inline styles only, no custom properties, no flex or grid. Word's HTML engine is roughly 1998.

```ts
import type { Block, Draft } from "./types.ts";
import { buildClauses } from "./clauses.ts";
import { formatDate } from "./format.ts";
import { DISCLAIMER } from "./render-md.ts";

/*
  Clause array to a Word compatible HTML document.

  Word, Pages and Google Docs all open an HTML file saved as .doc, but
  their layout engines are old: tables, headings and paragraphs with
  inline styles work, flexbox and custom properties do not. Everything
  here is deliberately conservative for that reason.
*/

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const P = 'style="margin:0 0 10pt 0;font-size:10.5pt;line-height:1.5;"';
const TD = 'style="padding:4pt 10pt 4pt 0;font-size:10.5pt;vertical-align:top;"';
const TH =
  'style="padding:4pt 10pt 4pt 0;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.08em;text-align:left;border-bottom:1px solid #999;"';

function block(b: Block): string {
  switch (b.kind) {
    case "para":
      return `<p ${P}>${esc(b.text)}</p>`;
    case "subhead":
      return `<p style="margin:14pt 0 6pt 0;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;">${esc(
        b.text,
      )}</p>`;
    case "list":
      return `<ul style="margin:0 0 10pt 0;padding-left:16pt;">${b.items
        .map((i) => `<li ${P}>${esc(i)}</li>`)
        .join("")}</ul>`;
    case "table":
      return `<table cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 10pt 0;border-collapse:collapse;"><tbody>${b.rows
        .map(
          (r) =>
            `<tr><td ${TD}><strong>${esc(r[0])}</strong></td><td ${TD}>${esc(r[1])}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    case "ledger":
      return `<table cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 10pt 0;border-collapse:collapse;"><thead><tr>${b.head
        .map((h) => `<th ${TH}>${esc(h)}</th>`)
        .join("")}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((c) => `<td ${TD}>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "signature":
      return `<table cellspacing="0" cellpadding="0" style="width:100%;margin:18pt 0 0 0;border-collapse:collapse;"><tbody><tr>
<td style="width:50%;padding:0 18pt 0 0;vertical-align:top;"><p style="margin:0 0 28pt 0;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;">For the Designer</p><p ${P}>Name: ___________________</p><p ${P}>Date: ___________________</p></td>
<td style="width:50%;padding:0;vertical-align:top;"><p style="margin:0 0 28pt 0;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;">For the Client</p><p ${P}>Name: ___________________</p><p ${P}>Date: ___________________</p></td>
</tr></tbody></table>`;
  }
}

export function renderWordHtml(d: Draft): string {
  const clauses = buildClauses(d);

  const meta: [string, string][] = [
    ["Effective Date", formatDate(d.effectiveDate)],
    ["Designer", d.designerName],
    ["Client", d.clientName],
    ["Project Name", d.projectName],
  ];

  const body = clauses
    .map(
      (c, i) =>
        `<h2 style="margin:22pt 0 8pt 0;font-size:13pt;font-weight:bold;">${pad(i + 1)}. ${esc(
          c.title,
        )}</h2>${c.blocks.map(block).join("")}`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Service Agreement</title>
</head>
<body style="font-family:Calibri,Arial,sans-serif;color:#111;margin:0;">
<h1 style="margin:0 0 14pt 0;font-size:26pt;font-weight:normal;">Service Agreement</h1>
<table cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 20pt 0;border-collapse:collapse;border-top:1px solid #999;border-bottom:1px solid #999;"><tbody>${meta
    .map(
      ([k, v]) =>
        `<tr><td ${TD}><strong>${esc(k)}</strong></td><td ${TD}>${esc(v)}</td></tr>`,
    )
    .join("")}</tbody></table>
${body}
<p style="margin:26pt 0 0 0;padding-top:10pt;border-top:1px solid #999;font-size:8.5pt;color:#666;">${esc(
    DISCLAIMER,
  )}</p>
</body></html>
`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, 47 tests total.

- [ ] **Step 5: Implement the exporters**

Create `components/contract/exporters.ts`. This touches the DOM so it has no unit test; it is verified in the browser in Task 9.

```ts
"use client";

import type { Draft } from "./types";
import { renderMarkdown } from "./render-md";
import { renderWordHtml } from "./render-html";
import { exportFilename } from "./format";

/*
  Getting the document out of the browser.

  Three routes, one source. PDF goes through the print stylesheet rather
  than a canvas library, which is why its text stays vector and
  selectable. Word and Markdown are Blobs built from the same clause
  array the preview renders.
*/

function download(filename: string, mime: string, contents: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* revoking immediately can cancel the download in some browsers */
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stem(d: Draft): string {
  const iso = d.effectiveDate || new Date().toISOString().slice(0, 10);
  return exportFilename(d.projectName, iso);
}

export function downloadWord(d: Draft): void {
  download(`${stem(d)}.doc`, "application/msword", renderWordHtml(d));
}

export function downloadMarkdown(d: Draft): void {
  download(`${stem(d)}.md`, "text/markdown;charset=utf-8", renderMarkdown(d));
}

export function printContract(): void {
  window.print();
}
```

- [ ] **Step 6: Commit**

```bash
npm test
git add components/contract/render-html.ts components/contract/render-html.test.ts components/contract/exporters.ts
git commit -m "feat(contract): word html renderer and the three exporters"
```

---

## Task 6: Route shell, theme and toolbar

First visible task. Ends with a themed, empty dashboard at `/contract`.

**Files:**
- Create: `app/contract/page.tsx`
- Create: `components/contract/ContractGenerator.tsx`
- Create: `components/contract/Toolbar.tsx`
- Create: `components/contract/contract.css`

**Interfaces:**
- Consumes: `useContractDraft`, `downloadWord`, `downloadMarkdown`, `printContract`.
- Produces: the `.cgShell` element carrying `data-cg-theme` and `data-cg-skin`. `Skin` itself is already exported from `types.ts` (Task 1).

- [ ] **Step 1: Create the route**

Create `app/contract/page.tsx`, following the pattern in `app/frog/page.tsx` exactly, including the repeated `openGraph.images` (a child `openGraph` replaces the parent's rather than merging, so omitting it ships the page with no share card):

```tsx
import type { Metadata } from "next";
import ContractGenerator from "@/components/contract/ContractGenerator";
import { OG_IMAGE } from "@/lib/site";

/* bare title - the root layout's template appends " - Aayush Raj" */
const description =
  "A free freelance contract generator. Fill a form, watch a full service agreement assemble live, and download it as a PDF, a Word file or Markdown. From the playground on Aayush Raj's portfolio.";

export const metadata: Metadata = {
  title: "Contract Generator",
  description,
  alternates: { canonical: "/contract" },
  /* images repeated on purpose - a child openGraph replaces the parent's */
  openGraph: {
    title: "Contract Generator - Aayush Raj",
    description,
    url: "/contract",
    images: [OG_IMAGE],
  },
};

export default function ContractPage() {
  return <ContractGenerator />;
}
```

- [ ] **Step 2: Verify `OG_IMAGE` is exported from `lib/site`**

```bash
grep -n "OG_IMAGE" lib/site.ts
```

Expected: an export. If the name differs, match `app/frog/page.tsx` rather than this plan.

- [ ] **Step 3: Write the token block and shell styles**

Create `components/contract/contract.css`. Every token is scoped to `.cgShell`. Start with the token block, the shell grid and the toolbar; later tasks append their own blocks to this file.

```css
/*
  Contract generator, route scoped.

  Every selector here is prefixed `cg` and every token is declared on
  .cgShell rather than :root. That scoping is the whole reason this route
  can carry a light/dark switch while the rest of the site keeps its
  single fixed palette: nothing here can reach past the shell, and
  leaving the route is the way back from any choice made inside it.

  Press feedback lives at the bottom of this file, not in the
  MICRO-INTERACTION LAYER block of globals.css, matching cricket.css and
  pond.css: a route scoped world owns its own micro-interactions.
*/

.cgShell {
  --cg-radius: 10px;
  --cg-rail-w: 46px;
  --cg-form-w: 380px;
  /* declared here, not on .cgBar: .cgGrid subtracts it, and a token set on
     a sibling is not in scope for it */
  --cg-bar-h: 56px;

  min-height: 100vh;
  background: var(--cg-bg);
  color: var(--cg-fg);
  font-family: var(--font-primary);
  transition: background var(--dur-state) var(--ease-quint),
    color var(--dur-state) var(--ease-quint);
}

.cgShell[data-cg-theme="light"] {
  --cg-bg: #f2ede6;
  --cg-panel: #faf7f1;
  --cg-fg: #1f1f1f;
  --cg-fg-2: #6b6459;
  --cg-line: rgba(31, 31, 31, 0.14);
  --cg-line-2: rgba(31, 31, 31, 0.07);
  --cg-field: #ffffff;
  --cg-accent: #7c3aed;
  --cg-accent-fg: #ffffff;
  --cg-paper: #ffffff;
  --cg-paper-fg: #1f1f1f;
  --cg-paper-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 18px 44px rgba(0, 0, 0, 0.09);
}

.cgShell[data-cg-theme="dark"] {
  --cg-bg: #121212;
  --cg-panel: #1a1a1a;
  --cg-fg: #f4f1ea;
  --cg-fg-2: #9a948a;
  --cg-line: rgba(244, 241, 234, 0.14);
  --cg-line-2: rgba(244, 241, 234, 0.07);
  --cg-field: #212121;
  /* the brand violet is tuned for readability on cream; on near-black it
     needs the lighter step to clear 4.5:1 */
  --cg-accent: #a78bfa;
  --cg-accent-fg: #17141f;
  --cg-paper: #1e1e1e;
  --cg-paper-fg: #ece8e1;
  --cg-paper-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 18px 44px rgba(0, 0, 0, 0.5);
}

/* ---------- layout ---------- */

.cgGrid {
  display: grid;
  grid-template-columns: var(--cg-form-w) var(--cg-rail-w) 1fr;
  height: calc(100vh - var(--cg-bar-h));
}

.cgCol {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.cgCol--form {
  border-right: 1px solid var(--cg-line);
  background: var(--cg-panel);
}

.cgCol--rail {
  border-right: 1px solid var(--cg-line);
}

.cgCol--paper {
  padding: clamp(20px, 3vw, 44px);
  background: var(--cg-bg);
}

/* ---------- toolbar ---------- */

.cgBar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: var(--cg-bar-h);
  padding: 0 16px;
  border-bottom: 1px solid var(--cg-line);
  background: var(--cg-panel);
}

.cgBar__back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--cg-fg-2);
  font-size: 13px;
  text-decoration: none;
  transition: color var(--dur-hover) var(--ease-quint);
}

.cgBar__back:hover {
  color: var(--cg-fg);
}

.cgBar__title {
  font-size: 14px;
  font-weight: 500;
}

.cgBar__spacer {
  flex: 1;
}

/* the completion readout: a ring and a number, the only progress chrome */
.cgRing {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--cg-fg-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.cgRing__svg {
  transform: rotate(-90deg);
}

.cgRing__track {
  stroke: var(--cg-line);
}

.cgRing__fill {
  stroke: var(--cg-accent);
  transition: stroke-dashoffset var(--dur-panel) var(--ease-quint);
}

/* ---------- controls ---------- */

.cgSeg {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--cg-line);
  border-radius: 999px;
}

.cgSeg__btn {
  padding: 5px 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--cg-fg-2);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background var(--dur-hover) var(--ease-quint),
    color var(--dur-hover) var(--ease-quint);
}

.cgSeg__btn[aria-pressed="true"] {
  background: var(--cg-line-2);
  color: var(--cg-fg);
}

.cgGhost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--cg-line);
  border-radius: 999px;
  background: transparent;
  color: var(--cg-fg);
  cursor: pointer;
}

/* the one filled control on the page */
.cgPrimary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--cg-accent);
  color: var(--cg-accent-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.cgMenu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 210px;
  padding: 6px;
  border: 1px solid var(--cg-line);
  border-radius: var(--cg-radius);
  background: var(--cg-panel);
  box-shadow: var(--cg-paper-shadow);
  z-index: 20;
}

.cgMenu__item {
  display: block;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--cg-fg);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.cgMenu__item:hover {
  background: var(--cg-line-2);
}

.cgMenu__hint {
  display: block;
  color: var(--cg-fg-2);
  font-size: 11px;
}

/* scoped to the shell: contract.css is a plain stylesheet import, so a
   bare universal selector here would leak to every page that ever loads
   this chunk. cricket.css and pond.css keep everything prefixed for the
   same reason. `@page` below is the one rule that cannot be scoped, and
   it is safe because Next only loads this stylesheet on /contract. */
.cgShell *:focus-visible {
  outline: 2px solid var(--cg-accent);
  outline-offset: 2px;
}

/* ---------- press feedback ---------- */

.cgPrimary,
.cgGhost,
.cgSeg__btn,
.cgAcc__head {
  transition: transform var(--dur-state) var(--ease-quint);
}

.cgPrimary:active,
.cgGhost:active,
.cgSeg__btn:active,
.cgAcc__head:active {
  transform: scale(0.97);
  transition-duration: var(--dur-press);
}

@media (prefers-reduced-motion: reduce) {
  .cgShell,
  .cgRing__fill {
    transition: none;
  }

  /* feedback survives reduced motion: the press dims instead of scaling */
  .cgPrimary:active,
  .cgGhost:active,
  .cgSeg__btn:active,
  .cgAcc__head:active {
    transform: none;
    opacity: 0.7;
  }
}
```

- [ ] **Step 4: Build the toolbar**

Create `components/contract/Toolbar.tsx` with the back link, title, completion ring, skin segmented control, theme toggle and the export menu. The export menu closes on outside click and on Escape.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import PageLink from "@/components/PageLink";
import type { Skin } from "./types";

type Props = {
  pct: number;
  theme: "light" | "dark";
  onTheme: () => void;
  skin: Skin;
  onSkin: (s: Skin) => void;
  onPrint: () => void;
  onWord: () => void;
  onMarkdown: () => void;
};

const SKINS: { id: Skin; label: string }[] = [
  { id: "studio", label: "Studio" },
  { id: "editorial", label: "Editorial" },
  { id: "plain", label: "Plain" },
];

const R = 9;
const C = 2 * Math.PI * R;

export default function Toolbar({
  pct, theme, onTheme, skin, onSkin, onPrint, onWord, onMarkdown,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="cgBar">
      <PageLink href="/playground" className="cgBar__back">
        <span aria-hidden>&larr;</span> Playground
      </PageLink>
      <span className="cgBar__title">Service Agreement</span>
      <span className="cgBar__spacer" />

      <span className="cgRing">
        <svg className="cgRing__svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden>
          <circle className="cgRing__track" cx="12" cy="12" r={R} fill="none" strokeWidth="2" />
          <circle
            className="cgRing__fill"
            cx="12" cy="12" r={R} fill="none" strokeWidth="2" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (C * pct) / 100}
          />
        </svg>
        <span className="cgRing__text" aria-live="polite">{pct}% complete</span>
      </span>

      <span className="cgSeg" role="group" aria-label="Document skin">
        {SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="cgSeg__btn"
            aria-pressed={skin === s.id}
            onClick={() => onSkin(s.id)}
          >
            {s.label}
          </button>
        ))}
      </span>

      <button
        type="button"
        className="cgGhost"
        onClick={onTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "○" : "●"}
      </button>

      <div ref={wrap} style={{ position: "relative" }}>
        <button
          type="button"
          className="cgPrimary"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
        >
          Export <span aria-hidden>&#9662;</span>
        </button>
        {open && (
          <div className="cgMenu" role="menu">
            <button type="button" role="menuitem" className="cgMenu__item"
              onClick={() => { setOpen(false); onPrint(); }}>
              Save as PDF
              <span className="cgMenu__hint">Opens the print dialog, A4</span>
            </button>
            <button type="button" role="menuitem" className="cgMenu__item"
              onClick={() => { setOpen(false); onWord(); }}>
              Word (.doc)
              <span className="cgMenu__hint">Editable in Word, Pages, Docs</span>
            </button>
            <button type="button" role="menuitem" className="cgMenu__item"
              onClick={() => { setOpen(false); onMarkdown(); }}>
              Markdown (.md)
              <span className="cgMenu__hint">Plain text</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Build the shell**

Create `components/contract/ContractGenerator.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Skin } from "./types";
import Toolbar from "./Toolbar";
import { useContractDraft } from "./useContractDraft";
import { downloadMarkdown, downloadWord, printContract } from "./exporters";
import "./contract.css";

export default function ContractGenerator() {
  const { draft, pct } = useContractDraft();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [skin, setSkin] = useState<Skin>("studio");

  /* first paint follows the OS, then the toggle owns it. Deliberately not
     persisted: leaving the route is the way back from any choice here. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");
  }, []);

  return (
    <div className="cgShell" data-cg-theme={theme} data-cg-skin={skin}>
      <Toolbar
        pct={pct}
        theme={theme}
        onTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        skin={skin}
        onSkin={setSkin}
        onPrint={printContract}
        onWord={() => downloadWord(draft)}
        onMarkdown={() => downloadMarkdown(draft)}
      />
      <div className="cgGrid">
        <div className="cgCol cgCol--form" />
        <div className="cgCol cgCol--rail" />
        <div className="cgCol cgCol--paper" />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Start the dev server with `preview_start {name: "portfolio-dev"}` (never `npm run dev` through Bash) and navigate to `/contract`.

Check, and capture a screenshot of each:
- The toolbar renders, three empty columns below it.
- The theme toggle flips the whole shell between light and dark.
- The export menu opens, closes on Escape, closes on outside click.
- `Export` is the only filled control on the page.
- Navigate to `/` and confirm the homepage is completely unaffected.

- [ ] **Step 7: Commit**

```bash
npm run build
git add app/contract components/contract/ContractGenerator.tsx components/contract/Toolbar.tsx components/contract/contract.css
git commit -m "feat(contract): route shell, scoped light and dark tokens, toolbar"
```

---

## Task 7: The form panel

**Files:**
- Create: `components/contract/FormPanel.tsx`
- Modify: `components/contract/contract.css` (append the form block)
- Modify: `components/contract/ContractGenerator.tsx` (mount it)

**Interfaces:**
- Consumes: `GROUPS`, `Field` from `schema.ts`; the setters from `useContractDraft`.
- Produces: nothing other tasks import.

- [ ] **Step 1: Build the panel**

Create `components/contract/FormPanel.tsx`. Requirements the implementer must meet:

- One group open at a time. Headers are `<button aria-expanded aria-controls>`; panels are `<section role="region" aria-labelledby>`.
- Every input has a real `<label htmlFor>`. A placeholder never stands in for a label.
- `type: "list"` renders a repeatable row editor: one input per deliverable, a remove button per row, and an add button.
- The `clauses` group has no fields; it renders the five toggles from `draft.toggles` as real checkboxes styled as switches, each with a visible label and a 44px touch target.
- `Reset all` sits at the foot of the panel and calls `reset()`.
- A per group "n of m" completion count sits in the header, right aligned and muted.

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GROUPS, type Field } from "./schema";
import type { Draft, Toggles } from "./types";

type Props = {
  draft: Draft;
  setField: <K extends keyof Draft>(name: K, value: Draft[K]) => void;
  setToggle: (name: keyof Toggles, value: boolean) => void;
  setDeliverables: (items: string[]) => void;
  reset: () => void;
};

const TOGGLE_LABELS: { name: keyof Toggles; label: string; hint: string }[] = [
  { name: "attribution", label: "Attribution & Portfolio Rights", hint: "Lets you publish the work" },
  { name: "confidentiality", label: "Confidentiality & Non-Solicitation", hint: "Two year NDA, six month non-solicit" },
  { name: "warranties", label: "Warranties & Liability", hint: "Caps your liability at the fee" },
  { name: "termination", label: "Termination & Suspension", hint: "Kill fee and hold terms" },
  { name: "lateFee", label: "Late payment charge", hint: "A sub clause inside Fees, not its own section" },
];

export default function FormPanel({ draft, setField, setToggle, setDeliverables, reset }: Props) {
  const [open, setOpen] = useState<string>("designer");
  const reduce = useReducedMotion();

  return (
    <div className="cgForm">
      <p className="cgForm__eyebrow">Contract Data</p>

      {GROUPS.map((g) => {
        const isOpen = open === g.id;
        const req = g.fields.filter((f) => f.required);
        const done = req.filter((f) => {
          const val = draft[f.name];
          return Array.isArray(val) ? val.length > 0 : String(val ?? "").trim().length > 0;
        }).length;

        return (
          <div className="cgAcc" key={g.id}>
            <button
              type="button"
              className="cgAcc__head"
              id={`cg-head-${g.id}`}
              aria-expanded={isOpen}
              aria-controls={`cg-panel-${g.id}`}
              onClick={() => setOpen(isOpen ? "" : g.id)}
            >
              <span className="cgAcc__label">{g.label}</span>
              {req.length > 0 && (
                <span className="cgAcc__count">{done}/{req.length}</span>
              )}
              <span className="cgAcc__chev" aria-hidden data-open={isOpen}>&#9662;</span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.section
                  id={`cg-panel-${g.id}`}
                  role="region"
                  aria-labelledby={`cg-head-${g.id}`}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? { height: 0 } : { height: 0, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="cgAcc__body">
                    {g.id === "clauses"
                      ? TOGGLE_LABELS.map((t) => (
                          <label className="cgSwitch" key={t.name}>
                            <input
                              type="checkbox"
                              checked={draft.toggles[t.name]}
                              onChange={(e) => setToggle(t.name, e.target.checked)}
                            />
                            <span className="cgSwitch__track" aria-hidden />
                            <span className="cgSwitch__text">
                              {t.label}
                              <span className="cgSwitch__hint">{t.hint}</span>
                            </span>
                          </label>
                        ))
                      : g.fields.map((f) => (
                          <FieldRow
                            key={String(f.name)}
                            field={f}
                            draft={draft}
                            setField={setField}
                            setDeliverables={setDeliverables}
                          />
                        ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <button type="button" className="cgForm__reset" onClick={reset}>
        Reset all
      </button>
    </div>
  );
}

function FieldRow({
  field, draft, setField, setDeliverables,
}: {
  field: Field;
  draft: Draft;
  setField: Props["setField"];
  setDeliverables: Props["setDeliverables"];
}) {
  const id = `cg-${String(field.name)}`;

  if (field.type === "list") {
    const items = draft.deliverables;
    return (
      <div className="cgField" data-half={false}>
        <span className="cgField__label" id={`${id}-label`}>{field.label}</span>
        <div className="cgList" role="group" aria-labelledby={`${id}-label`}>
          {items.map((item, i) => (
            <div className="cgList__row" key={i}>
              <input
                className="cgInput"
                value={item}
                aria-label={`${field.label} ${i + 1}`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  setDeliverables(next);
                }}
              />
              <button
                type="button"
                className="cgList__rm"
                aria-label={`Remove ${field.label} ${i + 1}`}
                onClick={() => setDeliverables(items.filter((_, j) => j !== i))}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            className="cgList__add"
            onClick={() => setDeliverables([...items, ""])}
          >
            + {field.placeholder ?? "Add"}
          </button>
        </div>
      </div>
    );
  }

  const value = String(draft[field.name] ?? "");

  return (
    <div className="cgField" data-half={Boolean(field.half)}>
      <label className="cgField__label" htmlFor={id}>
        {field.label}
        {!field.required && <span className="cgField__opt"> optional</span>}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={id}
          className="cgInput cgInput--area"
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => setField(field.name, e.target.value as Draft[typeof field.name])}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          className="cgInput"
          value={value}
          onChange={(e) => setField(field.name, e.target.value as Draft[typeof field.name])}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className="cgInput"
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => setField(field.name, e.target.value as Draft[typeof field.name])}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Append the form styles**

Add to `components/contract/contract.css`. Labels are 11px mono uppercase at `0.14em`, values 15px, 8px base grid, hairlines not boxes, 44px touch targets on the switches.

```css
/* ---------- form panel ---------- */

.cgForm {
  padding: 16px 0 40px;
}

.cgForm__eyebrow {
  margin: 0 16px 10px;
  color: var(--cg-fg-2);
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.cgAcc {
  border-top: 1px solid var(--cg-line-2);
}

.cgAcc__head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 0 16px;
  border: 0;
  background: transparent;
  color: var(--cg-fg);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.cgAcc__label { flex: 1; }

.cgAcc__count {
  color: var(--cg-fg-2);
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.cgAcc__chev {
  color: var(--cg-fg-2);
  transition: transform var(--dur-state) var(--ease-quint);
}

.cgAcc__chev[data-open="true"] { transform: rotate(180deg); }

.cgAcc__body {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 4px 16px 20px;
}

.cgField {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1 1 100%;
}

.cgField[data-half="true"] { flex: 1 1 calc(50% - 6px); }

.cgField__label {
  color: var(--cg-fg-2);
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cgField__opt { opacity: 0.6; text-transform: none; letter-spacing: 0; }

.cgInput {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--cg-line);
  border-radius: 8px;
  background: var(--cg-field);
  color: var(--cg-fg);
  font: inherit;
  font-size: 15px;
  transition: border-color var(--dur-hover) var(--ease-quint);
}

.cgInput:hover { border-color: var(--cg-fg-2); }
.cgInput--area { resize: vertical; min-height: 76px; }

.cgList { display: flex; flex-direction: column; gap: 6px; }
.cgList__row { display: flex; gap: 6px; }

.cgList__rm,
.cgList__add {
  border: 1px solid var(--cg-line);
  border-radius: 8px;
  background: transparent;
  color: var(--cg-fg-2);
  font: inherit;
  cursor: pointer;
}

.cgList__rm { width: 36px; flex: 0 0 36px; }
.cgList__add { padding: 8px; font-size: 13px; border-style: dashed; }

/* switches: 44px tall so the whole row is the touch target */
.cgSwitch {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  flex: 1 1 100%;
  cursor: pointer;
}

.cgSwitch input {
  position: absolute;
  width: 1px; height: 1px;
  opacity: 0;
}

.cgSwitch__track {
  position: relative;
  flex: 0 0 34px;
  width: 34px; height: 20px;
  border: 1px solid var(--cg-line);
  border-radius: 999px;
  background: transparent;
  transition: background var(--dur-state) var(--ease-quint),
    border-color var(--dur-state) var(--ease-quint);
}

.cgSwitch__track::after {
  content: "";
  position: absolute;
  top: 3px; left: 3px;
  width: 12px; height: 12px;
  border-radius: 999px;
  background: var(--cg-fg-2);
  transition: transform var(--dur-state) var(--ease-quint),
    background var(--dur-state) var(--ease-quint);
}

.cgSwitch input:checked + .cgSwitch__track {
  background: var(--cg-accent);
  border-color: var(--cg-accent);
}

.cgSwitch input:checked + .cgSwitch__track::after {
  transform: translateX(14px);
  background: var(--cg-accent-fg);
}

.cgSwitch input:focus-visible + .cgSwitch__track {
  outline: 2px solid var(--cg-accent);
  outline-offset: 2px;
}

.cgSwitch__text { font-size: 14px; }

.cgSwitch__hint {
  display: block;
  color: var(--cg-fg-2);
  font-size: 12px;
}

.cgForm__reset {
  margin: 20px 16px 0;
  padding: 8px 12px;
  border: 1px solid var(--cg-line);
  border-radius: 999px;
  background: transparent;
  color: var(--cg-fg-2);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .cgAcc__chev,
  .cgSwitch__track,
  .cgSwitch__track::after,
  .cgInput {
    transition: none;
  }
}
```

- [ ] **Step 2b: Register the new controls for press feedback**

The press feedback selector list added in Task 6 covers `.cgAcc__head` already. Add the new controls to both lists in the `press feedback` block of `contract.css`: `.cgList__add`, `.cgList__rm`, `.cgForm__reset`, `.cgMenu__item`.

- [ ] **Step 3: Mount it**

In `ContractGenerator.tsx`, pull the remaining setters off the hook and replace the empty form column:

```tsx
const { draft, setField, setToggle, setDeliverables, reset, pct } = useContractDraft();
```

```tsx
<div className="cgCol cgCol--form">
  <FormPanel
    draft={draft}
    setField={setField}
    setToggle={setToggle}
    setDeliverables={setDeliverables}
    reset={reset}
  />
</div>
```

- [ ] **Step 4: Verify in the browser**

- Open each of the seven groups; only one is open at a time.
- Type in a field, watch the group's `n/m` count and the toolbar ring both move.
- Add and remove deliverables.
- Toggle all five switches.
- Tab through the whole form with the keyboard. Every control is reachable and its focus ring is visible in both themes.
- Press `Reset all`, confirm the defaults return.
- Reload the page and confirm the typed draft survives.
- Screenshot the panel in both themes.

- [ ] **Step 5: Commit**

```bash
npm run build
git add components/contract/FormPanel.tsx components/contract/contract.css components/contract/ContractGenerator.tsx
git commit -m "feat(contract): the accordion form panel, driven entirely by the schema"
```

---

## Task 8: The document and the clause rail

**Files:**
- Create: `components/contract/DocPaper.tsx`
- Create: `components/contract/ClauseRail.tsx`
- Modify: `components/contract/contract.css` (append paper, skin and rail blocks)
- Modify: `components/contract/ContractGenerator.tsx` (mount both)

**Interfaces:**
- Consumes: `buildClauses`, `PLACEHOLDER` from `clauses.ts`; `Skin` from `types.ts`.
- Produces: nothing other tasks import.

- [ ] **Step 1: Build the document**

Create `components/contract/DocPaper.tsx`. Rules:

- Numbering comes from the array index, zero padded, never from the clause.
- Any run of text equal to `PLACEHOLDER` renders inside `<span className="cgDoc__ph">` so it reads as muted rather than as a value.
- Each clause is `<section id={`cg-c-${clause.id}`}>` so the rail can scroll to it.
- `framer-motion` `layout` on each clause so removing one slides the rest, disabled under reduced motion.

```tsx
"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Block, Draft } from "./types";
import { buildClauses, PLACEHOLDER } from "./clauses";
import { formatDate } from "./format";
import { DISCLAIMER } from "./render-md";

/* splits on the placeholder so an unfilled value reads as muted rather
   than as text the reader might mistake for a real term */
function withPlaceholders(text: string) {
  return text.split(PLACEHOLDER).map((part, i, all) => (
    <Fragment key={i}>
      {part}
      {i < all.length - 1 && <span className="cgDoc__ph">{PLACEHOLDER}</span>}
    </Fragment>
  ));
}

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case "para":
      return <p className="cgDoc__p">{withPlaceholders(b.text)}</p>;
    case "subhead":
      return <h3 className="cgDoc__sub">{b.text}</h3>;
    case "list":
      return (
        <ul className="cgDoc__ul">
          {b.items.map((i, k) => <li key={k}>{withPlaceholders(i)}</li>)}
        </ul>
      );
    case "table":
      return (
        <table className="cgDoc__kv"><tbody>
          {b.rows.map((r, k) => (
            <tr key={k}>
              <th scope="row">{r[0]}</th>
              <td>{withPlaceholders(r[1])}</td>
            </tr>
          ))}
        </tbody></table>
      );
    case "ledger":
      return (
        <table className="cgDoc__ledger">
          <thead><tr>{b.head.map((h, k) => <th key={k}>{h}</th>)}</tr></thead>
          <tbody>
            {b.rows.map((r, k) => (
              <tr key={k}>{r.map((c, j) => <td key={j}>{withPlaceholders(c)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
    case "signature":
      return (
        <div className="cgDoc__sign">
          {["For the Designer", "For the Client"].map((who) => (
            <div key={who}>
              <p className="cgDoc__signWho">{who}</p>
              <p className="cgDoc__signLine">Name</p>
              <p className="cgDoc__signLine">Date</p>
            </div>
          ))}
        </div>
      );
  }
}

export default function DocPaper({ draft }: { draft: Draft }) {
  const clauses = buildClauses(draft);
  const reduce = useReducedMotion();

  return (
    <article className="cgDoc" id="cg-doc">
      <h1 className="cgDoc__title">Service<br />Agreement</h1>

      <table className="cgDoc__meta"><tbody>
        {([
          ["Effective Date", formatDate(draft.effectiveDate)],
          ["Designer", draft.designerName],
          ["Client", draft.clientName],
          ["Project Name", draft.projectName],
        ] as [string, string][]).map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v || <span className="cgDoc__ph">{PLACEHOLDER}</span>}</td>
          </tr>
        ))}
      </tbody></table>

      {clauses.map((c, i) => (
        <motion.section
          key={c.id}
          id={`cg-c-${c.id}`}
          className="cgDoc__clause"
          layout={reduce ? false : "position"}
          transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="cgDoc__num">{String(i + 1).padStart(2, "0")}.</p>
          <h2 className="cgDoc__h">{c.title}</h2>
          {c.blocks.map((b, k) => <BlockView b={b} key={k} />)}
        </motion.section>
      ))}

      <p className="cgDoc__disclaimer">{DISCLAIMER}</p>
    </article>
  );
}
```

- [ ] **Step 2: Build the rail**

Create `components/contract/ClauseRail.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Draft } from "./types";
import { buildClauses } from "./clauses";

export default function ClauseRail({ draft }: { draft: Draft }) {
  const clauses = buildClauses(draft);
  const reduce = useReducedMotion();

  return (
    <nav className="cgRail" aria-label="Contract sections">
      {clauses.map((c, i) => (
        <motion.a
          key={c.id}
          href={`#cg-c-${c.id}`}
          className="cgRail__item"
          title={c.title}
          layout={reduce ? false : "position"}
          transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {String(i + 1).padStart(2, "0")}
          <span className="cgRail__tip">{c.title}</span>
        </motion.a>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Append the paper, skin and rail styles**

Add to `components/contract/contract.css`. The three skins set the paper's own tokens; they are independent of the light and dark theme.

```css
/* ---------- the paper ---------- */

.cgDoc {
  max-width: 820px;
  margin: 0 auto;
  padding: clamp(32px, 5vw, 64px);
  border-radius: 2px;
  background: var(--cg-paper);
  color: var(--cg-paper-fg);
  box-shadow: var(--cg-paper-shadow);
  font-family: var(--cg-doc-body, var(--font-primary));
  font-size: 14.5px;
  line-height: 1.6;
}

.cgDoc__title {
  margin: 0 0 28px;
  font-family: var(--cg-doc-display, var(--font-primary));
  font-size: clamp(40px, 6vw, 66px);
  font-weight: var(--cg-doc-display-weight, 600);
  line-height: 0.95;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.cgDoc__meta {
  width: 100%;
  margin: 0 0 40px;
  border-top: 1px solid var(--cg-line);
  border-bottom: 1px solid var(--cg-line);
  border-collapse: collapse;
}

.cgDoc__meta th,
.cgDoc__kv th {
  width: 36%;
  padding: 7px 0;
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: left;
  opacity: 0.6;
}

.cgDoc__meta td,
.cgDoc__kv td { padding: 7px 0; }

.cgDoc__clause { margin: 0 0 34px; }

.cgDoc__num {
  margin: 0;
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 11px;
  opacity: 0.5;
}

.cgDoc__h {
  margin: 2px 0 14px;
  font-family: var(--cg-doc-display, var(--font-primary));
  font-size: 21px;
  font-weight: var(--cg-doc-h-weight, 600);
  letter-spacing: -0.02em;
}

.cgDoc__sub {
  margin: 18px 0 7px;
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.6;
}

.cgDoc__p { margin: 0 0 11px; max-width: 72ch; }
.cgDoc__ul { margin: 0 0 11px; padding-left: 18px; }
.cgDoc__ul li { margin: 0 0 5px; }

/* unfilled values read as muted, so the document is whole from the first
   second without ever looking like it states a term it does not */
.cgDoc__ph {
  padding: 0 2px;
  border-radius: 3px;
  background: var(--cg-line-2);
  color: var(--cg-fg-2);
  opacity: 0.75;
}

.cgDoc__kv,
.cgDoc__ledger { width: 100%; margin: 0 0 12px; border-collapse: collapse; }

.cgDoc__ledger th {
  padding: 6px 12px 6px 0;
  border-bottom: 1px solid var(--cg-line);
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;
  opacity: 0.6;
}

.cgDoc__ledger td {
  padding: 8px 12px 8px 0;
  border-bottom: 1px solid var(--cg-line-2);
  vertical-align: top;
}

.cgDoc__sign {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 24px;
}

.cgDoc__signWho {
  margin: 0 0 30px;
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.6;
}

.cgDoc__signLine {
  margin: 0 0 22px;
  padding-top: 6px;
  border-top: 1px solid var(--cg-line);
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.55;
}

.cgDoc__disclaimer {
  margin: 34px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--cg-line);
  font-size: 11.5px;
  opacity: 0.55;
}

/* ---------- skins ----------
   Independent of the light/dark theme: the theme paints the chrome, the
   skin art-directs the paper inside it. */

.cgShell[data-cg-skin="studio"] .cgDoc {
  --cg-doc-display: var(--font-primary);
  --cg-doc-display-weight: 600;
}

.cgShell[data-cg-skin="editorial"] .cgDoc {
  --cg-doc-display: var(--font-serif), Georgia, serif;
  --cg-doc-display-weight: 400;
  --cg-doc-h-weight: 400;
  line-height: 1.7;
}

.cgShell[data-cg-skin="editorial"] .cgDoc__title { letter-spacing: -0.02em; }

.cgShell[data-cg-skin="plain"] .cgDoc {
  --cg-doc-display: var(--font-primary);
  --cg-doc-display-weight: 500;
  --cg-doc-h-weight: 500;
  font-size: 13.5px;
  line-height: 1.55;
}

.cgShell[data-cg-skin="plain"] .cgDoc__title { font-size: clamp(30px, 4vw, 42px); }

/* ---------- clause rail ---------- */

.cgRail {
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.cgRail__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  color: var(--cg-fg-2);
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 11px;
  text-decoration: none;
  transition: color var(--dur-hover) var(--ease-quint);
}

.cgRail__item:hover { color: var(--cg-accent); }

.cgRail__tip {
  position: absolute;
  left: calc(100% + 8px);
  padding: 4px 8px;
  border: 1px solid var(--cg-line);
  border-radius: 6px;
  background: var(--cg-panel);
  color: var(--cg-fg);
  font-family: var(--font-primary);
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-hover) var(--ease-quint);
  z-index: 10;
}

.cgRail__item:hover .cgRail__tip,
.cgRail__item:focus-visible .cgRail__tip { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .cgRail__item,
  .cgRail__tip { transition: none; }
}
```

- [ ] **Step 4: Mount both**

In `ContractGenerator.tsx`, fill the remaining two columns:

```tsx
<div className="cgCol cgCol--rail"><ClauseRail draft={draft} /></div>
<div className="cgCol cgCol--paper"><DocPaper draft={draft} /></div>
```

Add `html { scroll-behavior: smooth; }` scoped as `.cgCol--paper { scroll-behavior: smooth; }` so the rail anchors glide rather than jump, and add it to the reduced motion block as `scroll-behavior: auto`.

- [ ] **Step 5: Verify in the browser**

- Type into every group and confirm the document repaints live.
- Confirm unfilled values show as muted placeholders, never empty gaps.
- Switch all three skins.
- Switch each of the four clause toggles off, one at a time, and confirm the document **and** the rail renumber together, and that the late fee toggle changes clause 04 without changing the count.
- Click rail items and confirm they scroll to the right clause.
- Screenshot the document in light and dark, and in all three skins.

- [ ] **Step 6: Commit**

```bash
npm run build
git add components/contract/DocPaper.tsx components/contract/ClauseRail.tsx components/contract/contract.css components/contract/ContractGenerator.tsx
git commit -m "feat(contract): the live document, three skins and the clause rail"
```

---

## Task 9: Print stylesheet, responsive, and export verification

**Files:**
- Modify: `components/contract/contract.css` (append print and responsive blocks)
- Modify: `components/contract/ContractGenerator.tsx` (mobile tabs)

- [ ] **Step 1: Append the print stylesheet**

```css
/* ---------- print ----------
   The PDF route. Everything but the paper is removed, the paper loses
   its shadow and its max-width, and each clause is protected from being
   split across a page break. Text stays vector and selectable, which is
   the whole reason this is a stylesheet and not a canvas library.

   The browser's own page headers and footers (URL, date, page numbers)
   cannot be reached from CSS, so the 18mm margin is sized to sit clear
   of them rather than fighting them. */

@page {
  size: A4;
  margin: 18mm;
}

@media print {
  .cgBar,
  .cgCol--form,
  .cgCol--rail,
  .cgTabs {
    display: none !important;
  }

  .cgShell {
    min-height: 0;
    background: #fff;
  }

  .cgGrid {
    display: block;
    height: auto;
  }

  .cgCol,
  .cgCol--paper {
    overflow: visible;
    height: auto;
    padding: 0;
    background: #fff;
  }

  /* the paper always prints light, whatever the screen theme is: a dark
     document is a full page of toner and unreadable on paper */
  .cgDoc {
    max-width: none;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
    box-shadow: none;
    font-size: 10.5pt;
  }

  .cgDoc__ph {
    background: none;
    color: #111;
  }

  .cgDoc__clause {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .cgDoc__sign {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .cgDoc__title { font-size: 30pt; }
  .cgDoc__h { font-size: 13pt; }

  a { text-decoration: none; color: inherit; }
}
```

- [ ] **Step 2: Append the responsive block**

```css
/* ---------- responsive ---------- */

.cgTabs { display: none; }

@media (max-width: 1099px) {
  .cgGrid { grid-template-columns: 1fr; }

  .cgTabs {
    display: flex;
    gap: 4px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--cg-line);
    background: var(--cg-panel);
  }

  .cgCol--rail {
    border-right: 0;
    border-bottom: 1px solid var(--cg-line);
  }

  .cgRail {
    flex-direction: row;
    overflow-x: auto;
    padding: 8px 12px;
    gap: 4px;
  }

  .cgRail__item { flex: 0 0 auto; width: 30px; }
  .cgRail__tip { display: none; }

  .cgShell[data-cg-tab="form"] .cgCol--rail,
  .cgShell[data-cg-tab="form"] .cgCol--paper { display: none; }

  .cgShell[data-cg-tab="preview"] .cgCol--form { display: none; }

  /* the mobile nav is a fixed 58px pill on every page; the toolbar has
     to sit clear of it rather than underneath */
  .cgBar { padding-top: var(--mnav-clear); height: auto; }
  .cgBar__title { display: none; }
}

@media (max-width: 640px) {
  .cgShell { --cg-form-w: 100%; }
  .cgCol--paper { padding: 12px; }

  .cgDoc {
    padding: 24px 20px;
    font-size: 13px;
  }

  .cgSeg__btn { padding: 5px 9px; font-size: 11px; }
  /* the percentage is an aria-live region: shrink it out of sight rather
     than display:none, which would drop it from the a11y tree entirely */
  .cgRing__text {
    position: absolute;
    width: 1px; height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .cgField[data-half="true"] { flex: 1 1 100%; }
}
```

- [ ] **Step 3: Add the tab state**

In `ContractGenerator.tsx`, add `const [tab, setTab] = useState<"form" | "preview">("form");`, put `data-cg-tab={tab}` on `.cgShell`, and render the tab strip between the toolbar and the grid:

```tsx
<div className="cgTabs" role="tablist" aria-label="Panel">
  {(["form", "preview"] as const).map((t) => (
    <button
      key={t}
      type="button"
      role="tab"
      className="cgSeg__btn"
      aria-selected={tab === t}
      aria-pressed={tab === t}
      onClick={() => setTab(t)}
    >
      {t === "form" ? "Contract Data" : "Preview"}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Verify the exports for real**

This is the step that proves the spec's central claim, so do it properly.

- Fill the form completely, then switch off **two** optional clauses.
- Download the `.md`. Open it. Confirm the numbering runs 01 to 11 with no gap, the switched-off clauses are absent, money reads `₹1,50,000`, and the text matches the preview word for word.
- Download the `.doc`. Open it in Word or upload it to Google Docs. Confirm it opens as a formatted document, the tables render, the numbering matches the `.md` exactly.
- Open the print dialog. Screenshot the preview. Confirm A4, no chrome, no clause split across a page break, the signature block intact, and the document light even when the screen theme is dark.
- Switch the currency to USD and confirm grouping changes to `$150,000`.

- [ ] **Step 5: Verify responsive and reduced motion**

- Check 1440px, 900px and 380px with `resize_window`. Confirm no horizontal page scroll at any width.
- At 900px and below, confirm the tabs work and the rail is a horizontal scroller.
- Enable reduced motion (`resize_window` cannot do this; use `javascript_tool` to verify the media query, or check the CSS covers every animated selector) and confirm accordions snap, layout animation is off, and presses dim rather than scale.

- [ ] **Step 6: Commit**

```bash
npm run build
git add components/contract/contract.css components/contract/ContractGenerator.tsx
git commit -m "feat(contract): print stylesheet, responsive tabs and reduced-motion paths"
```

---

## Task 10: Playground entry, cover art, and the DESIGN.md note

**Files:**
- Modify: `components/playground/experiments.ts`
- Modify: `components/playground/covers.tsx`
- Modify: `components/playground/playground.css` (cover art styles)
- Modify: `DESIGN.md`

- [ ] **Step 1: Read the existing covers first**

```bash
sed -n '1,200p' components/playground/covers.tsx
grep -n "dplCover\|slotCover\|pondCover" components/playground/playground.css | head -40
```

Match the existing naming (`dplCover__*`) and the drawn-not-photographed approach. The new one is `contractCover__*`. No raster asset.

- [ ] **Step 2: Add the cover**

Append `ContractCover` to `components/playground/covers.tsx`. It should read as key art for a document tool: a sheet of paper on a dark ground, a hairline rule grid suggesting clauses, a violet accent mark where a signature would sit. Gradients, borders and one inline SVG only, no images, consistent with the note at the top of that file.

- [ ] **Step 3: Add the entry**

In `components/playground/experiments.ts`, add to `EXPERIMENTS` after `pond`:

```ts
  {
    id: "contract",
    index: "03",
    title: "Contract Generator",
    kind: "Freelance tool",
    href: "/contract",
    cta: "Draft an agreement",
    /* the price line says what it costs, because for a tool that is the
       question a visitor actually has */
    meta: "Free · no signup, nothing leaves your browser",
    cover: ContractCover,
    status: "live",
  },
```

Import `ContractCover` alongside the existing covers, and remove **one** entry from `SOON` (the `04` slot) so the three live cards plus one vacant slot still fill the four-up row.

- [ ] **Step 4: Note the theme exception in DESIGN.md**

In `DESIGN.md` section 1, after the existing "One set, no themes" paragraph, add:

```markdown
  One route is an exception. `/contract` (the contract generator) carries a
  light/dark switch, but its tokens are declared on `.cgShell[data-cg-theme]`
  rather than `:root` and the choice is React state that is never persisted.
  That scoping is what keeps it from reopening the problem above: nothing it
  sets can reach the rest of the site, and leaving the route is the way back
  from any choice made inside it. The tool's draft does persist to
  `localStorage`, which is data the user typed rather than a look they can be
  stranded on, and `Reset all` is the unconditional way out.
```

- [ ] **Step 5: Verify in the browser**

- Open `/playground`. Confirm three live cards and one vacant slot fill the row, and the hero counts read correctly (the hero reads counts off `EXPERIMENTS`).
- Confirm the new cover art renders at card size in the shelf.
- Click through to `/contract` and confirm the page transition plays.
- Screenshot the shelf.

- [ ] **Step 6: Final check and commit**

```bash
npm test
npm run build
git diff --stat package.json     # scripts line only, still no dependencies
git add components/playground DESIGN.md
git commit -m "feat(playground): contract generator as experiment 03, and the theme exception note"
```

---

## Self-Review

**Spec coverage.** Every spec section maps to a task:

| Spec section | Task |
|---|---|
| 2 Placement and file layout | 6 (route), 10 (playground, DESIGN.md) |
| 3 Layout and responsive | 6 (grid), 9 (breakpoints) |
| 4 Dashboard principles | 6 (one primary action), 7 (disclosure, density, a11y), 8 (no empty state) |
| 5 Contract as data, 13 clauses, renumbering | 3 |
| 6 Form schema, defaults, currency, completion | 1 (currency), 2 (schema, completion) |
| 7 Three skins | 8 |
| 8 Theme | 6 |
| 9 Export, all three routes | 4 (md), 5 (html, exporters), 9 (print, verification) |
| 10 Persistence | 2 |
| 11 Motion and reduced motion | 6, 7, 8, 9 |
| 12 Accessibility | 6 (focus, menu), 7 (labels, aria, touch targets), 8 (rail nav) |
| 13 Verification | 6, 7, 8, 9, 10 browser steps |

**Type consistency check.** `Draft`, `Block`, `Clause`, `Toggles`, `Currency`, `EntityType` are defined once in Task 1 and imported everywhere after. `buildClauses(draft)` is the single entry point used by `DocPaper`, `ClauseRail`, `render-md` and `render-html`. `DISCLAIMER` is defined once in `render-md.ts` and imported by `render-html.ts` and `DocPaper.tsx`, so it cannot drift. `PLACEHOLDER` is defined in `clauses.ts` and imported by `DocPaper.tsx`. `Skin` is exported from `types.ts` and imported by both `ContractGenerator.tsx` and `Toolbar.tsx`, so neither imports from the other.

**Known ordering constraint.** Task 5 imports `DISCLAIMER` from `render-md.ts`, so Task 4 must land first. Tasks 1 to 5 are otherwise a clean dependency chain, and Tasks 6 to 10 are strictly sequential because each mounts into the previous one's shell.

**Placeholder scan.** Two steps intentionally describe rather than dictate: Task 7 Step 1 and Task 10 Step 2 (the cover art). Both are given explicit acceptance criteria instead of literal code, because the cover must match a file the implementer has to read first and the form panel's code is supplied in full directly below its requirements list.

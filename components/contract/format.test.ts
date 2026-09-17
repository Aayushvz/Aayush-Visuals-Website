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

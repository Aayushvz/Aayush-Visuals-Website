import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  passesWcagAA,
} from "./contrast.ts";

test("hexToRgb parses with or without the leading #", () => {
  assert.deepEqual(hexToRgb("#ffffff"), [255, 255, 255]);
  assert.deepEqual(hexToRgb("000000"), [0, 0, 0]);
  assert.deepEqual(hexToRgb("#7C3AED"), [124, 58, 237]);
});

test("hexToRgb rejects anything that is not a 6-digit hex", () => {
  assert.equal(hexToRgb(""), null);
  assert.equal(hexToRgb("#fff"), null);
  assert.equal(hexToRgb("not-a-color"), null);
  assert.equal(hexToRgb("#gggggg"), null);
});

test("relative luminance of black is 0 and white is 1", () => {
  assert.equal(relativeLuminance("#000000"), 0);
  assert.equal(relativeLuminance("#ffffff"), 1);
});

test("relative luminance is null for an invalid colour", () => {
  assert.equal(relativeLuminance("nonsense"), null);
});

test("black on white is the maximum WCAG ratio, 21:1", () => {
  const ratio = contrastRatio("#000000", "#ffffff");
  assert.ok(ratio !== null);
  assert.ok(Math.abs((ratio as number) - 21) < 0.01);
});

test("contrast ratio is order independent", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), contrastRatio("#ffffff", "#000000"));
});

test("a colour against itself has a ratio of 1", () => {
  assert.equal(contrastRatio("#7c3aed", "#7c3aed"), 1);
});

test("contrast ratio is null when either colour cannot be parsed", () => {
  assert.equal(contrastRatio("#000000", "not-a-color"), null);
  assert.equal(contrastRatio("not-a-color", "#ffffff"), null);
});

test("passesWcagAA checks the right threshold per level", () => {
  assert.equal(passesWcagAA(4.5, "body"), true);
  assert.equal(passesWcagAA(4.49, "body"), false);
  assert.equal(passesWcagAA(3, "large"), true);
  assert.equal(passesWcagAA(2.99, "large"), false);
});

test("light grey on white is a realistic failing case for body text", () => {
  const ratio = contrastRatio("#cccccc", "#ffffff");
  assert.ok(ratio !== null);
  assert.equal(passesWcagAA(ratio as number, "body"), false);
});

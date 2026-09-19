import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
  A guard against one specific CSS bug, not a general stylesheet test.

  Three elements in this route are visually hidden with `position:
  absolute` while staying in the accessibility tree: the logo file
  input, the clause switches' checkboxes, and the mobile tab bar's live
  percentage. Two of them are focusable, and all three live inside
  .cgSide, which scrolls.

  Absolutely positioned with no offsets and no positioned ancestor, such
  an element's containing block is the initial containing block. It then
  stops travelling with the panel's scroll and keeps the static position
  it would have had in the unscrolled column, which for a block low in a
  long panel is below the fold. Focusing it - which is exactly what
  clicking the logo field's label does - makes the browser scroll an
  off-screen focused element into view, sliding the entire shell up and
  showing the page background beneath it. That shipped once.

  The fix is an anchor: an offset on the child and a containing block on
  the parent. Both halves are required and neither is obviously
  load-bearing when read on its own, which is why they are asserted here
  rather than left to a comment.

  This parses text, not CSSOM. It is deliberately dumb: it only proves
  the declarations are present in the right blocks.
*/

const css = readFileSync(join(import.meta.dirname, "contract.css"), "utf8");

/* the declaration block for `selector`, chosen by exact selector match on
   the line that opens the block so `.cgSwitch` cannot match
   `.cgSwitch__track` */
function block(selector: string): string {
  const pattern = new RegExp(
    `(^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  const m = css.match(pattern);
  assert.ok(m, `expected a rule for ${selector} in contract.css`);
  return m![2];
}

const HIDDEN: { child: string; parent: string }[] = [
  { child: ".cgLogo__file", parent: ".cgLogo" },
  { child: ".cgSwitch input", parent: ".cgSwitch" },
  { child: ".cgMobileTabs__pct", parent: ".cgMobileTabs__tab" },
];

for (const { child, parent } of HIDDEN) {
  test(`${child} is anchored to ${parent}, not to the initial containing block`, () => {
    const c = block(child);
    assert.match(
      c,
      /position:\s*absolute/,
      `${child} is only in this list because it is absolutely positioned`,
    );
    assert.match(
      c,
      /(^|[\s;])top:\s*/,
      `${child} needs an explicit offset, or it falls back to its static position and escapes ${parent}'s scroll`,
    );
    assert.match(
      c,
      /(^|[\s;])left:\s*/,
      `${child} needs an explicit offset, or it falls back to its static position and escapes ${parent}'s scroll`,
    );

    assert.match(
      block(parent),
      /position:\s*(relative|absolute|fixed|sticky)/,
      `${parent} must establish a containing block, or ${child}'s offsets resolve against the viewport`,
    );
  });
}

test("the visually-hidden elements stay reachable rather than display:none", () => {
  for (const { child } of HIDDEN) {
    const c = block(child);
    assert.doesNotMatch(
      c,
      /display:\s*none|visibility:\s*hidden/,
      `${child} is hidden from assistive tech, which defeats the point of hiding it this way`,
    );
  }
});

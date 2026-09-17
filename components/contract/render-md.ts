import type { Block, Draft } from "./types.ts";
import { buildClauses, documentMeta, PLACEHOLDER, PLACEHOLDER_TEXT } from "./clauses.ts";

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
    ...documentMeta(d).map(([k, val]) => `| ${cell(k)} | ${cell(val)} |`),
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
  const out = parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  /* swap the internal sentinel for its visible form last, so the exported
     .md file never carries a Private Use Area character */
  return out.split(PLACEHOLDER).join(PLACEHOLDER_TEXT);
}

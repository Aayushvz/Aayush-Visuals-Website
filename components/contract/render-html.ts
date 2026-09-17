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

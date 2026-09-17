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

"use client";

/*
  Turning a user-picked logo file into a small data URL that is safe to
  keep in localStorage next to (well, NOT next to - see useDocLogo.ts)
  the draft.

  localStorage is roughly 5MB total for the whole origin and the draft
  already lives there. A raw phone photo picked as a "logo" can be
  several megabytes; stored uncapped it can throw QuotaExceededError,
  and if it shared a key with the draft it would take the user's form
  data down with it. Two defences: reject anything over ~2MB outright
  (SOURCE_LIMIT below) with a message the caller can show inline, and
  downscale everything else before it is ever stringified.

  Rasters (PNG/JPEG) are redrawn onto a canvas capped at ~400px wide and
  re-encoded - a logo is never displayed larger than that on the page,
  so there is nothing to gain from keeping the original resolution and
  a lot to lose in storage. SVG is markup, not pixels: at any size this
  function accepts it is already small, and rasterizing it would throw
  away the one advantage it has in print (scaling without blurring), so
  it is kept as-is.
*/

const SOURCE_LIMIT = 2 * 1024 * 1024; // 2MB: the hard reject line for any source file
const SVG_LIMIT = 150 * 1024; // keeps the base64'd data URL comfortably under 200KB
const TARGET_BYTES = 200 * 1024; // the budget a stored logo should comfortably clear
const MAX_WIDTH = 400;

export type LogoResult = { ok: true; dataUrl: string } | { ok: false; error: string };

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not decode image"));
    img.src = src;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type: string, quality?: number): string {
  return canvas.toDataURL(type, quality);
}

function approxBytes(dataUrl: string): number {
  /* the base64 payload is everything after the comma; each 4 base64
     characters decode to 3 bytes, close enough for a size budget */
  const comma = dataUrl.indexOf(",");
  const payload = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  return Math.floor((payload.length * 3) / 4);
}

async function downscaleRaster(rawDataUrl: string, keepAlpha: boolean): Promise<string> {
  const img = await loadImage(rawDataUrl);
  const scale = Math.min(1, MAX_WIDTH / (img.naturalWidth || MAX_WIDTH));
  const widths = [Math.round((img.naturalWidth || MAX_WIDTH) * scale)];
  /* fallbacks if the first pass is still over budget: shrink further
     before giving up on quality */
  for (const w of [300, 220, 160]) {
    if (w < widths[0]) widths.push(w);
  }

  let best = "";
  for (const w of widths) {
    const h = Math.max(1, Math.round((img.naturalHeight || 1) * (w / (img.naturalWidth || w))));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(img, 0, 0, w, h);

    if (keepAlpha) {
      const png = canvasToDataUrl(canvas, "image/png");
      best = png;
      if (approxBytes(png) <= TARGET_BYTES) return png;
    }

    /* either the source has no transparency to protect, or PNG at this
       width is still too heavy: fall back to JPEG, stepping quality
       down until the budget is met or we run out of steps */
    for (const q of [0.82, 0.7, 0.55]) {
      const jpeg = canvasToDataUrl(canvas, "image/jpeg", q);
      best = jpeg;
      if (approxBytes(jpeg) <= TARGET_BYTES) return jpeg;
    }
  }
  /* best effort: every step above already tried to hit TARGET_BYTES and
     failed, so return the smallest one produced rather than nothing */
  return best;
}

export async function processLogoFile(file: File): Promise<LogoResult> {
  if (file.size > SOURCE_LIMIT) {
    return { ok: false, error: `That file is ${mb(file.size)}MB. Please choose an image under 2MB.` };
  }

  if (file.type === "image/svg+xml") {
    if (file.size > SVG_LIMIT) {
      return { ok: false, error: `That SVG is ${mb(file.size)}MB. Please use one under ${Math.round(SVG_LIMIT / 1024)}KB.` };
    }
    try {
      const text = await readAsText(file);
      const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
      return { ok: true, dataUrl };
    } catch {
      return { ok: false, error: "Could not read that SVG file." };
    }
  }

  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    return { ok: false, error: "Logos can be PNG, JPEG or SVG." };
  }

  try {
    const raw = await readAsDataUrl(file);
    const dataUrl = await downscaleRaster(raw, file.type === "image/png");
    if (!dataUrl) return { ok: false, error: "Could not process that image." };
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: "Could not process that image." };
  }
}

/*
  Can this browser draw WebGL? Asked once per page and remembered.

  The hero and the Statement logos each used to build their own throwaway
  canvas to find out, and neither gave the context back, so a homepage
  visit held two dead WebGL contexts for its whole life on top of the five
  real ones (browsers cap the total at ~16 and start dropping the oldest).
  This probes once and releases the probe straight away.
*/
let cached: boolean | null = null;

export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    cached = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

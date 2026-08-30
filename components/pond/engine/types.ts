// Core contracts shared by the scene graph. Kept intentionally tiny: an element
// can optionally simulate itself each frame and must know how to draw itself.
// Frog, bugs and particles in later phases implement this same interface (or
// wrap entities that do), so every phase composes into the same pipeline.

import type { World } from "./World";

export interface SceneElement {
  /** Advance simulation. Optional — many backdrop pieces are pure draws. */
  update?(world: World): void;
  /** Paint into the current layer transform. */
  render(world: World): void;
  /** Set false to skip and later reap the element. */
  alive?: boolean;
}

/** A global system that runs once per frame, outside any single layer. */
export interface System {
  update(world: World): void;
}

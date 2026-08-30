// Top-level orchestrator. Wires the renderer, clock, input and world together,
// owns the requestAnimationFrame loop, and delegates all content to the Scene.
// Deliberately thin — game logic lives in systems and scene elements, not here.

import { Clock } from "./Clock";
import { Input } from "./Input";
import { Renderer } from "./Renderer";
import { World } from "./World";
import { Scene } from "../world/Scene";
import { C } from "../config/theme";
import { ambience } from "../audio/Ambience";

export class Game {
  private readonly renderer: Renderer;
  private readonly clock = new Clock();
  private readonly input: Input;
  private readonly world: World;
  private readonly scene: Scene;

  private running = false;
  private booted = false;
  private destroyed = false;
  private raf = 0;
  private readonly onFirstFrame?: () => void;
  private readonly onTick?: (bugsFixed: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onFirstFrame?: () => void,
    onTick?: (bugsFixed: number) => void
  ) {
    this.renderer = new Renderer(canvas, { targetHeight: 232 });
    this.input = new Input(canvas);
    this.world = new World(this.input);
    this.onFirstFrame = onFirstFrame;
    this.onTick = onTick;

    this.syncViewport(this.renderer.width, this.renderer.height);
    this.scene = new Scene(this.world);
    this.renderer.onResize((w, h) => {
      this.syncViewport(w, h);
      this.scene.relayout(this.world);
    });

    // Pause the loop when the tab is hidden — no point simulating an unseen
    // pond, and it keeps the delta clamp honest on return.
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  private readonly onVisibility = (): void => {
    if (this.destroyed) return;
    if (document.hidden) this.stop();
    else this.start();
  };

  private syncViewport(w: number, h: number): void {
    this.world.width = w;
    this.world.height = h;
    this.input.setViewport(this.renderer.pixelSize, w, h);
  }

  start(): void {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.clock.tick(performance.now()); // reset delta baseline
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /*
    Full teardown.

    The original never needed one: the game owned the whole tab, so closing it
    was the teardown. Here it is one route inside a client-side router, so
    everything it reached outside its own canvas - the visibility listener, the
    resize listener, the window pointerup, the audio graph and its timers - has
    to come back, or every visit to the pond leaves another copy running behind
    the page you navigated to.
  */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.renderer.destroy();
    this.input.destroy();
    ambience.destroy();
  }

  private frame = (now: number): void => {
    if (!this.running || this.destroyed) return;
    this.clock.tick(now);

    const world = this.world;
    world.t = this.clock.elapsed;
    world.dt = this.clock.delta;
    world.ctx = this.renderer.ctx;

    world.camera.update(world.t, world.dt, this.input);
    this.scene.update(world);

    this.renderer.clear(C.skyDeep);
    this.scene.render(world);

    this.onTick?.(world.progress.bugsResolved);

    if (!this.booted) {
      this.booted = true;
      this.onFirstFrame?.();
    }

    this.raf = requestAnimationFrame(this.frame);
  };
}

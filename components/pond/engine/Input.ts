// Pointer input. Tracks the cursor in *internal* (low-res) pixel space and
// exposes edge-triggered click events that systems drain each frame. Kept
// deliberately small; richer interaction lands in the input/interaction phase.

export interface ClickEvent {
  x: number;
  y: number;
  /** ms since the previous click anywhere — lets us detect double-clicks. */
  sincePrev: number;
}

export class Input {
  /** Cursor position in internal pixels. */
  x = 0;
  y = 0;
  /** Normalised cursor offset from screen centre, roughly [-1,1]. */
  nx = 0;
  ny = 0;
  present = false;
  down = false;

  private pending: ClickEvent[] = [];
  private lastClickAt = -Infinity;
  private scale = 1;
  private viewW = 1;
  private viewH = 1;

  /* the two listeners that outlive the canvas, kept so they can be unbound */
  private readonly onUp = (): void => {
    this.down = false;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    const c = canvas;
    c.addEventListener("pointermove", this.onMove, { passive: true });
    c.addEventListener("pointerenter", () => (this.present = true));
    c.addEventListener("pointerleave", () => {
      this.present = false;
      this.down = false;
    });
    c.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointerup", this.onUp);
    // Touch: keep the page from scrolling/zooming under the canvas.
    c.addEventListener("touchstart", this.onTouch, { passive: false });
  }

  private readonly onTouch = (e: TouchEvent): void => {
    e.preventDefault();
  };

  /*
    The canvas listeners die with the node, but the window one does not, and a
    stale pointerup handler writing to a dead Input is exactly the kind of leak
    that only shows up after a few round trips through a client-side router.
  */
  destroy(): void {
    const c = this.canvas;
    c.removeEventListener("pointermove", this.onMove);
    c.removeEventListener("pointerdown", this.onDown);
    c.removeEventListener("touchstart", this.onTouch);
    window.removeEventListener("pointerup", this.onUp);
    this.pending = [];
  }

  /** Called by the renderer whenever the backing-store size changes. */
  setViewport(scale: number, viewW: number, viewH: number): void {
    this.scale = scale;
    this.viewW = viewW;
    this.viewH = viewH;
  }

  private toInternal(clientX: number, clientY: number): void {
    const r = this.canvas.getBoundingClientRect();
    this.x = (clientX - r.left) / this.scale;
    this.y = (clientY - r.top) / this.scale;
    this.nx = this.viewW ? (this.x / this.viewW) * 2 - 1 : 0;
    this.ny = this.viewH ? (this.y / this.viewH) * 2 - 1 : 0;
  }

  private onMove = (e: PointerEvent): void => {
    this.present = true;
    this.toInternal(e.clientX, e.clientY);
  };

  private onDown = (e: PointerEvent): void => {
    this.toInternal(e.clientX, e.clientY);
    this.down = true;
    const now = performance.now();
    this.pending.push({
      x: this.x,
      y: this.y,
      sincePrev: now - this.lastClickAt,
    });
    this.lastClickAt = now;
  };

  /** Drain queued clicks for this frame. */
  takeClicks(): ClickEvent[] {
    if (this.pending.length === 0) return EMPTY;
    const out = this.pending;
    this.pending = [];
    return out;
  }
}

const EMPTY: ClickEvent[] = [];

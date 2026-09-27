/**
 * Fixed-timestep game loop. Simulation always advances in exact SIM_DT steps so combat timing is
 * identical at every frame rate; rendering receives an interpolation alpha in [0,1).
 */
export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;
const MAX_STEPS_PER_FRAME = 6;

export interface LoopHooks {
  /** Called once per rendered frame before simulation with the real elapsed seconds. */
  frameStart(realDt: number): void;
  /** Advance the simulation by exactly SIM_DT. */
  step(dt: number): void;
  /** Render with interpolation factor alpha. */
  render(alpha: number, realDt: number): void;
}

export class FixedLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  running = false;
  /** Global time scale for sim (hit-stop uses per-actor scales instead). */
  timeScale = 1;
  constructor(private hooks: LoopHooks) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  /** Exposed for tests: advance by `realDt` seconds. */
  advance(realDt: number) {
    this.hooks.frameStart(realDt);
    this.acc += Math.min(realDt, 0.25) * this.timeScale;
    let steps = 0;
    while (this.acc >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
      this.hooks.step(SIM_DT);
      this.acc -= SIM_DT;
      steps++;
    }
    if (steps >= MAX_STEPS_PER_FRAME) this.acc = Math.min(this.acc, SIM_DT);
    this.hooks.render(this.acc / SIM_DT, realDt);
  }

  private frame(now: number) {
    const dt = (now - this.last) / 1000;
    this.last = now;
    this.advance(dt);
  }
}

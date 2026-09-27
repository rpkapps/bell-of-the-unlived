/** Minimal typed event emitter. */
export class Emitter<Events extends Record<string, unknown>> {
  private map = new Map<keyof Events, Set<(p: any) => void>>();
  on<K extends keyof Events>(type: K, fn: (payload: Events[K]) => void): () => void {
    let set = this.map.get(type);
    if (!set) this.map.set(type, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }
  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.map.get(type);
    if (set) for (const fn of [...set]) fn(payload);
  }
  clear() { this.map.clear(); }
}

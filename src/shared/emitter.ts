import type Phaser from "phaser";

type Listener<T> = (payload: T) => void;

/** Minimal typed event emitter. `on` returns an unsubscribe function. */
export class Emitter<Events extends object> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn as Listener<never>);
    return () => set.delete(fn as Listener<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((fn) => (fn as Listener<Events[K]>)(payload));
  }
}

/** Unsubscribe automatically when the scene shuts down, so restarts don't leak listeners. */
export function untilShutdown(scene: Phaser.Scene, unsubscribe: () => void): void {
  scene.events.once("shutdown", unsubscribe);
}

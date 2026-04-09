/**
 * Strictly-typed event listener management.
 * Browser-agnostic: works in both Node.js and browser environments.
 */

type Listener<T extends unknown[]> = (...args: T) => void;

export class TypedEventEmitter<
  // biome-ignore lint/suspicious/noExplicitAny: generic event constraint requires any[] for covariance
  TEvents extends { [K in keyof TEvents]: (...args: any[]) => void },
> {
  private listeners = new Map<keyof TEvents, Set<Listener<never[]>>>();

  on<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener as Listener<never[]>);
  }

  off<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    this.listeners.get(event)?.delete(listener as Listener<never[]>);
  }

  protected emit<K extends keyof TEvents>(
    event: K,
    ...args: Parameters<TEvents[K]>
  ): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        (listener as (...a: unknown[]) => void)(...args);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

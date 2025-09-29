export class Signal<T extends Array<unknown>> {
  private conns = new Set<( ...args: T ) => void>();
  Connect(fn: (...args: T) => void) { this.conns.add(fn); return { Disconnect: () => this.conns.delete(fn) }; }
  Fire(...args: T) { for (const fn of this.conns) fn(...args); }
  DisconnectAll() { this.conns.clear(); }
}
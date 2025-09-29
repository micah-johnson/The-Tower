export class BiMap<K, V> {
  private forward = new Map<K, V>();
  private backward = new Map<V, K>();

  set(k: K, v: V) {
    this.forward.set(k, v);
    this.backward.set(v, k);
  }

  getByKey(k: K): V | undefined {
    return this.forward.get(k);
  }

  getByValue(v: V): K | undefined {
    return this.backward.get(v);
  }
}
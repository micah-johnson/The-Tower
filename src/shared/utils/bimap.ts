export class BiMap<K, V> {
  private forward = new Map<K, V>();
  private backward = new Map<V, K>();

  set(k: K, v: V) {
    const existingValue = this.forward.get(k);
    if (existingValue !== undefined) {
      this.backward.delete(existingValue);
    }

    const existingKey = this.backward.get(v);
    if (existingKey !== undefined) {
      this.forward.delete(existingKey);
    }

    this.forward.set(k, v);
    this.backward.set(v, k);
  }

  getByKey(k: K): V | undefined {
    return this.forward.get(k);
  }

  getByValue(v: V): K | undefined {
    return this.backward.get(v);
  }

  deleteByKey(k: K) {
    const value = this.forward.get(k);
    if (value !== undefined) {
      this.forward.delete(k);
      this.backward.delete(value);
    }
  }

  deleteByValue(v: V) {
    const key = this.backward.get(v);
    if (key !== undefined) {
      this.backward.delete(v);
      this.forward.delete(key);
    }
  }

  clear() {
    this.forward.clear();
    this.backward.clear();
  }
}

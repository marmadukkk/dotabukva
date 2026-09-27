/** In-memory localStorage for node:test. Modules only touch it inside functions. */
export function installMemoryStorage(): void {
  const mem = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (mem.has(key) ? mem.get(key)! : null),
    setItem: (key: string, value: string) => {
      mem.set(key, String(value));
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
    clear: () => {
      mem.clear();
    },
    key: (index: number) => [...mem.keys()][index] ?? null,
    get length() {
      return mem.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
}

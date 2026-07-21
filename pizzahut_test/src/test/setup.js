// Global test setup: adds jest-dom matchers (toBeInTheDocument, etc.).
import "@testing-library/jest-dom/vitest";

// Node 26 ships an experimental global `localStorage` that is `undefined` unless
// `--localstorage-file` is passed, and it can shadow jsdom's implementation.
// Install a deterministic in-memory localStorage so component tests behave
// consistently regardless of the Node/jsdom version.
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  get length() {
    return this.store.size;
  }
}

function installStorage(target, storage) {
  if (!target) return;
  try {
    Object.defineProperty(target, "localStorage", {
      value: storage,
      configurable: true,
      writable: true,
    });
  } catch {
    try {
      target.localStorage = storage;
    } catch {
      /* nothing else we can do */
    }
  }
}

const memoryStorage = new MemoryStorage();
installStorage(globalThis, memoryStorage);
if (typeof window !== "undefined" && window !== globalThis) {
  installStorage(window, memoryStorage);
}

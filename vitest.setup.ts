// Stub window.matchMedia for jsdom tests (shared-ui header uses responsive hooks)
if (typeof globalThis.window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Ensure localStorage is available (shared-ui dark mode toggle reads from it)
  if (typeof window.localStorage === "undefined" || typeof window.localStorage.getItem !== "function") {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, String(value)),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
      },
    });
  }
}

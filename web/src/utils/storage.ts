// Safe storage wrapper to avoid exceptions in environments
// that disallow access to localStorage (iOS private mode, some webviews).
const inMemory = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === "undefined" || !window.localStorage)
        return inMemory.get(key) ?? null;
      return window.localStorage.getItem(key);
    } catch (e) {
      // localStorage access can throw in some iOS contexts
      return inMemory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    try {
      if (typeof window === "undefined" || !window.localStorage)
        return inMemory.set(key, value);
      window.localStorage.setItem(key, value);
    } catch (e) {
      inMemory.set(key, value);
    }
  },
  removeItem(key: string) {
    try {
      if (typeof window === "undefined" || !window.localStorage)
        return inMemory.delete(key);
      window.localStorage.removeItem(key);
    } catch (e) {
      inMemory.delete(key);
    }
  },
};

export default safeStorage;

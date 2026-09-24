/**
 * Tiny wrapper around localStorage. Stats and settings live in the visitor's
 * own browser — no server needed. Every call is wrapped in try/catch because
 * storage can be unavailable (private browsing, blocked cookies).
 */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do — the game still works, it just won't remember.
  }
}

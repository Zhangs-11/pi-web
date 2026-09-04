const PINNED_SESSION_IDS_STORAGE_KEY = "pi-web:pinned-session-ids";
const PINNED_DEFAULT_COLLAPSED_STORAGE_KEY = "pi-web:pinned-sessions:default-collapsed";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPinnedSessionIds(storage: StorageLike | null = getBrowserStorage()): Set<string> {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(PINNED_SESSION_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function savePinnedSessionIds(
  ids: ReadonlySet<string>,
  storage: StorageLike | null = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    if (ids.size === 0) storage.removeItem(PINNED_SESSION_IDS_STORAGE_KEY);
    else storage.setItem(PINNED_SESSION_IDS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Persistence is best-effort; privacy mode and storage quotas must not break the sidebar.
  }
}

export function loadPinnedDefaultCollapsed(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(PINNED_DEFAULT_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function savePinnedDefaultCollapsed(
  collapsed: boolean,
  storage: StorageLike | null = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(PINNED_DEFAULT_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // Persistence is best-effort; privacy mode and storage quotas must not break the sidebar.
  }
}

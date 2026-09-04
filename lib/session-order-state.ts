const SESSION_ORDERS_STORAGE_KEY = "pi-web:session-orders:v1";

export type SessionOrders = Record<string, string[]>;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

export function loadSessionOrders(storage: StorageLike | undefined = browserStorage()): SessionOrders {
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(SESSION_ORDERS_STORAGE_KEY) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([projectKey, ids]) => [projectKey, uniqueIds(ids)] as const)
        .filter(([projectKey, ids]) => projectKey.length > 0 && ids.length > 0),
    );
  } catch {
    return {};
  }
}

export function saveSessionOrders(
  orders: Readonly<SessionOrders>,
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  try {
    const normalized = Object.fromEntries(
      Object.entries(orders)
        .map(([projectKey, ids]) => [projectKey, uniqueIds(ids)] as const)
        .filter(([projectKey, ids]) => projectKey.length > 0 && ids.length > 0),
    );
    if (Object.keys(normalized).length === 0) storage.removeItem(SESSION_ORDERS_STORAGE_KEY);
    else storage.setItem(SESSION_ORDERS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Persistence is best-effort when storage is blocked or full.
  }
}

export function withProjectSessionOrder(
  orders: Readonly<SessionOrders>,
  projectKey: string,
  ids: readonly string[],
): SessionOrders {
  const next = { ...orders };
  const normalized = uniqueIds(ids);
  if (normalized.length === 0) delete next[projectKey];
  else next[projectKey] = normalized;
  return next;
}

export function orderSessionIds(
  currentIds: readonly string[],
  storedOrder: readonly string[] | undefined,
): string[] {
  const current = uniqueIds(currentIds);
  if (!storedOrder) return current;

  const currentSet = new Set(current);
  const stored = uniqueIds(storedOrder).filter((id) => currentSet.has(id));
  const storedSet = new Set(stored);
  const newIds = current.filter((id) => !storedSet.has(id));
  return [...newIds, ...stored];
}

export function moveSessionId(
  ids: readonly string[],
  sourceId: string,
  targetId: string,
  position: "before" | "after",
): string[] {
  const current = uniqueIds(ids);
  if (sourceId === targetId || !current.includes(sourceId) || !current.includes(targetId)) return current;

  const next = current.filter((id) => id !== sourceId);
  const targetIndex = next.indexOf(targetId);
  next.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, sourceId);
  return next;
}

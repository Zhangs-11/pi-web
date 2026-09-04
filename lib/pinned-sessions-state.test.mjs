import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const {
  loadPinnedDefaultCollapsed,
  loadPinnedSessionIds,
  savePinnedDefaultCollapsed,
  savePinnedSessionIds,
} = await createJiti(import.meta.url).import("./pinned-sessions-state.ts");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("saves and restores pinned session ids", () => {
  const storage = createStorage();

  savePinnedSessionIds(new Set(["session-1", "session-2", "session-1"]), storage);

  assert.deepEqual([...loadPinnedSessionIds(storage)], ["session-1", "session-2"]);
});

test("removes empty pinned session state", () => {
  const storage = createStorage({
    "pi-web:pinned-session-ids": '["session-1"]',
  });

  savePinnedSessionIds(new Set(), storage);

  assert.equal(storage.values.has("pi-web:pinned-session-ids"), false);
});

test("ignores malformed pinned session state", () => {
  assert.deepEqual([...loadPinnedSessionIds(createStorage({
    "pi-web:pinned-session-ids": "not json",
  }))], []);
  assert.deepEqual([...loadPinnedSessionIds(createStorage({
    "pi-web:pinned-session-ids": '["session-1",3,null]',
  }))], ["session-1"]);
});

test("defaults to expanded and saves the global collapsed preference", () => {
  const storage = createStorage();

  assert.equal(loadPinnedDefaultCollapsed(storage), false);
  savePinnedDefaultCollapsed(true, storage);
  assert.equal(loadPinnedDefaultCollapsed(storage), true);
  savePinnedDefaultCollapsed(false, storage);
  assert.equal(loadPinnedDefaultCollapsed(storage), false);
});

test("falls back safely when browser storage is unavailable", () => {
  const unavailable = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };

  assert.deepEqual([...loadPinnedSessionIds(unavailable)], []);
  assert.equal(loadPinnedDefaultCollapsed(unavailable), false);
  assert.doesNotThrow(() => savePinnedSessionIds(new Set(["session-1"]), unavailable));
  assert.doesNotThrow(() => savePinnedDefaultCollapsed(true, unavailable));
});

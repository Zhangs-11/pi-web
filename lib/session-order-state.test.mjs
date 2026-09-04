import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const {
  loadSessionOrders,
  moveSessionId,
  orderSessionIds,
  saveSessionOrders,
  withProjectSessionOrder,
} = await createJiti(import.meta.url).import("./session-order-state.ts");

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test("loads only valid per-project session orders", () => {
  const storage = memoryStorage({
    "pi-web:session-orders:v1": JSON.stringify({
      "/repo": ["a", "a", "", 1, "b"],
      "": ["ignored"],
      "/empty": [],
      "/invalid": "nope",
    }),
  });

  assert.deepEqual(loadSessionOrders(storage), { "/repo": ["a", "b"] });
});

test("saves normalized orders and removes empty state", () => {
  const storage = memoryStorage();
  saveSessionOrders({ "/repo": ["a", "a", "b"], "/empty": [] }, storage);
  assert.equal(storage.values.get("pi-web:session-orders:v1"), JSON.stringify({ "/repo": ["a", "b"] }));

  saveSessionOrders({}, storage);
  assert.equal(storage.values.has("pi-web:session-orders:v1"), false);
});

test("falls back safely when stored state is malformed or unavailable", () => {
  assert.deepEqual(loadSessionOrders(memoryStorage({ "pi-web:session-orders:v1": "{" })), {});
  assert.deepEqual(loadSessionOrders(undefined), {});
  assert.doesNotThrow(() => saveSessionOrders({ "/repo": ["a"] }, undefined));
});

test("keeps recent order until a project has a manual order", () => {
  assert.deepEqual(orderSessionIds(["newest", "older"], undefined), ["newest", "older"]);
});

test("keeps manually ordered sessions fixed and inserts new sessions first", () => {
  assert.deepEqual(
    orderSessionIds(["new", "b", "a"], ["a", "deleted", "b"]),
    ["new", "a", "b"],
  );
});

test("moves a session before or after a target without duplicating ids", () => {
  assert.deepEqual(moveSessionId(["a", "b", "c"], "c", "a", "before"), ["c", "a", "b"]);
  assert.deepEqual(moveSessionId(["a", "b", "c"], "a", "b", "after"), ["b", "a", "c"]);
  assert.deepEqual(moveSessionId(["a", "b"], "a", "a", "before"), ["a", "b"]);
});

test("updates one project without changing another", () => {
  const orders = { "/one": ["a"], "/two": ["b"] };
  assert.deepEqual(withProjectSessionOrder(orders, "/one", ["c", "a"]), {
    "/one": ["c", "a"],
    "/two": ["b"],
  });
  assert.deepEqual(withProjectSessionOrder(orders, "/one", []), { "/two": ["b"] });
});

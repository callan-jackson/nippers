import { describe, expect, it } from "vitest";
import "./setup";
import { FileStore, CosmosStore } from "../src/lib/store";

describe("FileStore query DSL", () => {
  it("filters, orders, limits and counts", async () => {
    const s = new FileStore(null);
    await s.upsert("bookings", { id: "1", parentId: "p", date: "2026-01-03", status: "pending" });
    await s.upsert("bookings", { id: "2", parentId: "p", date: "2026-01-01", status: "confirmed" });
    await s.upsert("bookings", { id: "3", parentId: "q", date: "2026-01-02", status: "cancelled" });
    const rows = await s.query<{ id: string }>("bookings", { where: [{ field: "status", op: "in", value: ["pending", "confirmed"] }], orderBy: { field: "date" } });
    expect(rows.map((r) => r.id)).toEqual(["2", "1"]);
    expect(await s.count("bookings", { where: [{ field: "date", op: ">=", value: "2026-01-02" }] })).toBe(2);
    expect((await s.query("bookings", { limit: 1, orderBy: { field: "date", desc: true } })).length).toBe(1);
    await s.delete("bookings", "1", "p");
    expect(await s.get("bookings", "1", "p")).toBeNull();
  });
  it("returns copies, not live references", async () => {
    const s = new FileStore(null);
    await s.upsert("users", { id: "u", email: "a" });
    const got = (await s.get<{ id: string; email: string }>("users", "u", "u"))!;
    got.email = "changed";
    expect((await s.get<{ email: string }>("users", "u", "u"))!.email).toBe("a");
  });
});

describe("CosmosStore SQL compilation", () => {
  it("builds parameterised SQL and rejects unsafe field names", () => {
    const store = Object.create(CosmosStore.prototype) as any;
    const q = store.compile({ where: [{ field: "status", op: "in", value: ["a"] }, { field: "date", op: ">=", value: "x" }], orderBy: { field: "date", desc: true }, limit: 5 });
    expect(q.query).toBe("SELECT TOP 5 * FROM c WHERE ARRAY_CONTAINS(@p0, c.status) AND c.date >= @p1 ORDER BY c.date DESC");
    expect(q.parameters).toEqual([{ name: "@p0", value: ["a"] }, { name: "@p1", value: "x" }]);
    expect(() => store.compile({ where: [{ field: "x; DROP", op: "=", value: 1 }] })).toThrow();
    expect(store.compile({}, "VALUE COUNT(1)").query).toBe("SELECT VALUE COUNT(1) FROM c");
  });
});

describe("PostgresStore SQL compilation", async () => {
  const { compile } = await import("../src/lib/postgres");
  it("uses jsonb comparisons so numbers and strings sort correctly", () => {
    const q = compile("bookings", { where: [{ field: "status", op: "in", value: ["a", "b"] }, { field: "date", op: ">=", value: "2026-01-01" }, { field: "archived", op: "!=", value: true }], orderBy: { field: "sort" }, limit: 3 });
    expect(q.text).toBe("SELECT doc FROM docs WHERE container = $1 AND $2::jsonb @> (doc->'status') AND (doc->'date') >= $3::jsonb AND (doc->'archived') IS DISTINCT FROM $4::jsonb ORDER BY doc->'sort' ASC LIMIT 3");
    expect(q.values).toEqual(["bookings", '["a","b"]', '"2026-01-01"', "true"]);
    expect(compile("users", {}, "count").text).toBe("SELECT count(*)::int AS n FROM docs WHERE container = $1");
    expect(() => compile("users", { where: [{ field: "a b", op: "=", value: 1 }] })).toThrow();
  });
});

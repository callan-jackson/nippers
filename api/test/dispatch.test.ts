import { beforeAll, describe, expect, it } from "vitest";
import "./setup";
import { dispatch, matchRoute } from "../src/lib/router";

describe("route matching", () => {
  it("extracts params and rejects non-matches", () => {
    expect(matchRoute("manage/bookings/{id}", "manage/bookings/abc")).toEqual({ id: "abc" });
    expect(matchRoute("manage/bookings/{id}", "manage/bookings")).toBeNull();
    expect(matchRoute("auth/me", "/auth/me/")).toEqual({});
  });
});

describe("dispatch (Fetch-API adapter used by Netlify)", () => {
  beforeAll(async () => {
    await import("../src/routes");
  });
  const quiet = { log() {}, error() {} };

  it("serves public site data", async () => {
    const res = await dispatch(new Request("http://localhost/api/public/site"), quiet);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessions.length).toBeGreaterThan(0);
    expect(res.headers.get("cache-control")).toContain("max-age");
  });

  it("returns 404 / 405 / 401 appropriately", async () => {
    expect((await dispatch(new Request("http://localhost/api/nope"), quiet)).status).toBe(404);
    expect((await dispatch(new Request("http://localhost/api/auth/me", { method: "DELETE" }), quiet)).status).toBe(405);
    expect((await dispatch(new Request("http://localhost/api/bookings"), quiet)).status).toBe(401);
  });

  it("registers, sets a session cookie, and reads it back", async () => {
    const body = { email: "t@example.com", password: "Passw0rd1", firstName: "T", lastName: "U", phone: "07700900000", addressLine1: "1 St", town: "Newhaven", postcode: "BN9 0BT" };
    const reg = await dispatch(new Request("http://localhost/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), quiet);
    expect(reg.status).toBe(201);
    const cookie = reg.headers.get("set-cookie")!;
    expect(cookie).toContain("nippers_session=");
    const me = await dispatch(new Request("http://localhost/api/auth/me", { headers: { cookie: cookie.split(";")[0] } }), quiet);
    expect((await me.json()).user.email).toBe("t@example.com");
  });

  it("blocks cross-site form posts", async () => {
    const res = await dispatch(new Request("http://localhost/api/auth/logout", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://evil.example" }, body: "x=1" }), quiet);
    expect(res.status).toBe(415);
  });
});

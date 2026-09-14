import { describe, expect, it } from "vitest";
import "./setup";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../src/lib/auth";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("Correct horse 1");
    const b = await hashPassword("Correct horse 1");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Correct horse 1", a)).toBe(true);
    expect(await verifyPassword("Correct horse 2", a)).toBe(false);
  });
  it("rejects malformed hashes", async () => {
    expect(await verifyPassword("x", "plain")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips claims", async () => {
    const t = await signToken({ sub: "u1", email: "a@b.c", role: "parent", name: "A B" });
    expect(await verifyToken(t)).toEqual({ sub: "u1", email: "a@b.c", role: "parent", name: "A B" });
  });
  it("rejects tampering", async () => {
    const t = await signToken({ sub: "u1", email: "a@b.c", role: "parent", name: "A B" });
    await expect(verifyToken(t.slice(0, -2) + "xx")).rejects.toThrow();
  });
});

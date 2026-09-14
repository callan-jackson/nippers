import { randomBytes, scrypt as _scrypt, timingSafeEqual, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "../shared/types";

const scrypt = (pw: string, salt: Buffer, len: number, opts: { N: number }) =>
  new Promise<Buffer>((res, rej) => _scrypt(pw, salt, len, opts, (e, k) => (e ? rej(e) : res(k))));

// scrypt with a per-user salt — built into Node, no native modules to build
// on the Functions host. Format: scrypt$N$salt$hash (all base64url).
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const N = 16384;
  const hash = await scrypt(password.normalize("NFKC"), salt, 64, { N });
  return `scrypt$${N}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, saltB, hashB] = stored.split("$");
  if (alg !== "scrypt") return false;
  const salt = Buffer.from(saltB, "base64url");
  const expected = Buffer.from(hashB, "base64url");
  const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, { N: Number(n) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export interface AuthClaims {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export const SESSION_DAYS = 14;

export async function signToken(claims: AuthClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer("nippers")
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<AuthClaims> {
  const { payload } = await jwtVerify(token, secret(), { issuer: "nippers" });
  return {
    sub: payload.sub!,
    email: payload.email as string,
    role: payload.role as Role,
    name: payload.name as string,
  };
}

export function sessionCookie(token: string | null, req: { headers: { get(n: string): string | null } }): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const secure = proto === "https" ? "; Secure" : "";
  if (!token) return `nippers_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  return `nippers_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function newId(): string {
  return randomUUID();
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

import type { Req as HttpRequest, Res as HttpResponseInit, Ctx as InvocationContext } from "./router";
import { ZodSchema, ZodError } from "zod";
import { verifyToken, AuthClaims } from "./auth";
import type { Role } from "../shared/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: { "Cache-Control": "no-store", ...headers },
  };
}

export function noContent(headers: Record<string, string> = {}): HttpResponseInit {
  return { status: 204, headers };
}

export async function parseBody<T>(req: HttpRequest, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "Please check the form", flatten(result.error));
  return result.data;
}

function flatten(err: ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function getCookie(req: HttpRequest, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export const SESSION_COOKIE = "nippers_session";

export async function currentUser(req: HttpRequest): Promise<AuthClaims | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireUser(req: HttpRequest, role?: Role): Promise<AuthClaims> {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "Please sign in");
  if (role === "admin" && user.role !== "admin") throw new HttpError(403, "Admin access required");
  return user;
}

// Behind Static Web Apps the function's own Host header is internal, so the
// public origin is taken from APP_URL (set at deploy) with sensible fallbacks.
function originAllowed(origin: string, req: HttpRequest): boolean {
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return true;
  if (host.endsWith(".azurestaticapps.net")) return true;
  const allowed = new Set<string>();
  if (process.env.APP_URL) {
    try {
      allowed.add(new URL(process.env.APP_URL).host);
    } catch {
      /* ignore bad APP_URL */
    }
  }
  for (const h of [req.headers.get("x-forwarded-host"), req.headers.get("host")]) if (h) allowed.add(h);
  return allowed.has(host);
}

// Wraps a handler with error → JSON translation and a light CSRF check:
// state-changing requests must be JSON (so a cross-site form post cannot
// reach them) and, when present, Origin must match the app itself.
type Handler = (req: HttpRequest, ctx: InvocationContext) => Promise<HttpResponseInit>;

export function handler(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      // DELETE has no body and cannot be sent by an HTML form, so only Origin is checked for it.
      if (!["GET", "HEAD", "OPTIONS", "DELETE"].includes(req.method)) {
        const ct = req.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) throw new HttpError(415, "Expected application/json");
      }
      if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
        const origin = req.headers.get("origin");
        if (origin && !originAllowed(origin, req)) throw new HttpError(403, "Cross-site request blocked");
      }
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return json({ error: e.message, details: e.details }, e.status);
      }
      ctx.error("Unhandled error", e);
      return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
  };
}

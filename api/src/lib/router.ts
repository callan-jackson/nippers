// Platform-neutral route registry. Handlers are written once against these
// minimal request/response shapes; thin adapters register them with Azure
// Functions (src/index.ts) or Netlify Functions (netlify/api.mts).

export interface Req {
  method: string;
  headers: { get(name: string): string | null };
  params: Record<string, string>;
  query: { get(name: string): string | null };
  json(): Promise<unknown>;
}

export interface Res {
  status?: number;
  jsonBody?: unknown;
  body?: string | Uint8Array;
  headers?: Record<string, string>;
}

export interface Ctx {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export type Handler = (req: Req, ctx: Ctx) => Promise<Res>;

export interface Route {
  name: string;
  route: string; // e.g. "manage/bookings/{id}"
  methods: string[];
  handler: Handler;
}

export const routes: Route[] = [];

export const app = {
  http(name: string, opts: { route: string; methods: string[]; authLevel?: string; handler: Handler }) {
    routes.push({ name, route: opts.route, methods: opts.methods.map((m) => m.toUpperCase()), handler: opts.handler });
  },
};

// Matches "manage/bookings/{id}" against "manage/bookings/abc" → { id: "abc" }.
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/");
  const s = path.replace(/^\/+|\/+$/g, "").split("/");
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const m = /^\{(\w+)\}$/.exec(p[i]);
    if (m) params[m[1]] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

// Dispatches a Fetch-API Request (Netlify, tests) to the registered routes.
export async function dispatch(request: Request, ctx: Ctx = console): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  let pathMatched = false;
  for (const r of routes) {
    const params = matchRoute(r.route, path);
    if (!params) continue;
    pathMatched = true;
    if (!r.methods.includes(request.method)) continue;
    const req: Req = {
      method: request.method,
      headers: request.headers,
      params,
      query: url.searchParams,
      json: () => request.json(),
    };
    const res = await r.handler(req, ctx);
    const headers = new Headers(res.headers ?? {});
    let body: string | Uint8Array | null = null;
    if (res.jsonBody !== undefined) {
      body = JSON.stringify(res.jsonBody);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    } else if (res.body !== undefined) {
      body = res.body;
    }
    return new Response(body as BodyInit | null, { status: res.status ?? 200, headers });
  }
  return new Response(JSON.stringify({ error: pathMatched ? "Method not allowed" : "Not found" }), {
    status: pathMatched ? 405 : 404,
    headers: { "content-type": "application/json" },
  });
}

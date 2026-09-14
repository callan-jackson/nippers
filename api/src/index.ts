// Azure Functions entrypoint: registers every route with the Functions host.
import { app as azure, HttpRequest, InvocationContext } from "@azure/functions";
import { routes } from "./lib/router";
import "./functions/auth";
import "./functions/public";
import "./functions/children";
import "./functions/bookings";
import "./functions/admin";

for (const r of routes) {
  azure.http(r.name, {
    route: r.route,
    methods: r.methods as never,
    authLevel: "anonymous",
    handler: (req: HttpRequest, ctx: InvocationContext) =>
      r.handler(
        { method: req.method, headers: req.headers, params: req.params, query: req.query, json: () => req.json() },
        { log: (...a) => ctx.log(...a), error: (...a) => ctx.error(...a) },
      ) as never,
  });
}

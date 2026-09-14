import { app } from "@azure/functions";
import { getStore } from "../lib/store";
import { handler, json, parseBody, HttpError, requireUser, noContent } from "../lib/http";
import { childSchema } from "../shared/schemas";
import { newId } from "../lib/auth";
import type { Child, Booking } from "../shared/types";

app.http("children-list", {
  route: "children",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const user = await requireUser(req);
    const children = await getStore().query<Child>("children", {
      where: [{ field: "parentId", op: "=", value: user.sub }],
      orderBy: { field: "createdAt" },
    });
    return json({ children: children.filter((c) => !c.archived) });
  }),
});

app.http("children-create", {
  route: "children",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const user = await requireUser(req);
    const input = await parseBody(req, childSchema);
    const existing = await getStore().count("children", { where: [{ field: "parentId", op: "=", value: user.sub }] });
    if (existing >= 10) throw new HttpError(400, "Please contact the office to add more than 10 children");
    const child: Child = { id: newId(), parentId: user.sub, ...input, createdAt: new Date().toISOString(), archived: false };
    await getStore().upsert("children", child);
    return json({ child }, 201);
  }),
});

app.http("children-update", {
  route: "children/{id}",
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const user = await requireUser(req);
    const input = await parseBody(req, childSchema);
    const child = await getStore().get<Child>("children", req.params.id, user.sub);
    if (!child || child.parentId !== user.sub) throw new HttpError(404, "Child not found");
    const updated: Child = { ...child, ...input };
    await getStore().upsert("children", updated);
    // Keep denormalised names on bookings in sync
    const bookings = await getStore().query<Booking>("bookings", { where: [{ field: "childId", op: "=", value: child.id }] });
    for (const b of bookings) {
      const name = `${updated.firstName} ${updated.lastName}`;
      if (b.childName !== name) await getStore().upsert("bookings", { ...b, childName: name });
    }
    return json({ child: updated });
  }),
});

app.http("children-delete", {
  route: "children/{id}",
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const user = await requireUser(req);
    const child = await getStore().get<Child>("children", req.params.id, user.sub);
    if (!child || child.parentId !== user.sub) throw new HttpError(404, "Child not found");
    const live = await getStore().count("bookings", {
      where: [{ field: "childId", op: "=", value: child.id }, { field: "status", op: "in", value: ["pending", "confirmed"] }],
    });
    if (live > 0) throw new HttpError(400, "This child has upcoming bookings. Cancel them first or contact the office.");
    // Archive rather than delete so historical bookings keep their context
    await getStore().upsert("children", { ...child, archived: true });
    return noContent();
  }),
});

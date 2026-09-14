import { app, HttpRequest } from "@azure/functions";
import { getStore } from "../lib/store";
import { handler, json, parseBody, HttpError, requireUser, noContent } from "../lib/http";
import {
  bookingStatusUpdateSchema,
  bulkBookingUpdateSchema,
  sessionTypeSchema,
  calendarSchema,
  testimonialSchema,
  galleryUploadSchema,
  galleryUpdateSchema,
  policySchema,
  announcementSchema,
  settingsSchema,
  adminUserUpdateSchema,
} from "../shared/schemas";
import { getSettings, getSessionTypes, getCalendar } from "../lib/content";
import { newId } from "../lib/auth";
import { sendMail, layout, button } from "../lib/email";
import { addDays, formatUK, today } from "../lib/dates";
import { z } from "zod";
import type { Booking, Child, User, AdminStats, ContactMessage, Testimonial, GalleryImage, Policy, Announcement } from "../shared/types";

const admin = (fn: (req: HttpRequest, ctx: any) => Promise<any>) =>
  handler(async (req, ctx) => {
    await requireUser(req, "admin");
    return fn(req, ctx);
  });

async function bookingById(id: string): Promise<Booking | null> {
  const rows = await getStore().query<Booking>("bookings", { where: [{ field: "id", op: "=", value: id }], limit: 1 });
  return rows[0] ?? null;
}

async function userById(id: string): Promise<(User & { passwordHash?: string }) | null> {
  return getStore().get("users", id, id);
}

function appUrl(): string {
  return (process.env.APP_URL ?? "").replace(/\/$/, "");
}

// ---- Dashboard -------------------------------------------------------------
app.http("admin-stats", {
  route: "manage/stats",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: admin(async () => {
    const store = getStore();
    const t = today();
    const [pendingBookings, confirmedThisWeek, childrenRegistered, parentsRegistered, unreadMessages, upcoming] = await Promise.all([
      store.count("bookings", { where: [{ field: "status", op: "=", value: "pending" }] }),
      store.count("bookings", { where: [{ field: "status", op: "=", value: "confirmed" }, { field: "date", op: ">=", value: t }, { field: "date", op: "<=", value: addDays(t, 6) }] }),
      store.count("children", { where: [{ field: "archived", op: "!=", value: true }] }),
      store.count("users", { where: [{ field: "role", op: "=", value: "parent" }] }),
      store.count("messages", { where: [{ field: "read", op: "=", value: false }] }),
      store.query<Booking>("bookings", { where: [{ field: "date", op: ">=", value: t }, { field: "status", op: "in", value: ["pending", "confirmed"] }], orderBy: { field: "date" }, limit: 12 }),
    ]);
    const stats: AdminStats = { pendingBookings, confirmedThisWeek, childrenRegistered, parentsRegistered, unreadMessages, upcoming };
    return json(stats);
  }),
});

// ---- Bookings --------------------------------------------------------------
app.http("admin-bookings", {
  route: "manage/bookings",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    const from = req.query.get("from") ?? today();
    const to = req.query.get("to") ?? addDays(from, 60);
    const status = req.query.get("status");
    const where: any[] = [
      { field: "date", op: ">=", value: from },
      { field: "date", op: "<=", value: to },
    ];
    if (status && status !== "all") where.push({ field: "status", op: "=", value: status });
    const bookings = await getStore().query<Booking>("bookings", { where, orderBy: { field: "date" } });
    return json({ bookings });
  }),
});

app.http("admin-booking-update", {
  route: "manage/bookings/{id}",
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: admin(async (req, ctx) => {
    const input = await parseBody(req, bookingStatusUpdateSchema);
    const b = await bookingById(req.params.id);
    if (!b) throw new HttpError(404, "Booking not found");
    const prev = b.status;
    const updated: Booking = { ...b, status: input.status, adminNotes: input.adminNotes || undefined, updatedAt: new Date().toISOString() };
    await getStore().upsert("bookings", updated);
    if (prev !== updated.status) await notifyParent([updated], (m) => ctx.log(m));
    return json({ booking: updated });
  }),
});

app.http("admin-bookings-bulk", {
  route: "manage/bookings/bulk",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: admin(async (req, ctx) => {
    const { ids, status } = await parseBody(req, bulkBookingUpdateSchema);
    const changed: Booking[] = [];
    for (const id of ids) {
      const b = await bookingById(id);
      if (!b || b.status === status) continue;
      const u: Booking = { ...b, status, updatedAt: new Date().toISOString() };
      await getStore().upsert("bookings", u);
      changed.push(u);
    }
    // One email per parent rather than one per session
    const byParent = new Map<string, Booking[]>();
    for (const b of changed) byParent.set(b.parentId, [...(byParent.get(b.parentId) ?? []), b]);
    for (const list of byParent.values()) await notifyParent(list, (m) => ctx.log(m));
    return json({ updated: changed.length });
  }),
});

async function notifyParent(list: Booking[], log: (m: string) => void) {
  const parent = await userById(list[0].parentId);
  if (!parent) return;
  const status = list[0].status;
  const settings = await getSettings();
  const lines = list.map((b) => `${formatUK(b.date)} — ${b.childName} — ${b.sessionLabel} — £${b.price.toFixed(2)}`);
  const total = list.reduce((t, b) => t + b.price, 0);
  const titles: Record<string, string> = {
    confirmed: "Your booking is confirmed",
    declined: "We couldn't confirm your booking",
    cancelled: "Your booking has been cancelled",
    pending: "Your booking is back under review",
  };
  const extra =
    status === "confirmed"
      ? `<p><b>Total: £${total.toFixed(2)}</b></p><p>${settings.paymentInstructions}</p>${settings.bankDetails ? `<p style="white-space:pre-wrap;background:#f6f8fb;padding:12px;border-radius:8px">${settings.bankDetails}</p>` : ""}`
      : status === "declined"
        ? `<p>${list[0].adminNotes ? list[0].adminNotes : "Unfortunately we don't have space for the session(s) below. Please get in touch and we'll do our best to help."}</p>`
        : "";
  await sendMail(
    {
      to: parent.email,
      subject: `${titles[status]} — N.I.P.P.E.R.S.`,
      text: `${titles[status]}\n\n${lines.join("\n")}\n\n${status === "confirmed" ? `Total £${total.toFixed(2)}\n${settings.paymentInstructions}` : ""}`,
      html: layout(titles[status], `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>${extra}${appUrl() ? button(`${appUrl()}/account/bookings`, "View my bookings") : ""}`),
    },
    log,
  );
}

// Daily register: everyone expected on a given date, with the info staff need.
app.http("admin-register", {
  route: "manage/register",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    const date = req.query.get("date") ?? today();
    const store = getStore();
    const bookings = await store.query<Booking>("bookings", { where: [{ field: "date", op: "=", value: date }, { field: "status", op: "in", value: ["pending", "confirmed"] }] });
    const childIds = [...new Set(bookings.map((b) => b.childId))];
    const parentIds = [...new Set(bookings.map((b) => b.parentId))];
    const [children, parents] = await Promise.all([
      childIds.length ? store.query<Child>("children", { where: [{ field: "id", op: "in", value: childIds }] }) : [],
      parentIds.length ? store.query<User & { passwordHash?: string }>("users", { where: [{ field: "id", op: "in", value: parentIds }] }) : [],
    ]);
    const childMap = new Map(children.map((c) => [c.id, c]));
    const parentMap = new Map(parents.map((p) => [p.id, p]));
    const rows = bookings
      .map((b) => {
        const c = childMap.get(b.childId);
        const p = parentMap.get(b.parentId);
        return {
          booking: b,
          child: c ? { firstName: c.firstName, lastName: c.lastName, dob: c.dob, school: c.school, yearGroup: c.yearGroup, allergies: c.allergies, dietary: c.dietary, medical: c.medical, additionalNeeds: c.additionalNeeds, emergencyContacts: c.emergencyContacts, photoConsent: c.photoConsent } : null,
          parent: p ? { name: `${p.firstName} ${p.lastName}`, phone: p.phone, email: p.email } : null,
        };
      })
      .sort((a, b) => a.booking.sessionLabel.localeCompare(b.booking.sessionLabel) || a.booking.childName.localeCompare(b.booking.childName));
    return json({ date, rows, sessions: await getSessionTypes(true) });
  }),
});

// ---- People ----------------------------------------------------------------
app.http("admin-users", {
  route: "manage/users",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: admin(async () => {
    const users = await getStore().query<User & { passwordHash?: string; failedLogins?: number; lockedUntil?: string }>("users", { orderBy: { field: "createdAt", desc: true } });
    return json({ users: users.map(({ passwordHash, failedLogins, lockedUntil, ...u }) => u) });
  }),
});

app.http("admin-user-update", {
  route: "manage/users/{id}",
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    const me = await requireUser(req, "admin");
    const input = await parseBody(req, adminUserUpdateSchema);
    const u = await userById(req.params.id);
    if (!u) throw new HttpError(404, "User not found");
    if (u.id === me.sub && (input.role === "parent" || input.disabled)) throw new HttpError(400, "You can't demote or disable your own account");
    const updated = { ...u, ...input };
    await getStore().upsert("users", updated);
    const { passwordHash, ...pub } = updated;
    return json({ user: pub });
  }),
});

app.http("admin-children", {
  route: "manage/children",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: admin(async () => {
    const store = getStore();
    const [children, users] = await Promise.all([
      store.query<Child>("children", { orderBy: { field: "lastName" } }),
      store.query<User & { passwordHash?: string }>("users", {}),
    ]);
    const parents = new Map(users.map((u) => [u.id, { name: `${u.firstName} ${u.lastName}`, phone: u.phone, email: u.email }]));
    return json({ children: children.filter((c) => !c.archived).map((c) => ({ ...c, parent: parents.get(c.parentId) ?? null })) });
  }),
});

// ---- Sessions, calendar, settings -----------------------------------------
app.http("admin-sessions", {
  route: "manage/sessions",
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    if (req.method === "GET") return json({ sessions: await getSessionTypes(true) });
    const input = await parseBody(req, z.object({ sessions: z.array(sessionTypeSchema).min(1).max(20) }));
    const store = getStore();
    const existing = await getSessionTypes(true);
    const keep = new Set(input.sessions.map((s) => s.id));
    for (const s of existing) if (!keep.has(s.id)) await store.delete("content", s.id, "sessionType");
    for (const s of input.sessions) await store.upsert("content", { ...s, type: "sessionType" });
    return json({ sessions: await getSessionTypes(true) });
  }),
});

app.http("admin-calendar", {
  route: "manage/calendar",
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    if (req.method === "GET") return json({ calendar: await getCalendar() });
    const input = await parseBody(req, calendarSchema);
    for (const r of [...input.holidayPeriods, ...input.closures]) if (r.end < r.start) throw new HttpError(400, `"${r.label}" ends before it starts`);
    await getStore().upsert("content", { ...input, id: "calendar", type: "calendar" });
    return json({ calendar: await getCalendar() });
  }),
});

app.http("admin-settings", {
  route: "manage/settings",
  methods: ["GET", "PUT"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    if (req.method === "GET") return json({ settings: await getSettings() });
    const input = await parseBody(req, settingsSchema);
    await getStore().upsert("content", { ...input, id: "settings", type: "settings" });
    return json({ settings: await getSettings() });
  }),
});

// ---- Content collections (testimonials, policies, announcements, gallery) --
function collection<T extends { id: string }>(name: string, type: string, schema: z.ZodType<any>, orderBy: string, decorate?: (doc: any, existing?: T) => any) {
  app.http(`admin-${name}-list`, {
    route: `manage/${name}`,
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    handler: admin(async (req) => {
      const store = getStore();
      if (req.method === "GET") {
        const items = await store.query<T>("content", { where: [{ field: "type", op: "=", value: type }], orderBy: { field: orderBy } });
        return json({ items: items.map(stripData) });
      }
      const input = await parseBody(req, schema);
      const doc = { id: newId(), type, ...input, ...(decorate ? decorate(input) : {}) };
      await store.upsert("content", doc);
      return json({ item: stripData(doc) }, 201);
    }),
  });
  app.http(`admin-${name}-item`, {
    route: `manage/${name}/{id}`,
    methods: ["PUT", "DELETE"],
    authLevel: "anonymous",
    handler: admin(async (req) => {
      const store = getStore();
      const existing = await store.get<T>("content", req.params.id, type);
      if (!existing) throw new HttpError(404, "Not found");
      if (req.method === "DELETE") {
        await store.delete("content", req.params.id, type);
        return noContent();
      }
      const input = await parseBody(req, schema);
      const doc = { ...existing, ...input, ...(decorate ? decorate(input, existing) : {}) };
      await store.upsert("content", doc);
      return json({ item: stripData(doc) });
    }),
  });
}

function stripData<T extends object>(doc: T): T {
  const { data, ...rest } = doc as any;
  return rest;
}

collection<Testimonial>("testimonials", "testimonial", testimonialSchema, "sort");
collection<Policy>("policies", "policy", policySchema, "sort", () => ({ updatedAt: new Date().toISOString() }));
collection<Announcement>("announcements", "announcement", announcementSchema, "startsAt");

// Gallery has a different create (upload) and update (metadata only) shape.
app.http("admin-gallery", {
  route: "manage/gallery",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    const store = getStore();
    if (req.method === "GET") {
      const items = await store.query<GalleryImage>("content", { where: [{ field: "type", op: "=", value: "gallery" }], orderBy: { field: "sort" } });
      return json({ items: items.map(stripData) });
    }
    const input = await parseBody(req, galleryUploadSchema);
    const count = await store.count("content", { where: [{ field: "type", op: "=", value: "gallery" }] });
    if (count >= 60) throw new HttpError(400, "Gallery is full (60 photos) — remove some first");
    const doc: GalleryImage & { type: string } = { id: newId(), type: "gallery", ...input, caption: input.caption ?? "", published: input.published ?? true, sort: count, createdAt: new Date().toISOString() };
    await store.upsert("content", doc);
    return json({ item: stripData(doc) }, 201);
  }),
});

app.http("admin-gallery-item", {
  route: "manage/gallery/{id}",
  methods: ["PUT", "DELETE"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    const store = getStore();
    const existing = await store.get<GalleryImage>("content", req.params.id, "gallery");
    if (!existing) throw new HttpError(404, "Not found");
    if (req.method === "DELETE") {
      await store.delete("content", req.params.id, "gallery");
      return noContent();
    }
    const input = await parseBody(req, galleryUpdateSchema);
    const doc = { ...existing, ...input };
    await store.upsert("content", doc);
    return json({ item: stripData(doc) });
  }),
});

// Admin preview of any gallery image, published or not
app.http("admin-gallery-image", {
  route: "manage/gallery/{id}/image",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    const img = await getStore().get<GalleryImage>("content", req.params.id, "gallery");
    if (!img?.data) throw new HttpError(404, "Not found");
    return { status: 200, body: Buffer.from(img.data, "base64"), headers: { "Content-Type": img.contentType, "Cache-Control": "private, max-age=3600" } };
  }),
});

// ---- Messages --------------------------------------------------------------
app.http("admin-messages", {
  route: "manage/messages",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: admin(async () => json({ messages: await getStore().query<ContactMessage>("messages", { orderBy: { field: "createdAt", desc: true }, limit: 200 }) })),
});

app.http("admin-message-update", {
  route: "manage/messages/{id}",
  methods: ["PUT", "DELETE"],
  authLevel: "anonymous",
  handler: admin(async (req) => {
    const store = getStore();
    const m = await store.get<ContactMessage>("messages", req.params.id, req.params.id);
    if (!m) throw new HttpError(404, "Not found");
    if (req.method === "DELETE") {
      await store.delete("messages", m.id, m.id);
      return noContent();
    }
    const { read } = await parseBody(req, z.object({ read: z.boolean() }));
    await store.upsert("messages", { ...m, read });
    return json({ message: { ...m, read } });
  }),
});

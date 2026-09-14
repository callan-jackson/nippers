import { app } from "@azure/functions";
import { getStore } from "../lib/store";
import { handler, json, parseBody, HttpError } from "../lib/http";
import { getSettings, getSessionTypes, getCalendar, ensureSeed } from "../lib/content";
import { availability } from "../lib/bookings";
import { contactSchema } from "../shared/schemas";
import { sendMail, layout } from "../lib/email";
import { newId } from "../lib/auth";
import { addDays, today } from "../lib/dates";
import type { Testimonial, GalleryImage, Policy, Announcement } from "../shared/types";

const PUBLIC_CACHE = { "Cache-Control": "public, max-age=60" };

// One round-trip for everything the marketing pages need.
app.http("public-site", {
  route: "public/site",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handler(async (_req, ctx) => {
    await ensureSeed((m) => ctx.log(m));
    const store = getStore();
    const now = new Date().toISOString();
    const [settings, sessions, calendar, testimonials, gallery, policies, announcements] = await Promise.all([
      getSettings(),
      getSessionTypes(),
      getCalendar(),
      store.query<Testimonial>("content", { where: [{ field: "type", op: "=", value: "testimonial" }, { field: "published", op: "=", value: true }], orderBy: { field: "sort" } }),
      store.query<GalleryImage>("content", { where: [{ field: "type", op: "=", value: "gallery" }, { field: "published", op: "=", value: true }], orderBy: { field: "sort" } }),
      store.query<Policy>("content", { where: [{ field: "type", op: "=", value: "policy" }, { field: "published", op: "=", value: true }], orderBy: { field: "sort" } }),
      store.query<Announcement>("content", { where: [{ field: "type", op: "=", value: "announcement" }, { field: "endsAt", op: ">=", value: now }] }),
    ]);
    const { bankDetails, ...publicSettings } = settings;
    return json(
      {
        settings: publicSettings,
        sessions,
        calendar: { holidayPeriods: calendar.holidayPeriods, closures: calendar.closures, bookingCutoffHours: calendar.bookingCutoffHours },
        testimonials,
        gallery: gallery.map(({ data, ...g }) => g),
        policies,
        announcements: announcements.filter((a) => a.startsAt <= now),
      },
      200,
      PUBLIC_CACHE,
    );
  }),
});

app.http("public-gallery-image", {
  route: "public/gallery/{id}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const id = req.params.id;
    const img = await getStore().get<GalleryImage>("content", id, "gallery");
    if (!img || !img.published || !img.data) throw new HttpError(404, "Not found");
    return {
      status: 200,
      body: Buffer.from(img.data, "base64"),
      headers: { "Content-Type": img.contentType, "Cache-Control": "public, max-age=86400, immutable" },
    };
  }),
});

app.http("public-availability", {
  route: "public/availability",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const from = req.query.get("from") ?? today();
    const to = req.query.get("to") ?? addDays(from, 41);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError(400, "Bad date");
    if (to < from || addDays(from, 92) < to) throw new HttpError(400, "Range must be 1–92 days");
    return json({ days: await availability(from, to) });
  }),
});

app.http("public-contact", {
  route: "public/contact",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req, ctx) => {
    const input = await parseBody(req, contactSchema);
    if (input.website) return json({ ok: true }); // honeypot filled by a bot — pretend success
    const { website, ...rest } = input;
    const msg = { id: newId(), ...rest, createdAt: new Date().toISOString(), read: false };
    await getStore().upsert("messages", msg);
    const settings = await getSettings();
    void sendMail(
      {
        to: settings.email,
        subject: `Website enquiry: ${msg.subject}`,
        text: `From: ${msg.name} <${msg.email}> ${msg.phone ?? ""}\n\n${msg.message}`,
        html: layout(`New enquiry from ${msg.name}`, `<p><b>Email:</b> ${msg.email}<br><b>Phone:</b> ${msg.phone || "—"}<br><b>Subject:</b> ${msg.subject}</p><p style="white-space:pre-wrap">${escapeHtml(msg.message)}</p>`),
      },
      (m) => ctx.log(m),
    );
    return json({ ok: true }, 201);
  }),
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

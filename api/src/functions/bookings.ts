import { app } from "../lib/router";
import { getStore } from "../lib/store";
import { handler, json, parseBody, HttpError, requireUser } from "../lib/http";
import { bookingRequestSchema } from "../shared/schemas";
import { validateRequest } from "../lib/bookings";
import { getSettings } from "../lib/content";
import { newId } from "../lib/auth";
import { sendMail, layout } from "../lib/email";
import { formatUK, today } from "../lib/dates";
import type { Booking, Child } from "../shared/types";

app.http("bookings-list", {
  route: "bookings",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const user = await requireUser(req);
    const bookings = await getStore().query<Booking>("bookings", {
      where: [{ field: "parentId", op: "=", value: user.sub }],
      orderBy: { field: "date", desc: true },
    });
    const settings = await getSettings();
    return json({ bookings, paymentInstructions: settings.paymentInstructions, bankDetails: settings.bankDetails ?? "" });
  }),
});

app.http("bookings-create", {
  route: "bookings",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req, ctx) => {
    const user = await requireUser(req);
    const settings = await getSettings();
    if (!settings.bookingsOpen) throw new HttpError(400, "Online bookings are paused at the moment — please contact the office.");
    const input = await parseBody(req, bookingRequestSchema);
    const store = getStore();

    const children = await store.query<Child>("children", { where: [{ field: "parentId", op: "=", value: user.sub }] });
    const childMap = new Map(children.filter((c) => !c.archived).map((c) => [c.id, c]));
    for (const it of input.items) if (!childMap.has(it.childId)) throw new HttpError(400, "One of the children isn't on your account");

    const existing = await store.query<Booking>("bookings", { where: [{ field: "parentId", op: "=", value: user.sub }, { field: "date", op: ">=", value: today() }] });
    const { problems, sessions } = await validateRequest(input.items, existing);
    if (problems.length) throw new HttpError(409, "Some sessions couldn't be booked", { problems });

    const requestId = newId();
    const now = new Date().toISOString();
    const created: Booking[] = [];
    for (const it of input.items) {
      const s = sessions.get(it.sessionTypeId)!;
      const child = childMap.get(it.childId)!;
      const b: Booking = {
        id: newId(),
        requestId,
        parentId: user.sub,
        childId: it.childId,
        date: it.date,
        sessionTypeId: s.id,
        club: s.club,
        price: s.price,
        status: "pending",
        notes: input.notes || undefined,
        createdAt: now,
        updatedAt: now,
        childName: `${child.firstName} ${child.lastName}`,
        parentName: user.name,
        sessionLabel: `${s.label} (${s.start}–${s.end})`,
      };
      await store.upsert("bookings", b);
      created.push(b);
    }
    const total = created.reduce((t, b) => t + b.price, 0);
    const lines = created.map((b) => `${formatUK(b.date)} — ${b.childName} — ${b.sessionLabel} — £${b.price.toFixed(2)}`);
    void sendMail(
      {
        to: user.email,
        subject: `Booking request received (${created.length} session${created.length > 1 ? "s" : ""})`,
        text: `Thanks — we've received your request and will confirm shortly.\n\n${lines.join("\n")}\n\nTotal: £${total.toFixed(2)}`,
        html: layout("We've received your booking request", `<p>Thanks! Our team will confirm within two working days. You'll get another email when it's confirmed.</p><ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul><p><b>Total: £${total.toFixed(2)}</b></p>`),
      },
      (m) => ctx.log(m),
    );
    void sendMail(
      {
        to: settings.email,
        subject: `New booking request from ${user.name}`,
        text: lines.join("\n"),
        html: layout(`New booking request from ${user.name}`, `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>${input.notes ? `<p><b>Notes:</b> ${input.notes}</p>` : ""}<p>Review it in the admin dashboard.</p>`),
      },
      (m) => ctx.log(m),
    );
    return json({ bookings: created, total }, 201);
  }),
});

app.http("bookings-cancel", {
  route: "bookings/{id}/cancel",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const user = await requireUser(req);
    const store = getStore();
    const b = await store.get<Booking>("bookings", req.params.id, user.sub);
    if (!b || b.parentId !== user.sub) throw new HttpError(404, "Booking not found");
    if (b.status === "cancelled" || b.status === "declined") throw new HttpError(400, "This booking is already closed");
    if (b.date < today()) throw new HttpError(400, "Past sessions can't be cancelled online");
    const updated: Booking = { ...b, status: "cancelled", updatedAt: new Date().toISOString() };
    await store.upsert("bookings", updated);
    return json({ booking: updated });
  }),
});

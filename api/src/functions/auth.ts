import { app, type Req as HttpRequest } from "../lib/router";
import { getStore } from "../lib/store";
import { handler, json, parseBody, HttpError, requireUser, currentUser } from "../lib/http";
import { hashPassword, verifyPassword, signToken, sessionCookie, newId, newToken } from "../lib/auth";
import { registerSchema, loginSchema, forgotSchema, resetSchema, profileSchema, changePasswordSchema } from "../shared/schemas";
import { sendMail, layout, button } from "../lib/email";
import { ensureSeed } from "../lib/content";
import type { User } from "../shared/types";

interface StoredUser extends User {
  passwordHash: string;
  failedLogins: number;
  lockedUntil?: string;
}

function publicUser(u: StoredUser): User {
  const { passwordHash, failedLogins, lockedUntil, ...rest } = u;
  return rest;
}

async function findByEmail(email: string): Promise<StoredUser | null> {
  const rows = await getStore().query<StoredUser>("users", { where: [{ field: "email", op: "=", value: email }] });
  return rows[0] ?? null;
}

function appUrl(req: HttpRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:4280";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

app.http("auth-register", {
  route: "auth/register",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req, ctx) => {
    await ensureSeed((m) => ctx.log(m));
    const input = await parseBody(req, registerSchema);
    if (await findByEmail(input.email)) throw new HttpError(409, "An account with this email already exists", { email: "Already registered — try signing in" });
    const { password, ...rest } = input;
    const user: StoredUser = {
      id: newId(),
      ...rest,
      role: "parent",
      disabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      passwordHash: await hashPassword(password),
      failedLogins: 0,
    };
    await getStore().upsert("users", user);
    const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` });
    void sendMail(
      {
        to: user.email,
        subject: "Welcome to N.I.P.P.E.R.S.",
        text: `Hi ${user.firstName}, your account is ready. Add your children and book sessions at ${appUrl(req)}/account`,
        html: layout(
          `Welcome, ${user.firstName}!`,
          `<p>Your N.I.P.P.E.R.S. account is ready. The next step is to add your child's details, then you can book After School Club and Holiday Club sessions in a couple of taps.</p>${button(`${appUrl(req)}/account/children`, "Add your children")}`,
        ),
      },
      (m) => ctx.log(m),
    );
    return json({ user: publicUser(user) }, 201, { "Set-Cookie": sessionCookie(token, req) });
  }),
});

app.http("auth-login", {
  route: "auth/login",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req, ctx) => {
    await ensureSeed((m) => ctx.log(m));
    const { email, password } = await parseBody(req, loginSchema);
    const user = await findByEmail(email);
    const bad = () => new HttpError(401, "Email or password is incorrect");
    if (!user) throw bad();
    if (user.lockedUntil && user.lockedUntil > new Date().toISOString()) {
      throw new HttpError(423, "Too many failed attempts. Please try again in 15 minutes.");
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      user.failedLogins = (user.failedLogins ?? 0) + 1;
      if (user.failedLogins >= 8) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        user.failedLogins = 0;
      }
      await getStore().upsert("users", user);
      throw bad();
    }
    if (user.disabled) throw new HttpError(403, "This account has been disabled. Please contact the office.");
    user.failedLogins = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date().toISOString();
    await getStore().upsert("users", user);
    const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` });
    return json({ user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(token, req) });
  }),
});

app.http("auth-logout", {
  route: "auth/logout",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req) => json({ ok: true }, 200, { "Set-Cookie": sessionCookie(null, req) })),
});

app.http("auth-me", {
  route: "auth/me",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handler(async (req, ctx) => {
    await ensureSeed((m) => ctx.log(m));
    const claims = await currentUser(req);
    if (!claims) return json({ user: null });
    const user = await getStore().get<StoredUser>("users", claims.sub, claims.sub);
    if (!user || user.disabled) return json({ user: null }, 200, { "Set-Cookie": sessionCookie(null, req) });
    return json({ user: publicUser(user) });
  }),
});

app.http("auth-profile", {
  route: "auth/profile",
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const claims = await requireUser(req);
    const input = await parseBody(req, profileSchema);
    const user = await getStore().get<StoredUser>("users", claims.sub, claims.sub);
    if (!user) throw new HttpError(401, "Please sign in");
    Object.assign(user, input);
    await getStore().upsert("users", user);
    const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` });
    return json({ user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(token, req) });
  }),
});

app.http("auth-password", {
  route: "auth/password",
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const claims = await requireUser(req);
    const { current, password } = await parseBody(req, changePasswordSchema);
    const user = await getStore().get<StoredUser>("users", claims.sub, claims.sub);
    if (!user) throw new HttpError(401, "Please sign in");
    if (!(await verifyPassword(current, user.passwordHash))) throw new HttpError(400, "Current password is incorrect", { current: "Incorrect password" });
    user.passwordHash = await hashPassword(password);
    await getStore().upsert("users", user);
    return json({ ok: true });
  }),
});

app.http("auth-forgot", {
  route: "auth/forgot",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req, ctx) => {
    const { email } = await parseBody(req, forgotSchema);
    const user = await findByEmail(email);
    // Always respond the same way so the endpoint can't be used to enumerate accounts.
    if (user) {
      const token = newToken();
      await getStore().upsert("tokens", { id: token, userId: user.id, purpose: "reset", createdAt: new Date().toISOString(), ttl: 3600 });
      const link = `${appUrl(req)}/reset-password?token=${token}`;
      await sendMail(
        {
          to: user.email,
          subject: "Reset your N.I.P.P.E.R.S. password",
          text: `Reset your password using this link (valid for 1 hour): ${link}`,
          html: layout("Reset your password", `<p>Hi ${user.firstName}, click below to choose a new password. The link is valid for one hour.</p>${button(link, "Choose a new password")}<p style="color:#6b7a90;font-size:13px">If you didn't ask for this you can ignore this email.</p>`),
        },
        (m) => ctx.log(m),
      );
    }
    return json({ ok: true });
  }),
});

app.http("auth-reset", {
  route: "auth/reset",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler(async (req) => {
    const { token, password } = await parseBody(req, resetSchema);
    const store = getStore();
    const t = await store.get<{ id: string; userId: string; createdAt: string; purpose: string }>("tokens", token, token);
    if (!t || t.purpose !== "reset" || Date.now() - new Date(t.createdAt).getTime() > 3600 * 1000) {
      throw new HttpError(400, "This reset link is invalid or has expired. Please request a new one.");
    }
    const user = await store.get<StoredUser>("users", t.userId, t.userId);
    if (!user) throw new HttpError(400, "Account not found");
    user.passwordHash = await hashPassword(password);
    user.failedLogins = 0;
    user.lockedUntil = undefined;
    await store.upsert("users", user);
    await store.delete("tokens", token, token);
    const session = await signToken({ sub: user.id, email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` });
    return json({ user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(session, req) });
  }),
});

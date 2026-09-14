import { forwardRef, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Field, Input, Alert } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { registerSchema, loginSchema, forgotSchema, password as passwordSchema, type RegisterInput } from "@shared/schemas";
import type { User } from "@shared/types";

function Shell({ title, lead, children, footer }: { title: string; lead?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream">
      <div className="container-x flex flex-col items-center py-8 sm:py-14">
        <Link to="/" className="mb-8"><Logo /></Link>
        <div className="card w-full max-w-lg p-5 sm:p-8">
          <h1 className="h2">{title}</h1>
          {lead && <p className="mt-2 text-ink-500">{lead}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>}
      </div>
    </div>
  );
}

const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} {...props} className="pr-12" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-400 hover:bg-ink-900/5" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
});

function useAfterAuth() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { setUser } = useAuth();
  return (user: User) => {
    setUser(user);
    const next = params.get("next");
    nav(next && next.startsWith("/") ? next : user.role === "admin" ? "/admin" : "/account", { replace: true });
  };
}

export function Login({ admin = false }: { admin?: boolean }) {
  const done = useAfterAuth();
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (user) nav(user.role === "admin" ? "/admin" : "/account", { replace: true });
  }, [user]);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const m = useMutation({
    mutationFn: (d: z.infer<typeof loginSchema>) => api.post<{ user: User }>("/auth/login", d),
    onSuccess: async (r) => {
      if (admin && r.user.role !== "admin") {
        await api.post("/auth/logout", {});
        throw new ApiError(403, "That account is a parent account, not an admin. Sign in on the parents' page instead.");
      }
      done(r.user);
    },
  });
  return (
    <Shell
      title={admin ? "Staff & committee sign in" : "Welcome back"}
      lead={admin ? "For N.I.P.P.E.R.S. staff and committee members managing bookings and the website." : "Sign in to book sessions and manage your children's details."}
      footer={admin ? <>Parent? <Link to="/login" className="font-bold text-sky-600">Sign in here</Link></> : <>New to N.I.P.P.E.R.S.? <Link to="/register" className="font-bold text-sky-600">Create an account</Link> · <Link to="/admin/login" className="text-ink-500 hover:text-sky-600">Staff login</Link></>}
    >
      {admin && <div className="mb-4"><span className="badge bg-sky-100 text-sky-700"><ShieldCheck className="h-3.5 w-3.5" /> Admin area</span></div>}
      {m.isError && <div className="mb-4"><Alert>{(m.error as ApiError).message}</Alert></div>}
      <form onSubmit={handleSubmit((d) => m.mutate(d))} className="grid gap-4" noValidate>
        <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} {...register("email")} error={!!errors.email} /></Field>
        <Field label="Password" error={errors.password?.message}><PasswordInput autoComplete="current-password" autoCapitalize="none" spellCheck={false} {...register("password")} error={!!errors.password} /></Field>
        <div className="text-right text-sm"><Link to="/forgot-password" className="font-bold text-sky-600">Forgotten your password?</Link></div>
        <button className="btn-primary w-full" disabled={m.isPending}>Sign in <ArrowRight className="h-5 w-5" /></button>
      </form>
    </Shell>
  );
}

export function Register() {
  const done = useAfterAuth();
  const { register, handleSubmit, formState: { errors }, setError } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const m = useMutation({
    mutationFn: (d: RegisterInput) => api.post<{ user: User }>("/auth/register", d),
    onSuccess: (r) => done(r.user),
    onError: (e: ApiError) => {
      for (const [k, v] of Object.entries(e.details ?? {})) setError(k as keyof RegisterInput, { message: String(v) });
    },
  });
  return (
    <Shell title="Create your account" lead="Takes two minutes. You'll add your children's details next, then you can book straight away." footer={<>Already registered? <Link to="/login" className="font-bold text-sky-600">Sign in</Link></>}>
      {m.isError && !m.error.details && <div className="mb-4"><Alert>{m.error.message}</Alert></div>}
      <form onSubmit={handleSubmit((d) => m.mutate(d))} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="First name" error={errors.firstName?.message}><Input autoComplete="given-name" {...register("firstName")} error={!!errors.firstName} /></Field>
        <Field label="Last name" error={errors.lastName?.message}><Input autoComplete="family-name" {...register("lastName")} error={!!errors.lastName} /></Field>
        <Field label="Email" error={errors.email?.message} className="sm:col-span-2"><Input type="email" autoComplete="email" inputMode="email" {...register("email")} error={!!errors.email} /></Field>
        <Field label="Mobile number" error={errors.phone?.message} className="sm:col-span-2" hint="We'll only use this if we need to reach you about your child."><Input type="tel" autoComplete="tel" inputMode="tel" {...register("phone")} error={!!errors.phone} /></Field>
        <Field label="Address line 1" error={errors.addressLine1?.message} className="sm:col-span-2"><Input autoComplete="address-line1" {...register("addressLine1")} error={!!errors.addressLine1} /></Field>
        <Field label="Address line 2 (optional)" error={errors.addressLine2?.message} className="sm:col-span-2"><Input autoComplete="address-line2" {...register("addressLine2")} error={!!errors.addressLine2} /></Field>
        <Field label="Town" error={errors.town?.message}><Input autoComplete="address-level2" {...register("town")} error={!!errors.town} /></Field>
        <Field label="Postcode" error={errors.postcode?.message}><Input autoComplete="postal-code" {...register("postcode")} error={!!errors.postcode} className="uppercase" /></Field>
        <Field label="Choose a password" error={errors.password?.message} className="sm:col-span-2" hint="At least 8 characters with a letter and a number."><PasswordInput autoComplete="new-password" {...register("password")} error={!!errors.password} /></Field>
        <p className="text-xs text-ink-500 sm:col-span-2">By creating an account you agree to our <Link to="/policies" className="font-bold text-sky-600">booking and privacy policies</Link>. We only use your details to care for your child and manage bookings.</p>
        <button className="btn-primary w-full sm:col-span-2" disabled={m.isPending}>Create account <ArrowRight className="h-5 w-5" /></button>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });
  const m = useMutation({ mutationFn: (d: z.infer<typeof forgotSchema>) => api.post("/auth/forgot", d) });
  return (
    <Shell title="Reset your password" lead="Enter your email and we'll send you a link to choose a new password." footer={<Link to="/login" className="font-bold text-sky-600">Back to sign in</Link>}>
      {m.isSuccess ? (
        <Alert kind="success">If that email is registered you'll receive a reset link in the next few minutes. Check your junk folder too.</Alert>
      ) : (
        <form onSubmit={handleSubmit((d) => m.mutate(d))} className="grid gap-4" noValidate>
          {m.isError && <Alert>{(m.error as ApiError).message}</Alert>}
          <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" {...register("email")} error={!!errors.email} /></Field>
          <button className="btn-primary w-full" disabled={m.isPending}>Send reset link</button>
        </form>
      )}
    </Shell>
  );
}

const resetForm = z.object({ password: passwordSchema, confirm: z.string() }).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const done = useAfterAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof resetForm>>({ resolver: zodResolver(resetForm) });
  const m = useMutation({ mutationFn: (d: z.infer<typeof resetForm>) => api.post<{ user: User }>("/auth/reset", { token, password: d.password }), onSuccess: (r) => done(r.user) });
  return (
    <Shell title="Choose a new password">
      {!token ? (
        <Alert>This link is missing its token. Please use the link from your email, or <Link to="/forgot-password" className="underline">request a new one</Link>.</Alert>
      ) : (
        <form onSubmit={handleSubmit((d) => m.mutate(d))} className="grid gap-4" noValidate>
          {m.isError && <Alert>{(m.error as ApiError).message}</Alert>}
          <Field label="New password" error={errors.password?.message} hint="At least 8 characters with a letter and a number."><PasswordInput autoComplete="new-password" {...register("password")} error={!!errors.password} /></Field>
          <Field label="Confirm new password" error={errors.confirm?.message}><PasswordInput autoComplete="new-password" {...register("confirm")} error={!!errors.confirm} /></Field>
          <button className="btn-primary w-full" disabled={m.isPending}>Save password &amp; sign in</button>
        </form>
      )}
    </Shell>
  );
}

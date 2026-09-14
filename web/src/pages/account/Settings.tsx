import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Field, Input, Alert } from "@/components/ui";
import { profileSchema, changePasswordSchema } from "@shared/schemas";
import type { User } from "@shared/types";

type Profile = z.infer<typeof profileSchema>;
type Pw = z.infer<typeof changePasswordSchema>;

export default function Settings() {
  const { user, setUser } = useAuth();
  const p = useForm<Profile>({ resolver: zodResolver(profileSchema), defaultValues: user ?? undefined });
  const saveProfile = useMutation({ mutationFn: (d: Profile) => api.put<{ user: User }>("/auth/profile", d), onSuccess: (r) => setUser(r.user) });
  const pw = useForm<Pw>({ resolver: zodResolver(changePasswordSchema) });
  const savePw = useMutation({ mutationFn: (d: Pw) => api.put("/auth/password", d), onSuccess: () => pw.reset(), onError: (e: ApiError) => { for (const [k, v] of Object.entries(e.details ?? {})) pw.setError(k as keyof Pw, { message: String(v) }); } });
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="h2">Account settings</h1>
      <form onSubmit={p.handleSubmit((d) => saveProfile.mutate(d))} className="card space-y-4 p-5 sm:p-6" noValidate>
        <h2 className="h3">Your details</h2>
        <p className="-mt-2 text-sm text-ink-500">Signed in as {user?.email}. To change your email, contact the office.</p>
        {saveProfile.isSuccess && <Alert kind="success">Details saved.</Alert>}
        {saveProfile.isError && <Alert>{(saveProfile.error as ApiError).message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={p.formState.errors.firstName?.message}><Input {...p.register("firstName")} /></Field>
          <Field label="Last name" error={p.formState.errors.lastName?.message}><Input {...p.register("lastName")} /></Field>
          <Field label="Mobile" error={p.formState.errors.phone?.message} className="sm:col-span-2"><Input type="tel" {...p.register("phone")} /></Field>
          <Field label="Address line 1" error={p.formState.errors.addressLine1?.message} className="sm:col-span-2"><Input {...p.register("addressLine1")} /></Field>
          <Field label="Address line 2" className="sm:col-span-2"><Input {...p.register("addressLine2")} /></Field>
          <Field label="Town" error={p.formState.errors.town?.message}><Input {...p.register("town")} /></Field>
          <Field label="Postcode" error={p.formState.errors.postcode?.message}><Input {...p.register("postcode")} className="uppercase" /></Field>
        </div>
        <button className="btn-primary" disabled={saveProfile.isPending}>Save details</button>
      </form>
      <form onSubmit={pw.handleSubmit((d) => savePw.mutate(d))} className="card space-y-4 p-5 sm:p-6" noValidate>
        <h2 className="h3">Change password</h2>
        {savePw.isSuccess && <Alert kind="success">Password changed.</Alert>}
        {savePw.isError && !savePw.error.details && <Alert>{savePw.error.message}</Alert>}
        <Field label="Current password" error={pw.formState.errors.current?.message}><Input type="password" autoComplete="current-password" {...pw.register("current")} /></Field>
        <Field label="New password" error={pw.formState.errors.password?.message} hint="At least 8 characters with a letter and a number."><Input type="password" autoComplete="new-password" {...pw.register("password")} /></Field>
        <button className="btn-outline" disabled={savePw.isPending}>Update password</button>
      </form>
    </div>
  );
}

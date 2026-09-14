import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, UserRound, ArrowLeft, PlusCircle, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Field, Input, Textarea, Checkbox, Alert, EmptyState, PageLoading } from "@/components/ui";
import { childSchema, type ChildInput } from "@shared/schemas";
import type { Child } from "@shared/types";

function age(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

export function ChildrenList() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["children"], queryFn: () => api.get<{ children: Child[] }>("/children") });
  const del = useMutation({ mutationFn: (id: string) => api.del(`/children/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["children"] }) });
  if (q.isLoading) return <PageLoading />;
  const kids = q.data?.children ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="h2">My children</h1>
        <Link to="/account/children/new" className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add child</Link>
      </div>
      {del.isError && <Alert>{(del.error as ApiError).message}</Alert>}
      {kids.length === 0 ? (
        <EmptyState icon={<UserRound className="h-8 w-8" />} title="No children yet" body="Add each child once — their details are saved for every future booking." action={<Link to="/account/children/new" className="btn-primary btn-sm">Add a child</Link>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {kids.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 font-display text-lg font-bold text-sky-600">{c.firstName[0]}</div>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{c.firstName} {c.lastName}</h2>
                    <p className="text-sm text-ink-500">Age {age(c.dob)} · {c.school}{c.yearGroup ? ` · ${c.yearGroup}` : ""}</p>
                  </div>
                </div>
              </div>
              <dl className="mt-4 grid gap-1 text-sm">
                {c.allergies && <div><dt className="inline font-bold text-coral-600">Allergies: </dt><dd className="inline text-ink-700">{c.allergies}</dd></div>}
                {c.medical && <div><dt className="inline font-bold text-ink-700">Medical: </dt><dd className="inline text-ink-700">{c.medical}</dd></div>}
                <div><dt className="inline font-bold text-ink-700">Emergency: </dt><dd className="inline text-ink-700">{c.emergencyContacts.map((e) => `${e.name} (${e.phone})`).join(", ")}</dd></div>
                <div><dt className="inline font-bold text-ink-700">Photos: </dt><dd className="inline text-ink-700">{c.photoConsent ? "Consent given" : "No consent"}</dd></div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Link to={`/account/children/${c.id}`} className="btn-outline btn-sm flex-1"><Pencil className="h-4 w-4" /> Edit</Link>
                <button onClick={() => window.confirm(`Remove ${c.firstName} from your account?`) && del.mutate(c.id)} className="btn-ghost btn-sm text-coral-600" aria-label={`Remove ${c.firstName}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChildForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["children"], queryFn: () => api.get<{ children: Child[] }>("/children"), enabled: !!id });
  const existing = q.data?.children.find((c) => c.id === id);
  if (id && q.isLoading) return <PageLoading />;
  if (id && !existing) return <Alert>Child not found.</Alert>;
  return <ChildFormInner existing={existing} onDone={() => { qc.invalidateQueries({ queryKey: ["children"] }); nav("/account/children"); }} />;
}

function ChildFormInner({ existing, onDone }: { existing?: Child; onDone: () => void }) {
  const { register, control, handleSubmit, formState: { errors }, setError } = useForm<ChildInput>({
    resolver: zodResolver(childSchema),
    defaultValues: existing ?? { emergencyContacts: [{ name: "", relationship: "", phone: "" }], photoConsent: false, firstName: "", lastName: "", dob: "", school: "" },
  });
  const contacts = useFieldArray({ control, name: "emergencyContacts" });
  const m = useMutation({
    mutationFn: (d: ChildInput) => (existing ? api.put(`/children/${existing.id}`, d) : api.post("/children", d)),
    onSuccess: onDone,
    onError: (e: ApiError) => {
      for (const [k, v] of Object.entries(e.details ?? {})) setError(k as any, { message: String(v) });
    },
  });
  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/account/children" className="btn-ghost btn-sm -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="h2">{existing ? `Edit ${existing.firstName}` : "Add a child"}</h1>
      <p className="mt-1 text-ink-500">This information is printed on our daily register so staff can care for your child safely. Please keep it up to date.</p>
      {m.isError && !m.error.details && <div className="mt-4"><Alert>{m.error.message}</Alert></div>}
      <form onSubmit={handleSubmit((d) => m.mutate(d))} className="mt-6 space-y-6" noValidate>
        <section className="card p-5 sm:p-6">
          <h2 className="h3 mb-4">About your child</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message}><Input {...register("firstName")} error={!!errors.firstName} /></Field>
            <Field label="Last name" error={errors.lastName?.message}><Input {...register("lastName")} error={!!errors.lastName} /></Field>
            <Field label="Date of birth" error={errors.dob?.message}><Input type="date" {...register("dob")} error={!!errors.dob} /></Field>
            <Field label="Year group (optional)" error={errors.yearGroup?.message}><Input {...register("yearGroup")} placeholder="e.g. Year 3" /></Field>
            <Field label="School" error={errors.school?.message} className="sm:col-span-2"><Input {...register("school")} error={!!errors.school} placeholder="e.g. Denton Community Primary" /></Field>
          </div>
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="h3 mb-1">Health & wellbeing</h2>
          <p className="mb-4 text-sm text-ink-500">Leave blank if not applicable.</p>
          <div className="grid gap-4">
            <Field label="Allergies" error={errors.allergies?.message}><Input {...register("allergies")} placeholder="e.g. Peanuts (carries EpiPen)" /></Field>
            <Field label="Dietary requirements" error={errors.dietary?.message}><Input {...register("dietary")} placeholder="e.g. Vegetarian, no pork" /></Field>
            <Field label="Medical conditions & medication" error={errors.medical?.message}><Textarea {...register("medical")} className="min-h-[80px]" placeholder="e.g. Asthma — blue inhaler in bag" /></Field>
            <Field label="Additional needs or anything else we should know" error={errors.additionalNeeds?.message}><Textarea {...register("additionalNeeds")} className="min-h-[80px]" placeholder="e.g. Finds loud noises difficult; likes to know the plan for the day" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GP surgery / doctor (optional)"><Input {...register("doctorName")} /></Field>
              <Field label="GP phone (optional)"><Input type="tel" {...register("doctorPhone")} /></Field>
            </div>
          </div>
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="h3 mb-1">Emergency contacts</h2>
          <p className="mb-4 text-sm text-ink-500">Someone other than you who we can call and who is allowed to collect your child.</p>
          {errors.emergencyContacts?.root?.message && <p className="field-error mb-3">{errors.emergencyContacts.root.message}</p>}
          {typeof errors.emergencyContacts?.message === "string" && <p className="field-error mb-3">{errors.emergencyContacts.message}</p>}
          <div className="space-y-4">
            {contacts.fields.map((f, i) => (
              <div key={f.id} className="rounded-2xl border-2 border-ink-900/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-ink-500">Contact {i + 1}</span>
                  {contacts.fields.length > 1 && <button type="button" onClick={() => contacts.remove(i)} className="btn-ghost btn-sm text-coral-600"><X className="h-4 w-4" /> Remove</button>}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Name" error={errors.emergencyContacts?.[i]?.name?.message}><Input {...register(`emergencyContacts.${i}.name`)} error={!!errors.emergencyContacts?.[i]?.name} /></Field>
                  <Field label="Relationship" error={errors.emergencyContacts?.[i]?.relationship?.message}><Input {...register(`emergencyContacts.${i}.relationship`)} error={!!errors.emergencyContacts?.[i]?.relationship} placeholder="e.g. Grandma" /></Field>
                  <Field label="Phone" error={errors.emergencyContacts?.[i]?.phone?.message}><Input type="tel" {...register(`emergencyContacts.${i}.phone`)} error={!!errors.emergencyContacts?.[i]?.phone} /></Field>
                </div>
              </div>
            ))}
          </div>
          {contacts.fields.length < 4 && <button type="button" onClick={() => contacts.append({ name: "", relationship: "", phone: "" })} className="btn-outline btn-sm mt-4"><PlusCircle className="h-4 w-4" /> Add another contact</button>}
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="h3 mb-3">Consent</h2>
          <Checkbox {...register("photoConsent")} label={<>I give consent for photographs of my child to be taken at N.I.P.P.E.R.S. and used on the website, social media and displays. <span className="text-ink-500">You can change this at any time.</span></>} />
        </section>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to="/account/children" className="btn-outline">Cancel</Link>
          <button className="btn-primary" disabled={m.isPending}>{existing ? "Save changes" : "Save child"}</button>
        </div>
      </form>
    </div>
  );
}

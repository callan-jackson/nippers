import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Image as ImageIcon, Mail, MapPin, Phone, Send, FileText, Facebook, Clock } from "lucide-react";
import { PageHeader, PageLoading, Field, Input, Textarea, Alert, EmptyState } from "@/components/ui";
import { Section, SectionHeading, MapCard, CTA } from "@/components/marketing";
import { PriceCard } from "./Clubs";
import { useSite } from "@/lib/site";
import { api, ApiError, money } from "@/lib/api";
import { contactSchema, type ContactInput } from "@shared/schemas";

export function Fees() {
  const { data: site } = useSite();
  if (!site) return <PageLoading />;
  const asc = site.sessions.filter((s) => s.club === "afterschool");
  const hc = site.sessions.filter((s) => s.club === "holiday");
  return (
    <>
      <PageHeader eyebrow="Price list" title="Fees" lead="Clear, simple prices with no registration fee. Book only the sessions you need — no minimum commitment." />
      <Section>
        <SectionHeading eyebrow="Term time" title="After School Club" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{asc.map((s) => <PriceCard key={s.id} label={s.label} time={`${s.start}–${s.end}`} price={s.price} desc={s.description} tone="sky" />)}</div>
      </Section>
      <Section className="pt-0">
        <SectionHeading eyebrow="School holidays" title="Holiday Club" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{hc.map((s) => <PriceCard key={s.id} label={s.label} time={`${s.start}–${s.end}`} price={s.price} desc={s.description} tone={s.id === "hc-full" ? "coral" : "sun"} />)}</div>
      </Section>
      <section className="bg-white py-12">
        <div className="container-x grid gap-8 lg:grid-cols-2">
          <div className="prose-nippers">
            <h2 className="h2 mb-4">Paying for sessions</h2>
            <p>{site.settings.paymentInstructions}</p>
            <p>We accept <strong>Tax-Free Childcare</strong> (the government pays 20p for every 80p you pay), all major <strong>childcare voucher schemes</strong>, and <strong>bank transfer</strong>. Families receiving Universal Credit may be able to claim back up to 85% of childcare costs.</p>
          </div>
          <div className="prose-nippers">
            <h2 className="h2 mb-4">Good to know</h2>
            <p>Bookings are requests until confirmed by our team — usually within two working days. Cancellations with more than 7 days' notice are free; later cancellations are charged unless we can fill the place.</p>
            <p>Late collection after 6pm is charged at £5 per 15 minutes. A price list, enrolment pack and full policies are available from the office at any time.</p>
            <Link to="/policies" className="btn-outline btn-sm mt-2"><FileText className="h-4 w-4" /> Read our policies</Link>
          </div>
        </div>
      </section>
      <CTA title="Book online in minutes" body={`After School Club from ${money(Math.min(...asc.map((s) => s.price)))} · Holiday Club from ${money(Math.min(...hc.filter((s) => s.start !== "07:30").map((s) => s.price)))}`} />
    </>
  );
}

export function Gallery() {
  const { data: site } = useSite();
  const [open, setOpen] = useState<number | null>(null);
  if (!site) return <PageLoading />;
  const imgs = site.gallery;
  return (
    <>
      <PageHeader tone="coral" eyebrow="Gallery" title="A peek at what we get up to" lead="Photos are only ever shared with parents' consent. If you'd rather your child didn't appear, just tell us — it's a simple tick box on their profile." />
      <Section>
        {imgs.length === 0 ? (
          <EmptyState icon={<ImageIcon className="h-8 w-8" />} title="Photos coming soon" body="We're gathering photos from recent sessions (with consent). Check back shortly — or follow us on Facebook for the latest." action={<a href={site.settings.facebook} target="_blank" rel="noreferrer" className="btn-primary btn-sm"><Facebook className="h-4 w-4" /> Follow on Facebook</a>} />
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {imgs.map((g, i) => (
              <button key={g.id} onClick={() => setOpen(i)} className="block w-full overflow-hidden rounded-2xl bg-ink-900/5 shadow-card transition hover:-translate-y-0.5">
                <img src={`/api/public/gallery/${g.id}`} alt={g.alt} loading="lazy" className="w-full" />
                {g.caption && <span className="block px-3 py-2 text-left text-xs font-bold text-ink-500">{g.caption}</span>}
              </button>
            ))}
          </div>
        )}
      </Section>
      {open !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 p-4" onClick={() => setOpen(null)}>
          <img src={`/api/public/gallery/${imgs[open].id}`} alt={imgs[open].alt} className="max-h-[90dvh] max-w-full rounded-2xl" />
          {imgs[open].caption && <p className="absolute bottom-6 left-0 right-0 text-center text-sm font-bold text-white">{imgs[open].caption}</p>}
        </div>
      )}
    </>
  );
}

export function Policies() {
  const { data: site } = useSite();
  const [open, setOpen] = useState<string | null>(null);
  if (!site) return <PageLoading />;
  return (
    <>
      <PageHeader eyebrow="Policies" title="How we look after your children" lead="Summaries of our key policies. Full versions of every policy, plus our enrolment pack and price list, are available from the office — just ask." />
      <Section>
        <div className="mx-auto max-w-3xl space-y-3">
          {site.policies.map((p) => {
            const isOpen = open === p.id;
            return (
              <div key={p.id} className="card overflow-hidden">
                <button onClick={() => setOpen(isOpen ? null : p.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left" aria-expanded={isOpen}>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{p.title}</h2>
                    {p.summary && <p className="mt-0.5 text-sm text-ink-500">{p.summary}</p>}
                  </div>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-ink-400 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="prose-nippers border-t border-ink-900/5 px-5 py-4">
                    {p.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
                    <p className="text-xs text-ink-400">Last updated {new Date(p.updatedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-8 max-w-3xl">
          <div className="card flex flex-col items-start gap-4 bg-sky-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="h3">Need the full documents?</h3>
              <p className="mt-1 text-sm text-ink-500">Email us for the complete policy pack, enrolment form or a printed price list.</p>
            </div>
            <a href={`mailto:${site.settings.email}?subject=Policy%20pack%20request`} className="btn-primary btn-sm shrink-0"><Mail className="h-4 w-4" /> Email the office</a>
          </div>
        </div>
      </Section>
    </>
  );
}

export function Contact() {
  const { data: site } = useSite();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });
  const mutation = useMutation({
    mutationFn: (data: ContactInput) => api.post("/public/contact", data),
    onSuccess: () => {
      setSent(true);
      reset();
    },
    onError: (e: ApiError) => {
      for (const [k, v] of Object.entries(e.details ?? {})) setError(k as keyof ContactInput, { message: String(v) });
    },
  });
  return (
    <>
      <PageHeader eyebrow="Contact" title="Get in touch" lead="Questions about spaces, a visit, enrolment or anything else — we'd love to hear from you." />
      <Section>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <a href={`tel:${(site?.settings.phone ?? "").replace(/\s/g, "")}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600"><Phone className="h-6 w-6" /></div>
              <div><div className="text-sm font-bold text-ink-500">Call us</div><div className="font-display text-lg font-semibold">{site?.settings.phone}</div></div>
            </a>
            <a href={`mailto:${site?.settings.email}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-100 text-sun-600"><Mail className="h-6 w-6" /></div>
              <div className="min-w-0"><div className="text-sm font-bold text-ink-500">Email us</div><div className="truncate font-display text-lg font-semibold">{site?.settings.email}</div></div>
            </a>
            <div className="card flex items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-600"><MapPin className="h-6 w-6" /></div>
              <div><div className="text-sm font-bold text-ink-500">Visit us</div><div className="font-display text-lg font-semibold leading-snug">{site?.settings.address}</div></div>
            </div>
            <div className="card flex items-start gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral-100 text-coral-500"><Clock className="h-6 w-6" /></div>
              <div><div className="text-sm font-bold text-ink-500">Opening hours</div><div className="text-sm text-ink-700">Term time: Mon–Fri 3pm–6pm<br />School holidays: Mon–Fri 7.30am–6pm<br />Closed Christmas week and bank holidays</div></div>
            </div>
          </div>
          <div className="card p-5 sm:p-8">
            <h2 className="h3">Send us a message</h2>
            {sent && <div className="mt-4"><Alert kind="success" onClose={() => setSent(false)}>Thanks — your message is on its way. We'll reply as soon as we can.</Alert></div>}
            {mutation.isError && !mutation.error.details && <div className="mt-4"><Alert>{mutation.error.message}</Alert></div>}
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
              <Field label="Your name" error={errors.name?.message}><Input {...register("name")} error={!!errors.name} autoComplete="name" /></Field>
              <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")} error={!!errors.email} autoComplete="email" /></Field>
              <Field label="Phone (optional)" error={errors.phone?.message}><Input type="tel" {...register("phone")} error={!!errors.phone} autoComplete="tel" /></Field>
              <Field label="Subject" error={errors.subject?.message}><Input {...register("subject")} error={!!errors.subject} placeholder="e.g. Spaces in October half term" /></Field>
              <Field label="Message" error={errors.message?.message} className="sm:col-span-2"><Textarea {...register("message")} error={!!errors.message} /></Field>
              <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" {...register("website")} />
              <div className="sm:col-span-2"><button className="btn-primary w-full sm:w-auto" disabled={isSubmitting || mutation.isPending}><Send className="h-4 w-4" /> Send message</button></div>
            </form>
          </div>
        </div>
      </Section>
      <Section className="pt-0">
        <MapCard />
      </Section>
    </>
  );
}

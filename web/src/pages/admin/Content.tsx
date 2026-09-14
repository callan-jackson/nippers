import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Upload, Eye, EyeOff, Mail, MailOpen, Phone } from "lucide-react";
import { api, ApiError, fmtDateTime } from "@/lib/api";
import { PageLoading, Input, Textarea, Select, Alert, Field, Checkbox, Modal, EmptyState } from "@/components/ui";
import type { Testimonial, Policy, Announcement, GalleryImage, ContactMessage } from "@shared/types";

// Generic CRUD hook for the admin content collections.
function useCollection<T extends { id: string }>(name: string) {
  const qc = useQueryClient();
  const key = ["admin", name];
  const q = useQuery({ queryKey: key, queryFn: () => api.get<{ items: T[] }>(`/manage/${name}`) });
  const done = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["site"] }); };
  const create = useMutation({ mutationFn: (d: Partial<T>) => api.post(`/manage/${name}`, d), onSuccess: done });
  const update = useMutation({ mutationFn: ({ id, ...d }: Partial<T> & { id: string }) => api.put(`/manage/${name}/${id}`, d), onSuccess: done });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/manage/${name}/${id}`), onSuccess: done });
  return { items: q.data?.items ?? [], loading: q.isLoading, create, update, remove, error: (create.error ?? update.error ?? remove.error) as ApiError | null };
}

export function AdminTestimonials() {
  const c = useCollection<Testimonial>("testimonials");
  const [edit, setEdit] = useState<Partial<Testimonial> | null>(null);
  if (c.loading) return <PageLoading />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="h2">Testimonials</h1><button onClick={() => setEdit({ quote: "", attribution: "", published: true, sort: c.items.length })} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add</button></div>
      <p className="text-sm text-ink-500">GDPR tip: attribute quotes without full names — "Parent of a Year 2 child" — unless you have written permission.</p>
      {c.error && <Alert>{c.error.message}</Alert>}
      <div className="grid gap-3 md:grid-cols-2">
        {c.items.map((t) => (
          <div key={t.id} className={`card p-4 ${t.published ? "" : "opacity-60"}`}>
            <p className="text-ink-700">"{t.quote}"</p>
            <p className="mt-2 text-sm font-bold text-sky-600">— {t.attribution}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEdit(t)} className="btn-outline btn-sm"><Pencil className="h-4 w-4" /> Edit</button>
              <button onClick={() => c.update.mutate({ id: t.id, quote: t.quote, attribution: t.attribution, sort: t.sort, published: !t.published })} className="btn-ghost btn-sm">{t.published ? <><EyeOff className="h-4 w-4" /> Hide</> : <><Eye className="h-4 w-4" /> Publish</>}</button>
              <button onClick={() => window.confirm("Delete this testimonial?") && c.remove.mutate(t.id)} className="btn-ghost btn-sm ml-auto text-coral-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit testimonial" : "New testimonial"}>
        {edit && (
          <div className="space-y-4">
            <Field label="Quote"><Textarea value={edit.quote} onChange={(e) => setEdit({ ...edit, quote: e.target.value })} /></Field>
            <Field label="Attribution"><Input value={edit.attribution} onChange={(e) => setEdit({ ...edit, attribution: e.target.value })} placeholder="Parent of a Year 4 child" /></Field>
            <Checkbox label="Published" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />
            <button onClick={() => { edit.id ? c.update.mutate(edit as Testimonial & { id: string }) : c.create.mutate(edit); setEdit(null); }} className="btn-primary w-full">Save</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminPolicies() {
  const c = useCollection<Policy>("policies");
  const [edit, setEdit] = useState<Partial<Policy> | null>(null);
  if (c.loading) return <PageLoading />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="h2">Policies</h1><button onClick={() => setEdit({ title: "", summary: "", body: "", published: true, sort: c.items.length })} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add</button></div>
      <p className="text-sm text-ink-500">Separate paragraphs with a blank line. Shown on the public Policies page as expandable sections.</p>
      {c.error && <Alert>{c.error.message}</Alert>}
      <div className="space-y-2">
        {c.items.map((p) => (
          <div key={p.id} className={`card flex items-center gap-3 p-4 ${p.published ? "" : "opacity-60"}`}>
            <div className="min-w-0 flex-1"><div className="font-display font-semibold">{p.title}</div><div className="truncate text-sm text-ink-500">{p.summary || p.body.slice(0, 90)}</div></div>
            <button onClick={() => setEdit(p)} className="btn-outline btn-sm"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => window.confirm(`Delete "${p.title}"?`) && c.remove.mutate(p.id)} className="btn-ghost btn-sm text-coral-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit policy" : "New policy"} wide>
        {edit && (
          <div className="space-y-4">
            <Field label="Title"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="One-line summary"><Input value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} /></Field>
            <Field label="Full text"><Textarea className="min-h-[280px]" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4"><Field label="Order"><Input type="number" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} /></Field><div className="pt-7"><Checkbox label="Published" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /></div></div>
            <button onClick={() => { const { updatedAt, ...d } = edit as Policy; (edit.id ? c.update.mutate(d) : c.create.mutate(d)); setEdit(null); }} className="btn-primary w-full">Save</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminAnnouncements() {
  const c = useCollection<Announcement>("announcements");
  const [edit, setEdit] = useState<Partial<Announcement> | null>(null);
  if (c.loading) return <PageLoading />;
  const now = new Date().toISOString();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="h2">Announcements</h1><button onClick={() => setEdit({ title: "", body: "", level: "info", startsAt: now.slice(0, 16), endsAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) })} className="btn-primary btn-sm"><Plus className="h-4 w-4" /> Add</button></div>
      <p className="text-sm text-ink-500">A banner shown at the top of every page between the start and end times — e.g. "Summer bookings now open" or "Closed Friday for staff training".</p>
      {c.error && <Alert>{c.error.message}</Alert>}
      {c.items.length === 0 && <p className="text-sm text-ink-500">No announcements.</p>}
      <div className="space-y-2">
        {c.items.map((a) => {
          const live = a.startsAt <= now && a.endsAt >= now;
          return (
            <div key={a.id} className="card flex items-center gap-3 p-4">
              <span className={`badge ${live ? "bg-leaf-100 text-leaf-700" : "bg-ink-900/5 text-ink-500"}`}>{live ? "Live" : a.endsAt < now ? "Expired" : "Scheduled"}</span>
              <div className="min-w-0 flex-1"><div className="font-display font-semibold">{a.title}</div><div className="truncate text-sm text-ink-500">{a.body}</div><div className="text-xs text-ink-400">{fmtDateTime(a.startsAt)} → {fmtDateTime(a.endsAt)}</div></div>
              <button onClick={() => setEdit({ ...a, startsAt: a.startsAt.slice(0, 16), endsAt: a.endsAt.slice(0, 16) })} className="btn-outline btn-sm"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => c.remove.mutate(a.id)} className="btn-ghost btn-sm text-coral-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit announcement" : "New announcement"}>
        {edit && (
          <div className="space-y-4">
            <Field label="Title"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Message"><Textarea className="min-h-[80px]" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <Field label="Style"><Select value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value as Announcement["level"] })}><option value="info">Info (yellow)</option><option value="warning">Important (red)</option></Select></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Show from"><Input type="datetime-local" value={edit.startsAt} onChange={(e) => setEdit({ ...edit, startsAt: e.target.value })} /></Field><Field label="Until"><Input type="datetime-local" value={edit.endsAt} onChange={(e) => setEdit({ ...edit, endsAt: e.target.value })} /></Field></div>
            <button onClick={() => { const d = { ...edit, startsAt: new Date(edit.startsAt!).toISOString(), endsAt: new Date(edit.endsAt!).toISOString() }; (edit.id ? c.update.mutate(d as Announcement) : c.create.mutate(d)); setEdit(null); }} className="btn-primary w-full">Save</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Resize in the browser so uploads stay small (Cosmos documents are capped at 2 MB).
async function resizeImage(file: File, max = 1400, quality = 0.82): Promise<{ data: string; contentType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { data: dataUrl.split(",")[1], contentType: "image/jpeg" };
}

export function AdminGallery() {
  const c = useCollection<GalleryImage>("gallery");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState<GalleryImage | null>(null);
  if (c.loading) return <PageLoading />;
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        setBusy(f.name);
        const { data, contentType } = await resizeImage(f);
        await c.create.mutateAsync({ alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), caption: "", contentType, data, published: true } as any);
      }
    } catch (e: any) {
      setErr(e.message ?? "Upload failed");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="h2">Gallery</h1><button onClick={() => fileRef.current?.click()} disabled={!!busy} className="btn-primary btn-sm"><Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload photos"}</button></div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      <p className="text-sm text-ink-500">Only upload photos of children whose parents have given photo consent (shown on the register). Photos are resized automatically. Up to 60 photos.</p>
      {(err || c.error) && <Alert>{err ?? c.error?.message}</Alert>}
      {c.items.length === 0 ? <EmptyState icon={<Upload className="h-8 w-8" />} title="No photos yet" body="Upload a few photos of activities, Forest School and crafts to bring the website to life." /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {c.items.map((g) => (
            <div key={g.id} className={`card overflow-hidden ${g.published ? "" : "opacity-60"}`}>
              <img src={`/api/manage/gallery/${g.id}/image`} alt={g.alt} className="aspect-square w-full object-cover" />
              <div className="p-2">
                <div className="truncate text-xs font-bold">{g.caption || g.alt}</div>
                <div className="mt-1 flex gap-1">
                  <button onClick={() => setEdit(g)} className="btn-ghost btn-sm flex-1 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button onClick={() => c.update.mutate({ id: g.id, caption: g.caption, alt: g.alt, sort: g.sort, published: !g.published })} className="btn-ghost btn-sm text-xs" aria-label={g.published ? "Hide" : "Publish"}>{g.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                  <button onClick={() => window.confirm("Delete this photo?") && c.remove.mutate(g.id)} className="btn-ghost btn-sm text-xs text-coral-600" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit photo">
        {edit && (
          <div className="space-y-4">
            <img src={`/api/manage/gallery/${edit.id}/image`} alt={edit.alt} className="max-h-60 w-full rounded-2xl object-cover" />
            <Field label="Caption (shown under the photo)"><Input value={edit.caption} onChange={(e) => setEdit({ ...edit, caption: e.target.value })} /></Field>
            <Field label="Description for screen readers"><Input value={edit.alt} onChange={(e) => setEdit({ ...edit, alt: e.target.value })} /></Field>
            <Field label="Order"><Input type="number" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) })} /></Field>
            <button onClick={() => { c.update.mutate({ id: edit.id, caption: edit.caption, alt: edit.alt, sort: edit.sort, published: edit.published }); setEdit(null); }} className="btn-primary w-full">Save</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminMessages() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "messages"], queryFn: () => api.get<{ messages: ContactMessage[] }>("/manage/messages") });
  const done = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const mark = useMutation({ mutationFn: (d: { id: string; read: boolean }) => api.put(`/manage/messages/${d.id}`, { read: d.read }), onSuccess: done });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/manage/messages/${id}`), onSuccess: done });
  if (q.isLoading) return <PageLoading />;
  const list = q.data?.messages ?? [];
  return (
    <div className="space-y-4">
      <h1 className="h2">Messages</h1>
      {list.length === 0 ? <EmptyState icon={<Mail className="h-8 w-8" />} title="No messages" body="Enquiries from the contact form appear here (and are emailed to the office)." /> : (
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.id} className={`card p-4 ${m.read ? "" : "border-l-4 border-sky-500"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="font-display font-semibold">{m.subject}</div><div className="text-sm text-ink-500">{m.name} · <a href={`mailto:${m.email}`} className="font-bold text-sky-600">{m.email}</a>{m.phone && <> · <a href={`tel:${m.phone}`} className="font-bold text-sky-600"><Phone className="inline h-3 w-3" /> {m.phone}</a></>}</div></div>
                <div className="text-xs text-ink-400">{fmtDateTime(m.createdAt)}</div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink-700">{m.message}</p>
              <div className="mt-3 flex gap-2">
                <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="btn-outline btn-sm"><Mail className="h-4 w-4" /> Reply</a>
                <button onClick={() => mark.mutate({ id: m.id, read: !m.read })} className="btn-ghost btn-sm">{m.read ? <><Mail className="h-4 w-4" /> Mark unread</> : <><MailOpen className="h-4 w-4" /> Mark read</>}</button>
                <button onClick={() => window.confirm("Delete this message?") && remove.mutate(m.id)} className="btn-ghost btn-sm ml-auto text-coral-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

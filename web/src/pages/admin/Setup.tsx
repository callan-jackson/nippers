import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PageLoading, Input, Select, Alert, Field, Textarea, Checkbox } from "@/components/ui";
import type { Calendar, DateRange, SessionType, SiteSettings } from "@shared/types";

function useSaver<T>(url: string, key: string[]) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: T) => api.put(url, d), onSuccess: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["site"] }); } });
}

export function AdminSessions() {
  const q = useQuery({ queryKey: ["admin", "sessions"], queryFn: () => api.get<{ sessions: SessionType[] }>("/manage/sessions") });
  const [rows, setRows] = useState<SessionType[] | null>(null);
  useEffect(() => { if (q.data && !rows) setRows(q.data.sessions); }, [q.data]);
  const save = useSaver<{ sessions: SessionType[] }>("/manage/sessions", ["admin", "sessions"]);
  if (!rows) return <PageLoading />;
  const set = (i: number, patch: Partial<SessionType>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-4">
      <h1 className="h2">Sessions & prices</h1>
      <p className="text-sm text-ink-500">These appear on the website and in the booking calendar. Capacity is the maximum number of children per session per day. Untick "Active" to hide a session without deleting it.</p>
      {save.isSuccess && <Alert kind="success">Saved.</Alert>}
      {save.isError && <Alert>{(save.error as ApiError).message} {JSON.stringify((save.error as ApiError).details ?? "")}</Alert>}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="card grid gap-3 p-4 sm:grid-cols-12">
            <Field label="Club" className="sm:col-span-2"><Select value={r.club} onChange={(e) => set(i, { club: e.target.value as SessionType["club"] })}><option value="afterschool">After School</option><option value="holiday">Holiday</option></Select></Field>
            <Field label="Label" className="sm:col-span-3"><Input value={r.label} onChange={(e) => set(i, { label: e.target.value })} /></Field>
            <Field label="Start" className="sm:col-span-2"><Input type="time" value={r.start} onChange={(e) => set(i, { start: e.target.value })} /></Field>
            <Field label="End" className="sm:col-span-2"><Input type="time" value={r.end} onChange={(e) => set(i, { end: e.target.value })} /></Field>
            <Field label="Price £" className="sm:col-span-2"><Input type="number" step="0.5" min="0" inputMode="decimal" value={r.price} onChange={(e) => set(i, { price: Number(e.target.value) })} /></Field>
            <Field label="Capacity" className="sm:col-span-1"><Input type="number" min="1" inputMode="numeric" value={r.capacity} onChange={(e) => set(i, { capacity: Number(e.target.value) })} /></Field>
            <Field label="Description (optional)" className="sm:col-span-9"><Input value={r.description ?? ""} onChange={(e) => set(i, { description: e.target.value })} /></Field>
            <div className="flex items-end gap-3 sm:col-span-3">
              <Checkbox label="Active" checked={r.active} onChange={(e) => set(i, { active: e.target.checked })} />
              <button onClick={() => window.confirm(`Delete "${r.label}"? Existing bookings keep their details.`) && setRows(rows.filter((_, j) => j !== i))} className="btn-ghost btn-sm ml-auto text-coral-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setRows([...rows, { id: `s-${Date.now().toString(36)}`, club: "holiday", label: "New session", start: "09:00", end: "16:00", price: 20, capacity: 40, active: true, sort: rows.length }])} className="btn-outline btn-sm"><Plus className="h-4 w-4" /> Add session</button>
        <button onClick={() => save.mutate({ sessions: rows.map((r, i) => ({ ...r, sort: i, description: r.description ?? "" })) })} disabled={save.isPending} className="btn-primary btn-sm"><Save className="h-4 w-4" /> Save changes</button>
      </div>
    </div>
  );
}

function Ranges({ cal, setCal, field, title, hint }: { cal: Calendar; setCal: (c: Calendar) => void; field: "holidayPeriods" | "closures"; title: string; hint: string }) {
  const rows = [...cal[field]].sort((a, b) => a.start.localeCompare(b.start));
  const patch = (id: string, p: Partial<DateRange>) => setCal({ ...cal, [field]: cal[field].map((x) => (x.id === id ? { ...x, ...p } : x)) });
  return (
    <div className="card p-4 sm:p-5">
      <h2 className="h3">{title}</h2>
      <p className="mb-3 text-sm text-ink-500">{hint}</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <Input value={r.label} placeholder="Label" onChange={(e) => patch(r.id, { label: e.target.value })} />
            <button onClick={() => setCal({ ...cal, [field]: cal[field].filter((x) => x.id !== r.id) })} className="btn-ghost btn-sm text-coral-600 sm:order-last" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            <Input type="date" value={r.start} onChange={(e) => patch(r.id, { start: e.target.value })} />
            <Input type="date" value={r.end} onChange={(e) => patch(r.id, { end: e.target.value })} />
          </div>
        ))}
      </div>
      <button onClick={() => setCal({ ...cal, [field]: [...cal[field], { id: `r-${Date.now().toString(36)}`, label: "", start: "", end: "" }] })} className="btn-outline btn-sm mt-3"><Plus className="h-4 w-4" /> Add dates</button>
    </div>
  );
}

export function AdminCalendar() {
  const q = useQuery({ queryKey: ["admin", "calendar"], queryFn: () => api.get<{ calendar: Calendar }>("/manage/calendar") });
  const [cal, setCal] = useState<Calendar | null>(null);
  useEffect(() => { if (q.data && !cal) setCal(q.data.calendar); }, [q.data]);
  const save = useSaver<Calendar>("/manage/calendar", ["admin", "calendar"]);
  if (!cal) return <PageLoading />;
  return (
    <div className="space-y-4">
      <h1 className="h2">Calendar</h1>
      <p className="text-sm text-ink-500">Weekdays inside a holiday period offer Holiday Club sessions; all other weekdays offer After School Club. Closures block bookings entirely. Weekends are always closed.</p>
      {save.isSuccess && <Alert kind="success">Saved.</Alert>}
      {save.isError && <Alert>{(save.error as ApiError).message}</Alert>}
      <Ranges cal={cal} setCal={setCal} field="holidayPeriods" title="School holidays (Holiday Club runs)" hint="Enter the East Sussex term dates each year — half terms, Easter, summer and Christmas." />
      <Ranges cal={cal} setCal={setCal} field="closures" title="Closures" hint="Bank holidays, Christmas week, INSET days you don't open, staff training days." />
      <div className="card p-4 sm:p-5">
        <Field label="Minimum notice for online bookings (hours)" hint="Parents can't book sessions starting sooner than this. They can still call the office."><Input type="number" min="0" max="336" className="max-w-[160px]" value={cal.bookingCutoffHours} onChange={(e) => setCal({ ...cal, bookingCutoffHours: Number(e.target.value) })} /></Field>
      </div>
      <button onClick={() => save.mutate(cal)} disabled={save.isPending} className="btn-primary btn-sm"><Save className="h-4 w-4" /> Save calendar</button>
    </div>
  );
}

export function AdminSettings() {
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: () => api.get<{ settings: SiteSettings }>("/manage/settings") });
  const [s, setS] = useState<SiteSettings | null>(null);
  useEffect(() => { if (q.data && !s) setS(q.data.settings); }, [q.data]);
  const save = useSaver<SiteSettings>("/manage/settings", ["admin", "settings"]);
  if (!s) return <PageLoading />;
  const f = (k: keyof SiteSettings) => ({ value: (s[k] as string) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value }) });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="h2">Site settings</h1>
      {save.isSuccess && <Alert kind="success">Saved.</Alert>}
      {save.isError && <Alert>{(save.error as ApiError).message}</Alert>}
      <div className="card space-y-4 p-5">
        <Checkbox label={<><strong>Online bookings open.</strong> Untick to pause new booking requests (e.g. over the summer rush) — parents see a message to call instead.</>} checked={s.bookingsOpen} onChange={(e) => setS({ ...s, bookingsOpen: e.target.checked })} />
      </div>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Phone"><Input {...f("phone")} /></Field>
        <Field label="Email"><Input type="email" {...f("email")} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input {...f("address")} /></Field>
        <Field label="Facebook URL"><Input {...f("facebook")} /></Field>
        <Field label="Charity number"><Input {...f("charityNumber")} /></Field>
        <Field label="Ofsted URN (optional)"><Input {...f("ofstedUrn")} /></Field>
      </div>
      <div className="card grid gap-4 p-5">
        <Field label="Payment instructions" hint="Shown on the fees page, in confirmation emails and on parents' booking pages."><Textarea {...f("paymentInstructions")} /></Field>
        <Field label="Bank details (optional)" hint="Only shown to signed-in parents with confirmed bookings and in their confirmation email."><Textarea {...f("bankDetails")} className="min-h-[80px]" placeholder={"Account name: NIPPERS\nSort code: 00-00-00\nAccount: 00000000"} /></Field>
      </div>
      <button onClick={() => save.mutate(s)} disabled={save.isPending} className="btn-primary btn-sm"><Save className="h-4 w-4" /> Save settings</button>
    </div>
  );
}

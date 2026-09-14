import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Ban, Filter, Download } from "lucide-react";
import { api, ApiError, addDaysISO, fmtDate, money, todayISO } from "@/lib/api";
import { PageLoading, StatusBadge, Alert, Modal, Field, Textarea, Select, Input } from "@/components/ui";
import type { Booking, BookingStatus } from "@shared/types";

const STATUSES: (BookingStatus | "all")[] = ["pending", "confirmed", "declined", "cancelled", "all"];

export default function AdminBookings() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "pending") as BookingStatus | "all";
  const [from, setFrom] = useState(params.get("from") ?? addDaysISO(todayISO(), -7));
  const [to, setTo] = useState(params.get("to") ?? addDaysISO(todayISO(), 90));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<Booking | null>(null);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["admin", "bookings", from, to, status], queryFn: () => api.get<{ bookings: Booking[] }>(`/manage/bookings?from=${from}&to=${to}&status=${status}`) });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["admin"] }); setSelected(new Set()); };
  const bulk = useMutation({ mutationFn: (d: { ids: string[]; status: BookingStatus }) => api.post("/manage/bookings/bulk", d), onSuccess: invalidate });
  const one = useMutation({ mutationFn: (d: { id: string; status: BookingStatus; adminNotes?: string }) => api.put(`/manage/bookings/${d.id}`, { status: d.status, adminNotes: d.adminNotes ?? "" }), onSuccess: () => { invalidate(); setEdit(null); } });

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data?.bookings ?? []).filter((b) => !s || b.childName.toLowerCase().includes(s) || b.parentName.toLowerCase().includes(s));
  }, [q.data, search]);
  const grouped = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of list) m.set(b.date, [...(m.get(b.date) ?? []), b]);
    return [...m.entries()];
  }, [list]);
  const total = list.reduce((t, b) => t + b.price, 0);
  const toggleAll = () => setSelected(selected.size === list.length ? new Set() : new Set(list.map((b) => b.id)));

  const exportCsv = () => {
    const rows = [["Date", "Child", "Session", "Parent", "Price", "Status", "Notes"], ...list.map((b) => [b.date, b.childName, b.sessionLabel, b.parentName, b.price.toFixed(2), b.status, b.notes ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `bookings-${from}-to-${to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Bookings</h1>
        <button onClick={exportCsv} className="btn-outline btn-sm"><Download className="h-4 w-4" /> CSV</button>
      </div>
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => <button key={s} onClick={() => setParams({ status: s })} className={`chip capitalize ${status === s ? "border-sky-500 bg-sky-500 text-white" : "border-ink-900/10 bg-white"}`}>{s}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm"><span className="label">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-sm"><span className="label">To</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="text-sm"><span className="label">Search</span><Input placeholder="Child or parent name" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        </div>
      </div>
      {(bulk.isError || one.isError) && <Alert>{((bulk.error ?? one.error) as ApiError).message}</Alert>}

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-ink-900 p-3 text-white shadow-soft">
          <span className="mr-auto text-sm font-bold">{selected.size} selected</span>
          <button onClick={() => bulk.mutate({ ids: [...selected], status: "confirmed" })} className="btn btn-sm bg-leaf-500 text-white"><Check className="h-4 w-4" /> Confirm</button>
          <button onClick={() => bulk.mutate({ ids: [...selected], status: "declined" })} className="btn btn-sm bg-coral-500 text-white"><X className="h-4 w-4" /> Decline</button>
          <button onClick={() => window.confirm("Cancel the selected bookings?") && bulk.mutate({ ids: [...selected], status: "cancelled" })} className="btn btn-sm bg-white/10 text-white"><Ban className="h-4 w-4" /> Cancel</button>
        </div>
      )}

      {q.isLoading ? <PageLoading /> : list.length === 0 ? (
        <div className="card p-8 text-center text-ink-500"><Filter className="mx-auto mb-2 h-6 w-6" />No {status === "all" ? "" : status} bookings in this range.</div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-ink-500">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 rounded-md" checked={selected.size === list.length} onChange={toggleAll} /> Select all ({list.length})</label>
            <span>Total {money(total)}</span>
          </div>
          {grouped.map(([date, rows]) => (
            <div key={date} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-ink-900/[0.03] px-4 py-2 text-sm font-bold">
                <span>{fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}</span><span className="text-ink-500">{rows.length} · {money(rows.reduce((t, b) => t + b.price, 0))}</span>
              </div>
              <ul className="divide-y divide-ink-900/5">
                {rows.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 px-4 py-3">
                    <input type="checkbox" className="mt-1 h-5 w-5 rounded-md" checked={selected.has(b.id)} onChange={() => setSelected((s) => { const n = new Set(s); n.has(b.id) ? n.delete(b.id) : n.add(b.id); return n; })} aria-label={`Select ${b.childName}`} />
                    <button onClick={() => setEdit(b)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{b.childName}</span><StatusBadge status={b.status} /></div>
                      <div className="text-sm text-ink-500">{b.sessionLabel} · {b.parentName} · {money(b.price)}</div>
                      {b.notes && <div className="mt-1 text-xs text-ink-700"><span className="font-bold">Parent note:</span> {b.notes}</div>}
                      {b.adminNotes && <div className="mt-1 text-xs text-coral-600"><span className="font-bold">Admin note:</span> {b.adminNotes}</div>}
                    </button>
                    {b.status === "pending" && (
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => one.mutate({ id: b.id, status: "confirmed" })} className="rounded-full bg-leaf-100 p-2 text-leaf-700 hover:bg-leaf-200" aria-label="Confirm"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEdit(b)} className="rounded-full bg-coral-100 p-2 text-coral-600 hover:bg-coral-200" aria-label="Decline"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.childName} · ${fmtDate(edit.date)}` : ""}>
        {edit && <EditForm b={edit} onSave={(status, adminNotes) => one.mutate({ id: edit.id, status, adminNotes })} pending={one.isPending} />}
      </Modal>
    </div>
  );
}

function EditForm({ b, onSave, pending }: { b: Booking; onSave: (s: BookingStatus, n: string) => void; pending: boolean }) {
  const [status, setStatus] = useState<BookingStatus>(b.status);
  const [notes, setNotes] = useState(b.adminNotes ?? "");
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ink-900/[0.03] p-3 text-sm">
        <div><span className="font-bold">Session:</span> {b.sessionLabel} · {money(b.price)}</div>
        <div><span className="font-bold">Parent:</span> {b.parentName}</div>
        {b.notes && <div><span className="font-bold">Parent note:</span> {b.notes}</div>}
        <div className="text-xs text-ink-500">Requested {new Date(b.createdAt).toLocaleString("en-GB")}</div>
      </div>
      <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>{["pending", "confirmed", "declined", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
      <Field label="Note to parent (optional)" hint="Included in the email when declining."><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px]" /></Field>
      <button onClick={() => onSave(status, notes)} disabled={pending} className="btn-primary w-full">Save</button>
    </div>
  );
}

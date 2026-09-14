import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX, ClipboardList, Info } from "lucide-react";
import { api, ApiError, fmtDate, money, todayISO } from "@/lib/api";
import { StatusBadge, PageLoading, EmptyState, Alert } from "@/components/ui";
import type { Booking } from "@shared/types";

export default function Bookings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["bookings"], queryFn: () => api.get<{ bookings: Booking[]; paymentInstructions: string; bankDetails: string }>("/bookings") });
  const cancel = useMutation({ mutationFn: (id: string) => api.post(`/bookings/${id}/cancel`, {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["availability"] }); } });
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  if (q.isLoading) return <PageLoading />;
  const all = q.data?.bookings ?? [];
  const today = todayISO();
  const list = all.filter((b) => (tab === "upcoming" ? b.date >= today : b.date < today)).sort((a, b) => (tab === "upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
  const confirmedTotal = all.filter((b) => b.date >= today && b.status === "confirmed").reduce((t, b) => t + b.price, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="h2">My bookings</h1>
        <Link to="/account/book" className="btn-primary btn-sm">Book more</Link>
      </div>
      {cancel.isError && <Alert>{(cancel.error as ApiError).message}</Alert>}
      {confirmedTotal > 0 && (
        <div className="card flex items-start gap-3 bg-sky-50 p-4 text-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div>
            <p><strong>Confirmed upcoming sessions: {money(confirmedTotal)}.</strong> {q.data?.paymentInstructions}</p>
            {q.data?.bankDetails && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-xs">{q.data.bankDetails}</pre>}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {(["upcoming", "past"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`chip capitalize ${tab === t ? "border-sky-500 bg-sky-500 text-white" : "border-ink-900/10 bg-white"}`}>{t}</button>)}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-8 w-8" />} title={tab === "upcoming" ? "No upcoming bookings" : "No past bookings"} action={tab === "upcoming" ? <Link to="/account/book" className="btn-primary btn-sm">Book a session</Link> : undefined} />
      ) : (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="font-display font-semibold">{fmtDate(b.date, { weekday: "long", day: "numeric", month: "long" })}</span><StatusBadge status={b.status} /></div>
                <div className="mt-0.5 text-sm text-ink-500">{b.childName} · {b.sessionLabel} · {money(b.price)}</div>
                {b.adminNotes && b.status === "declined" && <div className="mt-1 text-sm text-coral-600">{b.adminNotes}</div>}
              </div>
              {tab === "upcoming" && (b.status === "pending" || b.status === "confirmed") && (
                <button onClick={() => window.confirm("Cancel this session? Late cancellations may still be charged — see our booking policy.") && cancel.mutate(b.id)} className="btn-outline btn-sm text-coral-600"><CalendarX className="h-4 w-4" /> Cancel</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

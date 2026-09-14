import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, ChevronLeft, ChevronRight, AlertTriangle, Camera, CameraOff } from "lucide-react";
import { api, addDaysISO, fmtDate, todayISO } from "@/lib/api";
import { PageLoading, Input, StatusBadge } from "@/components/ui";
import type { Booking, Child, SessionType } from "@shared/types";

interface Row {
  booking: Booking;
  child: Pick<Child, "firstName" | "lastName" | "dob" | "school" | "yearGroup" | "allergies" | "dietary" | "medical" | "additionalNeeds" | "emergencyContacts" | "photoConsent"> | null;
  parent: { name: string; phone: string; email: string } | null;
}

export default function Register() {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? todayISO();
  const q = useQuery({ queryKey: ["admin", "register", date], queryFn: () => api.get<{ rows: Row[]; sessions: SessionType[] }>(`/manage/register?date=${date}`) });
  const rows = q.data?.rows ?? [];
  const bySession = new Map<string, Row[]>();
  for (const r of rows) bySession.set(r.booking.sessionLabel, [...(bySession.get(r.booking.sessionLabel) ?? []), r]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <h1 className="h2">Daily register</h1>
        <button onClick={() => window.print()} className="btn-outline btn-sm"><Printer className="h-4 w-4" /> Print</button>
      </div>
      <div className="card flex items-center gap-2 p-3 no-print">
        <button onClick={() => setParams({ date: addDaysISO(date, -1) })} className="btn-ghost btn-sm" aria-label="Previous day"><ChevronLeft className="h-5 w-5" /></button>
        <Input type="date" value={date} onChange={(e) => setParams({ date: e.target.value })} className="flex-1" />
        <button onClick={() => setParams({ date: addDaysISO(date, 1) })} className="btn-ghost btn-sm" aria-label="Next day"><ChevronRight className="h-5 w-5" /></button>
        <button onClick={() => setParams({ date: todayISO() })} className="btn-ghost btn-sm">Today</button>
      </div>
      <div className="hidden print:block"><h1 className="text-xl font-bold">N.I.P.P.E.R.S. register — {fmtDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h1></div>
      {q.isLoading ? <PageLoading /> : rows.length === 0 ? <div className="card p-8 text-center text-ink-500">No children booked for {fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}.</div> : (
        [...bySession.entries()].map(([label, list]) => (
          <div key={label} className="card overflow-hidden print-full">
            <div className="flex items-center justify-between bg-sky-500 px-4 py-2 font-display font-semibold text-white print:bg-transparent print:text-ink-900 print:border-b"><span>{label}</span><span className="text-sm">{list.length} {list.length === 1 ? "child" : "children"}</span></div>
            <div className="table-wrap rounded-none border-0"><table className="table">
              <thead><tr><th className="w-8">In</th><th className="w-8">Out</th><th>Child</th><th>School / Year</th><th>Allergies & medical</th><th>Emergency contacts</th><th>Parent</th><th className="no-print">Status</th></tr></thead>
              <tbody>
                {list.map(({ booking, child, parent }) => (
                  <tr key={booking.id}>
                    <td><span className="inline-block h-5 w-5 rounded border-2 border-ink-900/30" /></td>
                    <td><span className="inline-block h-5 w-5 rounded border-2 border-ink-900/30" /></td>
                    <td className="font-bold whitespace-nowrap">{booking.childName}<div className="text-xs font-normal text-ink-500">{child ? `DOB ${fmtDate(child.dob, { day: "numeric", month: "short", year: "numeric" })}` : ""} {child && (child.photoConsent ? <Camera className="inline h-3 w-3 text-leaf-600" aria-label="Photo consent" /> : <CameraOff className="inline h-3 w-3 text-coral-500" aria-label="No photo consent" />)}</div></td>
                    <td>{child?.school}{child?.yearGroup ? ` · ${child.yearGroup}` : ""}</td>
                    <td className="max-w-[240px]">
                      {child?.allergies && <div className="font-bold text-coral-600"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{child.allergies}</div>}
                      {child?.dietary && <div>Diet: {child.dietary}</div>}
                      {child?.medical && <div>{child.medical}</div>}
                      {child?.additionalNeeds && <div className="text-ink-500">{child.additionalNeeds}</div>}
                      {!child?.allergies && !child?.medical && !child?.dietary && !child?.additionalNeeds && <span className="text-ink-300">—</span>}
                    </td>
                    <td className="text-xs">{child?.emergencyContacts.map((c) => <div key={c.phone}>{c.name} ({c.relationship}) <a href={`tel:${c.phone}`} className="font-bold">{c.phone}</a></div>)}</td>
                    <td className="text-xs">{parent?.name}<br /><a href={`tel:${parent?.phone}`} className="font-bold">{parent?.phone}</a></td>
                    <td className="no-print"><StatusBadge status={booking.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        ))
      )}
    </div>
  );
}

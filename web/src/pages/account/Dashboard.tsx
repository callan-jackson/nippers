import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Users, ClipboardList, ArrowRight, AlertTriangle } from "lucide-react";
import { api, fmtDate, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { StatusBadge, PageLoading } from "@/components/ui";
import type { Booking, Child } from "@shared/types";

export default function Dashboard() {
  const { user } = useAuth();
  const children = useQuery({ queryKey: ["children"], queryFn: () => api.get<{ children: Child[] }>("/children") });
  const bookings = useQuery({ queryKey: ["bookings"], queryFn: () => api.get<{ bookings: Booking[] }>("/bookings") });
  if (children.isLoading || bookings.isLoading) return <PageLoading />;
  const kids = children.data?.children ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (bookings.data?.bookings ?? []).filter((b) => b.date >= today && (b.status === "pending" || b.status === "confirmed")).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const pending = upcoming.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2">Hello, {user?.firstName} 👋</h1>
        <p className="mt-1 text-ink-500">{kids.length ? "What would you like to do today?" : "Let's get set up — add your child's details first."}</p>
      </div>

      {kids.length === 0 && (
        <div className="card flex items-start gap-4 border-2 border-sun-300 bg-sun-100 p-5">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-sun-600" />
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold">Add your first child</h2>
            <p className="mt-1 text-sm text-ink-700">We need each child's school, emergency contacts and any medical details before you can book.</p>
            <Link to="/account/children/new" className="btn-primary btn-sm mt-3">Add a child <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/account/book" className="card group p-5 transition hover:-translate-y-0.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600"><CalendarPlus className="h-6 w-6" /></div>
          <h2 className="h3 mt-3">Book sessions</h2>
          <p className="mt-1 text-sm text-ink-500">After School Club and Holiday Club</p>
        </Link>
        <Link to="/account/children" className="card group p-5 transition hover:-translate-y-0.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf-100 text-leaf-600"><Users className="h-6 w-6" /></div>
          <h2 className="h3 mt-3">My children</h2>
          <p className="mt-1 text-sm text-ink-500">{kids.length ? kids.map((k) => k.firstName).join(", ") : "No children added yet"}</p>
        </Link>
        <Link to="/account/bookings" className="card group p-5 transition hover:-translate-y-0.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-100 text-sun-600"><ClipboardList className="h-6 w-6" /></div>
          <h2 className="h3 mt-3">My bookings</h2>
          <p className="mt-1 text-sm text-ink-500">{pending ? `${pending} awaiting confirmation` : upcoming.length ? `${upcoming.length} upcoming` : "Nothing booked yet"}</p>
        </Link>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="h3">Coming up</h2>
          <Link to="/account/bookings" className="text-sm font-bold text-sky-600">View all</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No upcoming sessions. {kids.length ? <Link to="/account/book" className="font-bold text-sky-600">Book some now →</Link> : null}</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-900/5">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-bold">{fmtDate(b.date)} · {b.childName}</div>
                  <div className="text-sm text-ink-500">{b.sessionLabel} · {money(b.price)}</div>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Inbox, CalendarCheck, Users, UserRound, MessageSquare, ArrowRight } from "lucide-react";
import { api, fmtDate, money, todayISO } from "@/lib/api";
import { PageLoading, StatusBadge } from "@/components/ui";
import type { AdminStats } from "@shared/types";

export default function AdminDashboard() {
  const q = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api.get<AdminStats>("/manage/stats"), refetchInterval: 60_000 });
  if (q.isLoading || !q.data) return <PageLoading />;
  const s = q.data;
  const tiles = [
    { to: "/admin/bookings?status=pending", label: "Pending requests", value: s.pendingBookings, icon: <Inbox className="h-6 w-6" />, tone: s.pendingBookings ? "bg-sun-100 text-sun-600" : "bg-ink-900/5 text-ink-500" },
    { to: "/admin/bookings?status=confirmed", label: "Confirmed this week", value: s.confirmedThisWeek, icon: <CalendarCheck className="h-6 w-6" />, tone: "bg-leaf-100 text-leaf-600" },
    { to: "/admin/children", label: "Children registered", value: s.childrenRegistered, icon: <UserRound className="h-6 w-6" />, tone: "bg-sky-100 text-sky-600" },
    { to: "/admin/parents", label: "Parent accounts", value: s.parentsRegistered, icon: <Users className="h-6 w-6" />, tone: "bg-sky-100 text-sky-600" },
    { to: "/admin/messages", label: "Unread messages", value: s.unreadMessages, icon: <MessageSquare className="h-6 w-6" />, tone: s.unreadMessages ? "bg-coral-100 text-coral-500" : "bg-ink-900/5 text-ink-500" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="h2">Dashboard</h1><p className="text-ink-500">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p></div>
        <Link to={`/admin/register?date=${todayISO()}`} className="btn-primary btn-sm">Today's register <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="card p-4 transition hover:-translate-y-0.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.tone}`}>{t.icon}</div>
            <div className="mt-3 font-display text-3xl font-bold">{t.value}</div>
            <div className="text-xs font-bold text-ink-500">{t.label}</div>
          </Link>
        ))}
      </div>
      <div className="card p-5">
        <div className="flex items-center justify-between"><h2 className="h3">Next sessions</h2><Link to="/admin/bookings" className="text-sm font-bold text-sky-600">All bookings</Link></div>
        {s.upcoming.length === 0 ? <p className="mt-3 text-sm text-ink-500">Nothing booked yet.</p> : (
          <div className="table-wrap mt-3"><table className="table">
            <thead><tr><th>Date</th><th>Child</th><th>Session</th><th>Parent</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>{s.upcoming.map((b) => <tr key={b.id}><td className="whitespace-nowrap">{fmtDate(b.date)}</td><td>{b.childName}</td><td>{b.sessionLabel}</td><td>{b.parentName}</td><td>{money(b.price)}</td><td><StatusBadge status={b.status} /></td></tr>)}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

// Shared shell for the parent account area and the admin area: a sidebar on
// desktop, a horizontally-scrolling tab bar on phones.
import { type ReactNode, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Home } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import { PageLoading } from "./ui";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

export function AppLayout({ items, title, role }: { items: NavItem[]; title: string; role: "parent" | "admin" }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) nav(`/login?next=${encodeURIComponent(loc.pathname)}`, { replace: true });
    else if (role === "admin" && !isAdmin) nav("/account", { replace: true });
  }, [user, loading, isAdmin, role]);

  if (loading || !user || (role === "admin" && !isAdmin)) return <PageLoading />;

  return (
    <div className="flex min-h-dvh flex-col bg-cream lg:flex-row">
      <aside className="border-b border-ink-900/5 bg-white lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r no-print">
        <div className="flex h-16 items-center justify-between px-4 lg:h-20">
          <Link to="/" aria-label="Home"><Logo compact /></Link>
          <span className="badge bg-sky-100 text-sky-700 lg:hidden">{title}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:max-h-[calc(100dvh-11rem)] lg:flex-col lg:overflow-y-auto lg:px-3 lg:pb-0" aria-label={title}>
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition lg:rounded-2xl lg:px-3 lg:py-2.5 ${isActive ? "bg-sky-500 text-white" : "text-ink-700 hover:bg-ink-900/5"}`}
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:block lg:border-t lg:border-ink-900/5 lg:p-3">
          <p className="truncate px-2 text-xs font-bold text-ink-500">{user.email}</p>
          <div className="mt-2 flex gap-1">
            <Link to="/" className="btn-ghost btn-sm flex-1 justify-start"><Home className="h-4 w-4" /> Website</Link>
            <button onClick={() => logout().then(() => nav("/"))} className="btn-ghost btn-sm"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      </aside>
      <div className="flex-1">
        <div className="hidden h-20 items-center justify-between border-b border-ink-900/5 bg-white px-6 lg:flex no-print">
          <h1 className="font-display text-xl font-semibold">{title}</h1>
          <span className="text-sm text-ink-500">Hi, {user.firstName}</span>
        </div>
        <div className="container-x py-5 lg:py-8 lg:max-w-5xl">
          <Outlet />
        </div>
        <div className="container-x pb-8 lg:hidden no-print">
          <div className="flex gap-2">
            <Link to="/" className="btn-outline btn-sm flex-1"><Home className="h-4 w-4" /> Website</Link>
            <button onClick={() => logout().then(() => nav("/"))} className="btn-outline btn-sm flex-1"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}

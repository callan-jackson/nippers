import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, Phone, Mail, MapPin, Facebook, CalendarCheck, UserCircle } from "lucide-react";
import { Logo, Mark } from "./Logo";
import { useAuth } from "@/lib/auth";
import { useSite } from "@/lib/site";

const NAV = [
  { to: "/about", label: "About", short: "About" },
  { to: "/after-school-club", label: "After School Club", short: "After School" },
  { to: "/holiday-club", label: "Holiday Club", short: "Holiday Club" },
  { to: "/forest-school", label: "Forest School", short: "Forest School" },
  { to: "/fees", label: "Fees", short: "Fees" },
  { to: "/gallery", label: "Gallery", short: "Gallery" },
  { to: "/policies", label: "Policies", short: "Policies" },
  { to: "/contact", label: "Contact", short: "Contact" },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { data: site } = useSite();
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const accountTo = isAdmin ? "/admin" : "/account";
  const announcements = site?.announcements ?? [];

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-ink-900/5 bg-cream/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4 sm:h-20">
          <Link to="/" aria-label="N.I.P.P.E.R.S. home" className="shrink-0">
            <span className="hidden sm:inline-flex"><Logo /></span>
            <span className="sm:hidden"><Logo compact /></span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-bold transition xl:px-3 ${isActive ? "bg-sky-100 text-sky-700" : "text-ink-700 hover:bg-ink-900/5"}`}>
                {n.short}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to={user ? `${accountTo}${isAdmin ? "" : "/book"}` : "/register"} className="btn-sun btn-sm hidden sm:inline-flex">
              <CalendarCheck className="h-4 w-4" /> {user ? (isAdmin ? "Admin" : "Book now") : "Book now"}
            </Link>
            <Link to={user ? accountTo : "/login"} className="btn-ghost btn-sm hidden sm:inline-flex" aria-label={user ? "My account" : "Sign in"}>
              <UserCircle className="h-5 w-5" /> {user ? user.firstName : "Sign in"}
            </Link>
            <button onClick={() => setOpen(true)} className="rounded-full p-2.5 hover:bg-ink-900/5 lg:hidden" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-sky-500 text-white lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Logo compact light />
            <button onClick={() => setOpen(false)} className="rounded-full p-2.5 hover:bg-white/10" aria-label="Close menu">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 pb-6" aria-label="Mobile">
            <NavLink to="/" className="block rounded-2xl px-4 py-3 font-display text-2xl font-semibold hover:bg-white/10">Home</NavLink>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `block rounded-2xl px-4 py-3 font-display text-2xl font-semibold ${isActive ? "bg-white/15" : "hover:bg-white/10"}`}>
                {n.label}
              </NavLink>
            ))}
            <div className="mt-6 grid gap-3">
              <Link to={user ? `${accountTo}${isAdmin ? "" : "/book"}` : "/register"} className="btn-sun w-full">
                <CalendarCheck className="h-5 w-5" /> {user && !isAdmin ? "Book a session" : user ? "Admin dashboard" : "Create account & book"}
              </Link>
              <Link to={user ? accountTo : "/login"} className="btn w-full border-2 border-white/40 text-white">
                <UserCircle className="h-5 w-5" /> {user ? "My account" : "Sign in"}
              </Link>
            </div>
          </nav>
        </div>
      )}

      {announcements.length > 0 && (
        <div className={`${announcements[0].level === "warning" ? "bg-coral-500" : "bg-sun-400 text-ink-900"} text-center text-sm font-bold ${announcements[0].level === "warning" ? "text-white" : ""}`}>
          <div className="container-x py-2">
            <strong>{announcements[0].title}:</strong> {announcements[0].body}
          </div>
        </div>
      )}

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 bg-ink-900 text-white">
        <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo light />
            <p className="mt-4 text-sm text-white/70">Newhaven Inclusive Play Project Educational and Recreational Services. A registered charity run by a volunteer management committee since 1973.</p>
            <p className="mt-3 text-xs text-white/50">Registered charity no. {site?.settings.charityNumber ?? "1087572"}</p>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-sun-300">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.to}><Link to={n.to} className="text-white/80 hover:text-white">{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-sun-300">Parents</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/register" className="text-white/80 hover:text-white">Create an account</Link></li>
              <li><Link to="/login" className="text-white/80 hover:text-white">Sign in</Link></li>
              <li><Link to="/account/book" className="text-white/80 hover:text-white">Book sessions</Link></li>
              <li><Link to="/fees" className="text-white/80 hover:text-white">Price list</Link></li>
              <li><Link to="/policies" className="text-white/80 hover:text-white">Our policies</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-sun-300">Find us</h3>
            <ul className="mt-3 space-y-3 text-sm text-white/80">
              <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sun-300" /><span>{site?.settings.address ?? "East Side Social Centre, Norton Terrace, Newhaven, BN9 0BT"}</span></li>
              <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-sun-300" /><a href={`tel:${(site?.settings.phone ?? "07564452837").replace(/\s/g, "")}`} className="hover:text-white">{site?.settings.phone ?? "07564 452837"}</a></li>
              <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-sun-300" /><a href={`mailto:${site?.settings.email ?? "nippers1973@outlook.com"}`} className="break-all hover:text-white">{site?.settings.email ?? "nippers1973@outlook.com"}</a></li>
              <li className="flex gap-2"><Facebook className="mt-0.5 h-4 w-4 shrink-0 text-sun-300" /><a href={site?.settings.facebook ?? "https://facebook.com/NIPPERS1973/"} target="_blank" rel="noreferrer" className="hover:text-white">Follow us on Facebook</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-x flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} N.I.P.P.E.R.S. · Ofsted registered · All rights reserved</span>
            <span className="inline-flex items-center gap-2"><Mark size={16} /> Play, create, grow — since 1973</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

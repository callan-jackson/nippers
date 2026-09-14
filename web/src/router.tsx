import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Link } from "react-router-dom";
import { PageLoading } from "./components/ui";
import { LayoutDashboard, CalendarPlus, Users, ClipboardList, Settings, Inbox, ClipboardCheck, UserRound, Clock, CalendarDays, MessageSquare, Quote, FileText, Megaphone, Image, Cog } from "lucide-react";
import { PublicLayout } from "./components/PublicLayout";
import { AppLayout } from "./components/AppLayout";
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import { AfterSchoolClub, HolidayClub, ForestSchool } from "./pages/public/Clubs";
import { Fees, Gallery, Policies, Contact } from "./pages/public/Info";
import { Login, Register, ForgotPassword, ResetPassword } from "./pages/public/Auth";
// Account and admin areas are code-split so the public site stays light.
const L = (load: () => Promise<Record<string, any>>, name: string) => {
  const C = lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));
  return (
    <Suspense fallback={<PageLoading />}>
      <C />
    </Suspense>
  );
};
const Dashboard = L(() => import("./pages/account/Dashboard"), "default");
const ChildrenList = L(() => import("./pages/account/Children"), "ChildrenList");
const ChildForm = L(() => import("./pages/account/Children"), "ChildForm");
const Book = L(() => import("./pages/account/Book"), "default");
const Bookings = L(() => import("./pages/account/Bookings"), "default");
const AccountSettings = L(() => import("./pages/account/Settings"), "default");
const AdminDashboard = L(() => import("./pages/admin/Dashboard"), "default");
const AdminBookings = L(() => import("./pages/admin/Bookings"), "default");
const AdminRegister = L(() => import("./pages/admin/Register"), "default");
const AdminChildren = L(() => import("./pages/admin/People"), "AdminChildren");
const AdminParents = L(() => import("./pages/admin/People"), "AdminParents");
const AdminSessions = L(() => import("./pages/admin/Setup"), "AdminSessions");
const AdminCalendar = L(() => import("./pages/admin/Setup"), "AdminCalendar");
const AdminSettings = L(() => import("./pages/admin/Setup"), "AdminSettings");
const AdminTestimonials = L(() => import("./pages/admin/Content"), "AdminTestimonials");
const AdminPolicies = L(() => import("./pages/admin/Content"), "AdminPolicies");
const AdminAnnouncements = L(() => import("./pages/admin/Content"), "AdminAnnouncements");
const AdminGallery = L(() => import("./pages/admin/Content"), "AdminGallery");
const AdminMessages = L(() => import("./pages/admin/Content"), "AdminMessages");

const i = "h-4 w-4";
const accountNav = [
  { to: "/account", label: "Overview", icon: <LayoutDashboard className={i} />, end: true },
  { to: "/account/book", label: "Book", icon: <CalendarPlus className={i} /> },
  { to: "/account/bookings", label: "My bookings", icon: <ClipboardList className={i} /> },
  { to: "/account/children", label: "My children", icon: <Users className={i} /> },
  { to: "/account/settings", label: "Settings", icon: <Settings className={i} /> },
];
const adminNav = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard className={i} />, end: true },
  { to: "/admin/bookings", label: "Bookings", icon: <Inbox className={i} /> },
  { to: "/admin/register", label: "Register", icon: <ClipboardCheck className={i} /> },
  { to: "/admin/children", label: "Children", icon: <UserRound className={i} /> },
  { to: "/admin/parents", label: "Parents", icon: <Users className={i} /> },
  { to: "/admin/sessions", label: "Sessions & prices", icon: <Clock className={i} /> },
  { to: "/admin/calendar", label: "Calendar", icon: <CalendarDays className={i} /> },
  { to: "/admin/messages", label: "Messages", icon: <MessageSquare className={i} /> },
  { to: "/admin/testimonials", label: "Testimonials", icon: <Quote className={i} /> },
  { to: "/admin/policies", label: "Policies", icon: <FileText className={i} /> },
  { to: "/admin/announcements", label: "Announcements", icon: <Megaphone className={i} /> },
  { to: "/admin/gallery", label: "Gallery", icon: <Image className={i} /> },
  { to: "/admin/settings", label: "Settings", icon: <Cog className={i} /> },
];

function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="h1">Lost in the woods?</h1>
      <p className="lead mt-3">We can't find that page.</p>
      <Link to="/" className="btn-primary mt-6">Back home</Link>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/about", element: <About /> },
      { path: "/after-school-club", element: <AfterSchoolClub /> },
      { path: "/holiday-club", element: <HolidayClub /> },
      { path: "/forest-school", element: <ForestSchool /> },
      { path: "/fees", element: <Fees /> },
      { path: "/gallery", element: <Gallery /> },
      { path: "/policies", element: <Policies /> },
      { path: "/contact", element: <Contact /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  {
    path: "/account",
    element: <AppLayout items={accountNav} title="My account" role="parent" />,
    children: [
      { index: true, element: Dashboard },
      { path: "book", element: Book },
      { path: "bookings", element: Bookings },
      { path: "children", element: ChildrenList },
      { path: "children/new", element: ChildForm },
      { path: "children/:id", element: ChildForm },
      { path: "settings", element: AccountSettings },
    ],
  },
  {
    path: "/admin",
    element: <AppLayout items={adminNav} title="Admin" role="admin" />,
    children: [
      { index: true, element: AdminDashboard },
      { path: "bookings", element: AdminBookings },
      { path: "register", element: AdminRegister },
      { path: "children", element: AdminChildren },
      { path: "parents", element: AdminParents },
      { path: "sessions", element: AdminSessions },
      { path: "calendar", element: AdminCalendar },
      { path: "messages", element: AdminMessages },
      { path: "testimonials", element: AdminTestimonials },
      { path: "policies", element: AdminPolicies },
      { path: "announcements", element: AdminAnnouncements },
      { path: "gallery", element: AdminGallery },
      { path: "settings", element: AdminSettings },
    ],
  },
]);

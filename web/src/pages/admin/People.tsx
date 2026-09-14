import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, UserX, UserCheck } from "lucide-react";
import { api, ApiError, fmtDate, fmtDateTime } from "@/lib/api";
import { PageLoading, Input, Alert, Modal } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import type { Child, User } from "@shared/types";

type ChildRow = Child & { parent: { name: string; phone: string; email: string } | null };

export function AdminChildren() {
  const q = useQuery({ queryKey: ["admin", "children"], queryFn: () => api.get<{ children: ChildRow[] }>("/manage/children") });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<ChildRow | null>(null);
  const list = useMemo(() => {
    const s = search.toLowerCase();
    return (q.data?.children ?? []).filter((c) => !s || `${c.firstName} ${c.lastName} ${c.school} ${c.parent?.name ?? ""}`.toLowerCase().includes(s));
  }, [q.data, search]);
  if (q.isLoading) return <PageLoading />;
  return (
    <div className="space-y-4">
      <h1 className="h2">Children</h1>
      <div className="relative"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300" /><Input className="pl-12" placeholder="Search by child, school or parent" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="table-wrap bg-white"><table className="table">
        <thead><tr><th>Child</th><th>DOB</th><th>School</th><th>Allergies</th><th>Parent</th></tr></thead>
        <tbody>{list.map((c) => (
          <tr key={c.id} className="cursor-pointer hover:bg-sky-50" onClick={() => setOpen(c)}>
            <td className="font-bold whitespace-nowrap">{c.firstName} {c.lastName}</td>
            <td className="whitespace-nowrap">{fmtDate(c.dob, { day: "numeric", month: "short", year: "numeric" })}</td>
            <td>{c.school}{c.yearGroup ? ` (${c.yearGroup})` : ""}</td>
            <td className={c.allergies ? "font-bold text-coral-600" : "text-ink-300"}>{c.allergies || "—"}</td>
            <td>{c.parent?.name}<br /><span className="text-xs text-ink-500">{c.parent?.phone}</span></td>
          </tr>
        ))}</tbody>
      </table></div>
      {list.length === 0 && <p className="text-center text-sm text-ink-500">No children found.</p>}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.firstName} ${open.lastName}` : ""}>
        {open && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Date of birth", fmtDate(open.dob, { day: "numeric", month: "long", year: "numeric" })],
              ["School", `${open.school}${open.yearGroup ? ` · ${open.yearGroup}` : ""}`],
              ["Allergies", open.allergies], ["Dietary", open.dietary], ["Medical", open.medical], ["Additional needs", open.additionalNeeds],
              ["GP", [open.doctorName, open.doctorPhone].filter(Boolean).join(" · ")],
              ["Photo consent", open.photoConsent ? "Yes" : "No"],
              ["Parent", open.parent ? `${open.parent.name} · ${open.parent.phone} · ${open.parent.email}` : "—"],
              ["Emergency contacts", open.emergencyContacts.map((e) => `${e.name} (${e.relationship}) ${e.phone}`).join("\n")],
              ["Registered", fmtDateTime(open.createdAt)],
            ].map(([k, v]) => v ? <div key={k as string} className={k === "Emergency contacts" || k === "Parent" ? "sm:col-span-2" : ""}><dt className="font-bold text-ink-500">{k}</dt><dd className="whitespace-pre-wrap">{v}</dd></div> : null)}
          </dl>
        )}
      </Modal>
    </div>
  );
}

export function AdminParents() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const q = useQuery({ queryKey: ["admin", "users"], queryFn: () => api.get<{ users: User[] }>("/manage/users") });
  const update = useMutation({ mutationFn: (d: { id: string; role?: "parent" | "admin"; disabled?: boolean }) => api.put(`/manage/users/${d.id}`, { role: d.role, disabled: d.disabled }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }) });
  const [search, setSearch] = useState("");
  const list = (q.data?.users ?? []).filter((u) => !search || `${u.firstName} ${u.lastName} ${u.email} ${u.postcode}`.toLowerCase().includes(search.toLowerCase()));
  if (q.isLoading) return <PageLoading />;
  return (
    <div className="space-y-4">
      <h1 className="h2">Parents & staff</h1>
      <p className="text-sm text-ink-500">Make a colleague an admin to give them access to this dashboard. Disabling an account blocks sign-in without deleting anything.</p>
      {update.isError && <Alert>{(update.error as ApiError).message}</Alert>}
      <div className="relative"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300" /><Input className="pl-12" placeholder="Search name, email or postcode" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="table-wrap bg-white"><table className="table">
        <thead><tr><th>Name</th><th>Contact</th><th>Address</th><th>Joined</th><th>Role</th><th></th></tr></thead>
        <tbody>{list.map((u) => (
          <tr key={u.id} className={u.disabled ? "opacity-50" : ""}>
            <td className="font-bold whitespace-nowrap">{u.firstName} {u.lastName}{u.role === "admin" && <ShieldCheck className="ml-1 inline h-4 w-4 text-sky-500" aria-label="Admin" />}</td>
            <td className="text-xs">{u.email}<br />{u.phone}</td>
            <td className="text-xs">{u.addressLine1}, {u.town} {u.postcode}</td>
            <td className="whitespace-nowrap text-xs">{fmtDate(u.createdAt.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</td>
            <td><select className="rounded-xl border border-ink-900/10 px-2 py-1 text-xs" value={u.role} disabled={u.id === me?.id} onChange={(e) => update.mutate({ id: u.id, role: e.target.value as "parent" | "admin" })}><option value="parent">Parent</option><option value="admin">Admin</option></select></td>
            <td>{u.id !== me?.id && <button onClick={() => update.mutate({ id: u.id, disabled: !u.disabled })} className="btn-ghost btn-sm text-xs">{u.disabled ? <><UserCheck className="h-4 w-4" /> Enable</> : <><UserX className="h-4 w-4" /> Disable</>}</button>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}

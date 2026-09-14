import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check, ShoppingBag, ArrowRight, ArrowLeft, Trash2, CheckCircle2, Repeat, UserRound } from "lucide-react";
import { api, ApiError, addDaysISO, fmtDate, money, todayISO } from "@/lib/api";
import { useSite } from "@/lib/site";
import { Modal, Alert, PageLoading, EmptyState, Textarea } from "@/components/ui";
import type { AvailabilityDay, Child, SessionType, Booking } from "@shared/types";

interface Item {
  childId: string;
  date: string;
  sessionTypeId: string;
}
const key = (i: Item) => `${i.childId}|${i.date}|${i.sessionTypeId}`;

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = `${ym}-01`;
  const last = new Date(y, m, 0).getDate();
  return { first, last: `${ym}-${String(last).padStart(2, "0")}`, y, m };
}
function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Book() {
  const { data: site } = useSite();
  const kidsQ = useQuery({ queryKey: ["children"], queryFn: () => api.get<{ children: Child[] }>("/children") });
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [selectedKids, setSelectedKids] = useState<string[] | null>(null);
  const [basket, setBasket] = useState<Map<string, Item>>(new Map());
  const [sheet, setSheet] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "review" | "done">("pick");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<{ bookings: Booking[]; total: number } | null>(null);
  const qc = useQueryClient();

  const { first, last } = monthRange(month);
  const availQ = useQuery({
    queryKey: ["availability", month],
    queryFn: () => api.get<{ days: AvailabilityDay[] }>(`/public/availability?from=${first}&to=${last}`),
    staleTime: 60 * 1000,
  });

  const kids = kidsQ.data?.children ?? [];
  const chosen = selectedKids ?? (kids.length === 1 ? [kids[0].id] : []);
  const sessions = useMemo(() => new Map((site?.sessions ?? []).map((s) => [s.id, s])), [site]);
  const days = useMemo(() => new Map((availQ.data?.days ?? []).map((d) => [d.date, d])), [availQ.data]);
  const childName = (id: string) => kids.find((k) => k.id === id)?.firstName ?? "";

  const submit = useMutation({
    mutationFn: (items: Item[]) => api.post<{ bookings: Booking[]; total: number }>("/bookings", { items, notes }),
    onSuccess: (r) => {
      setResult(r);
      setBasket(new Map());
      setStep("done");
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
  });

  if (!site || kidsQ.isLoading) return <PageLoading />;
  if (!site.settings.bookingsOpen) return <Alert kind="info">Online bookings are paused at the moment. Please call {site.settings.phone} or email {site.settings.email} to book.</Alert>;
  if (kids.length === 0) return <EmptyState icon={<UserRound className="h-8 w-8" />} title="Add a child first" body="We need your child's details (school, emergency contacts, medical info) before you can book." action={<Link to="/account/children/new" className="btn-primary btn-sm">Add a child</Link>} />;

  const toggle = (item: Item) => {
    setBasket((b) => {
      const n = new Map(b);
      const k = key(item);
      if (n.has(k)) n.delete(k);
      else n.set(k, item);
      return n;
    });
  };
  const items = [...basket.values()].sort((a, b) => a.date.localeCompare(b.date) || childName(a.childId).localeCompare(childName(b.childId)));
  const total = items.reduce((t, i) => t + (sessions.get(i.sessionTypeId)?.price ?? 0), 0);

  if (step === "done" && result) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-6 text-center sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 text-leaf-600"><CheckCircle2 className="h-9 w-9" /></div>
          <h1 className="h2 mt-4">Request sent!</h1>
          <p className="mt-2 text-ink-500">We've received {result.bookings.length} session{result.bookings.length > 1 ? "s" : ""} totalling <strong className="text-ink-900">{money(result.total)}</strong>. Our team will confirm within two working days and you'll get an email — nothing to pay until then.</p>
          <ul className="mt-5 divide-y divide-ink-900/5 rounded-2xl border border-ink-900/10 text-left text-sm">
            {result.bookings.map((b) => (
              <li key={b.id} className="flex justify-between gap-3 px-4 py-2.5"><span>{fmtDate(b.date)} · {b.childName}<br /><span className="text-ink-500">{b.sessionLabel}</span></span><span className="font-bold">{money(b.price)}</span></li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/account/bookings" className="btn-primary">View my bookings</Link>
            <button onClick={() => { setStep("pick"); setResult(null); }} className="btn-outline">Book more</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "review") {
    const byDate = new Map<string, Item[]>();
    for (const i of items) byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]);
    const problems: Record<number, string> = {};
    if (submit.isError && (submit.error as ApiError).details?.problems) for (const p of (submit.error as ApiError).details!.problems) problems[p.index] = p.reason;
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => setStep("pick")} className="btn-ghost btn-sm -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> Back to calendar</button>
        <h1 className="h2">Review your booking</h1>
        <p className="mt-1 text-ink-500">Check everything looks right, then send your request.</p>
        {submit.isError && <div className="mt-4"><Alert>{submit.error.message}{Object.keys(problems).length ? " — see the highlighted sessions below." : ""}</Alert></div>}
        <div className="mt-5 space-y-3">
          {[...byDate.entries()].map(([date, list]) => (
            <div key={date} className="card p-4">
              <div className="mb-2 font-display font-semibold">{fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}</div>
              <ul className="divide-y divide-ink-900/5">
                {list.map((i) => {
                  const idx = items.indexOf(i);
                  const s = sessions.get(i.sessionTypeId)!;
                  return (
                    <li key={key(i)} className={`flex items-center justify-between gap-3 py-2 ${problems[idx] ? "text-coral-600" : ""}`}>
                      <div className="text-sm"><span className="font-bold">{childName(i.childId)}</span> · {s.label} ({s.start}–{s.end}){problems[idx] && <div className="text-xs font-bold">{problems[idx]}</div>}</div>
                      <div className="flex items-center gap-2"><span className="font-bold">{money(s.price)}</span><button onClick={() => toggle(i)} className="rounded-full p-1.5 text-ink-400 hover:bg-coral-100 hover:text-coral-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="card mt-4 p-4">
          <label className="label">Anything we should know? (optional)</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[90px]" placeholder="e.g. Grandma will be collecting on Thursday" maxLength={1000} />
        </div>
        <div className="card mt-4 flex items-center justify-between p-4">
          <div><div className="text-sm text-ink-500">{items.length} session{items.length !== 1 ? "s" : ""}</div><div className="font-display text-2xl font-bold">{money(total)}</div></div>
          <button onClick={() => submit.mutate(items)} disabled={submit.isPending || items.length === 0} className="btn-primary">Send request <ArrowRight className="h-5 w-5" /></button>
        </div>
        <p className="mt-3 text-center text-xs text-ink-500">Nothing is charged now. We'll invoice once confirmed — {site.settings.paymentInstructions.split(".")[1]?.trim() || "bank transfer, Tax-Free Childcare and vouchers accepted"}.</p>
      </div>
    );
  }

  // ---- Step 1: pick ----
  const { y, m } = monthRange(month);
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const today = todayISO();
  const minMonth = today.slice(0, 7);
  const maxMonth = addDaysISO(today, 200).slice(0, 7);
  const sheetDay = sheet ? days.get(sheet) : undefined;
  const countFor = (date: string) => items.filter((i) => i.date === date).length;

  const bulkAdd = (weekdays: number[], sessionTypeId: string) => {
    setBasket((b) => {
      const n = new Map(b);
      for (const d of days.values()) {
        const dow = (new Date(d.date + "T12:00:00").getDay() + 6) % 7;
        if (!weekdays.includes(dow)) continue;
        const slot = d.sessions.find((s) => s.sessionTypeId === sessionTypeId);
        if (!slot || slot.remaining <= 0) continue;
        for (const c of chosen) {
          const it = { childId: c, date: d.date, sessionTypeId };
          n.set(key(it), it);
        }
      }
      return n;
    });
  };

  return (
    <div className="pb-28 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:pb-0">
      <div className="space-y-5">
        <div>
          <h1 className="h2">Book sessions</h1>
          <p className="mt-1 text-ink-500">Tap a day to choose sessions. <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" /> After School</span> · <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full bg-sun-500" /> Holiday Club</span></p>
        </div>

        {kids.length > 1 && (
          <div className="card p-4">
            <div className="mb-2 text-sm font-bold text-ink-700">Booking for</div>
            <div className="flex flex-wrap gap-2">
              {kids.map((k) => {
                const on = chosen.includes(k.id);
                return (
                  <button key={k.id} onClick={() => setSelectedKids(on ? chosen.filter((c) => c !== k.id) : [...chosen, k.id])} className={`chip ${on ? "border-sky-500 bg-sky-500 text-white" : "border-ink-900/10 bg-white text-ink-700"}`} aria-pressed={on}>
                    {on && <Check className="h-4 w-4" />} {k.firstName}
                  </button>
                );
              })}
            </div>
            {chosen.length === 0 && <p className="mt-2 text-xs font-bold text-coral-600">Select at least one child.</p>}
          </div>
        )}

        <div className="card p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => setMonth(shiftMonth(month, -1))} disabled={month <= minMonth} className="btn-ghost btn-sm" aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-display text-lg font-semibold sm:text-xl">{new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
            <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= maxMonth} className="btn-ghost btn-sm" aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-ink-400 sm:text-xs">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          {availQ.isLoading ? (
            <PageLoading />
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {cells.map((date, i) => {
                if (!date) return <div key={`e${i}`} />;
                const d = days.get(date);
                const open = !!d?.club && chosen.length > 0;
                const n = countFor(date);
                const tone = d?.club === "holiday" ? "bg-sun-100 text-ink-900 hover:bg-sun-200" : d?.club === "afterschool" ? "bg-sky-50 text-ink-900 hover:bg-sky-100" : "bg-transparent text-ink-300";
                return (
                  <button
                    key={date}
                    disabled={!open}
                    onClick={() => setSheet(date)}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold transition sm:rounded-2xl sm:text-base ${tone} ${n ? "ring-2 ring-sky-500" : ""} ${date === today ? "underline decoration-2 underline-offset-4" : ""} disabled:cursor-not-allowed`}
                    aria-label={`${fmtDate(date, { weekday: "long", day: "numeric", month: "long" })}${d?.club ? `, ${d.club === "holiday" ? "holiday club" : "after school club"}` : ", closed"}${n ? `, ${n} selected` : ""}`}
                  >
                    {Number(date.slice(-2))}
                    {d?.club && <i className={`mt-0.5 h-1.5 w-1.5 rounded-full ${d.club === "holiday" ? "bg-sun-500" : "bg-sky-500"}`} />}
                    {n > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1 text-[11px] text-white">{n}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <RegularPattern sessions={site.sessions} onAdd={bulkAdd} disabled={chosen.length === 0} month={new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long" })} />
      </div>

      {/* Basket: sticky panel on desktop, bottom bar on mobile */}
      <aside className="hidden lg:block">
        <div className="card sticky top-24 p-5">
          <h2 className="h3 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-sky-500" /> Your selection</h2>
          {items.length === 0 ? <p className="mt-3 text-sm text-ink-500">Nothing selected yet.</p> : (
            <ul className="mt-3 max-h-[50vh] divide-y divide-ink-900/5 overflow-y-auto text-sm">
              {items.map((i) => (
                <li key={key(i)} className="flex items-center justify-between gap-2 py-2">
                  <span><span className="font-bold">{fmtDate(i.date, { day: "numeric", month: "short" })}</span> · {childName(i.childId)}<br /><span className="text-ink-500">{sessions.get(i.sessionTypeId)?.label}</span></span>
                  <button onClick={() => toggle(i)} className="rounded-full p-1 text-ink-400 hover:text-coral-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-ink-900/5 pt-4"><span className="text-sm text-ink-500">{items.length} session{items.length !== 1 ? "s" : ""}</span><span className="font-display text-2xl font-bold">{money(total)}</span></div>
          <button onClick={() => setStep("review")} disabled={items.length === 0} className="btn-primary mt-3 w-full">Review &amp; book <ArrowRight className="h-5 w-5" /></button>
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-900/5 bg-white/95 p-3 backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="container-x flex items-center justify-between gap-3 px-0">
          <div><div className="text-xs font-bold text-ink-500">{items.length} session{items.length !== 1 ? "s" : ""} selected</div><div className="font-display text-xl font-bold">{money(total)}</div></div>
          <button onClick={() => setStep("review")} disabled={items.length === 0} className="btn-primary">Review &amp; book <ArrowRight className="h-5 w-5" /></button>
        </div>
      </div>

      <Modal open={!!sheet && !!sheetDay} onClose={() => setSheet(null)} title={sheet ? fmtDate(sheet, { weekday: "long", day: "numeric", month: "long" }) : ""}>
        {sheetDay && (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">{sheetDay.club === "holiday" ? "Holiday Club" : "After School Club"} · booking for <strong className="text-ink-900">{chosen.map(childName).join(", ")}</strong></p>
            {sheetDay.sessions.map((slot) => {
              const s = sessions.get(slot.sessionTypeId);
              if (!s) return null;
              return (
                <div key={s.id} className="rounded-2xl border-2 border-ink-900/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-display font-semibold">{s.label}</div><div className="text-sm text-ink-500">{s.start}–{s.end}{s.description ? ` · ${s.description}` : ""}</div></div>
                    <div className="text-right"><div className="font-bold">{money(s.price)}</div><div className={`text-xs font-bold ${slot.remaining <= 5 ? "text-coral-600" : "text-leaf-600"}`}>{slot.remaining === 0 ? "Full" : slot.remaining <= 5 ? `${slot.remaining} left` : "Available"}</div></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chosen.map((c) => {
                      const it = { childId: c, date: sheetDay.date, sessionTypeId: s.id };
                      const on = basket.has(key(it));
                      return (
                        <button key={c} disabled={!on && slot.remaining <= 0} onClick={() => toggle(it)} className={`chip ${on ? "border-sky-500 bg-sky-500 text-white" : "border-ink-900/10 bg-white text-ink-700"}`} aria-pressed={on}>
                          {on ? <Check className="h-4 w-4" /> : null} {kids.length > 1 ? childName(c) : on ? "Selected" : "Select"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button onClick={() => setSheet(null)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RegularPattern({ sessions, onAdd, disabled, month }: { sessions: SessionType[]; onAdd: (weekdays: number[], sessionTypeId: string) => void; disabled: boolean; month: string }) {
  const [open, setOpen] = useState(false);
  const [dows, setDows] = useState<number[]>([]);
  const [sid, setSid] = useState(sessions.find((s) => s.club === "afterschool")?.id ?? sessions[0]?.id ?? "");
  const [added, setAdded] = useState(false);
  return (
    <div className="card p-4 sm:p-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <span className="flex items-center gap-2 font-display font-semibold"><Repeat className="h-5 w-5 text-sky-500" /> Book a regular pattern in {month}</span>
        <ChevronRight className={`h-5 w-5 text-ink-400 transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink-500">Choose the days you need each week and we'll add every matching date this month (skipping closures and full sessions).</p>
          <div className="flex flex-wrap gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => {
              const on = dows.includes(i);
              return <button key={d} onClick={() => setDows(on ? dows.filter((x) => x !== i) : [...dows, i])} className={`chip ${on ? "border-sky-500 bg-sky-500 text-white" : "border-ink-900/10 bg-white"}`} aria-pressed={on}>{d}</button>;
            })}
          </div>
          <select className="input" value={sid} onChange={(e) => setSid(e.target.value)}>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.club === "holiday" ? "Holiday: " : ""}{s.label} ({s.start}–{s.end}) · {money(s.price)}</option>)}
          </select>
          <button disabled={disabled || dows.length === 0} onClick={() => { onAdd(dows, sid); setAdded(true); setTimeout(() => setAdded(false), 2000); }} className="btn-outline btn-sm">{added ? <><Check className="h-4 w-4" /> Added</> : "Add to selection"}</button>
        </div>
      )}
    </div>
  );
}

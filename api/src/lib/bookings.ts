import { getStore } from "./store";
import { getCalendar, getSessionTypes } from "./content";
import { eachDay, inRange, isWeekend, today } from "./dates";
import type { AvailabilityDay, Booking, ClubKind, SessionType } from "../shared/types";

// Which club (if any) runs on a given date.
export function clubForDate(date: string, cal: { holidayPeriods: { start: string; end: string }[]; closures: { start: string; end: string }[] }): ClubKind | null {
  if (isWeekend(date)) return null;
  if (cal.closures.some((c) => inRange(date, c))) return null;
  if (cal.holidayPeriods.some((h) => inRange(date, h))) return "holiday";
  return "afterschool";
}

export async function countBooked(from: string, to: string): Promise<Map<string, number>> {
  const rows = await getStore().query<Booking>("bookings", {
    where: [
      { field: "date", op: ">=", value: from },
      { field: "date", op: "<=", value: to },
      { field: "status", op: "in", value: ["pending", "confirmed"] },
    ],
  });
  const m = new Map<string, number>();
  for (const b of rows) {
    const k = `${b.date}|${b.sessionTypeId}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function earliestBookableDate(cutoffHours: number): string {
  const d = new Date(Date.now() + cutoffHours * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export async function availability(from: string, to: string): Promise<AvailabilityDay[]> {
  const [cal, sessions] = await Promise.all([getCalendar(), getSessionTypes()]);
  const booked = await countBooked(from, to);
  const minDate = earliestBookableDate(cal.bookingCutoffHours);
  const out: AvailabilityDay[] = [];
  for (const date of eachDay(from, to)) {
    const club = date < minDate ? null : clubForDate(date, cal);
    out.push({
      date,
      club,
      sessions: club
        ? sessions
            .filter((s) => s.club === club)
            .map((s) => ({ sessionTypeId: s.id, remaining: Math.max(0, s.capacity - (booked.get(`${date}|${s.id}`) ?? 0)) }))
        : [],
    });
  }
  return out;
}

export interface ValidationProblem {
  index: number;
  reason: string;
}

// Checks every requested item against the calendar, capacity and duplicates.
export async function validateRequest(
  items: { childId: string; date: string; sessionTypeId: string }[],
  existingForParent: Booking[],
): Promise<{ problems: ValidationProblem[]; sessions: Map<string, SessionType>; cal: Awaited<ReturnType<typeof getCalendar>> }> {
  const [cal, sessionList] = await Promise.all([getCalendar(), getSessionTypes()]);
  const sessions = new Map(sessionList.map((s) => [s.id, s]));
  const dates = items.map((i) => i.date).sort();
  const booked = dates.length ? await countBooked(dates[0], dates[dates.length - 1]) : new Map<string, number>();
  const minDate = earliestBookableDate(cal.bookingCutoffHours);
  const problems: ValidationProblem[] = [];
  const seen = new Set<string>();
  const live = new Set(existingForParent.filter((b) => b.status === "pending" || b.status === "confirmed").map((b) => `${b.childId}|${b.date}|${b.sessionTypeId}`));

  items.forEach((it, index) => {
    const key = `${it.childId}|${it.date}|${it.sessionTypeId}`;
    const s = sessions.get(it.sessionTypeId);
    if (!s) return problems.push({ index, reason: "Unknown session" });
    if (it.date < minDate) return problems.push({ index, reason: `Bookings need ${cal.bookingCutoffHours} hours' notice` });
    if (it.date < today()) return problems.push({ index, reason: "Date is in the past" });
    const club = clubForDate(it.date, cal);
    if (club !== s.club) return problems.push({ index, reason: club ? `${s.label} isn't available on this date` : "We're closed on this date" });
    if (seen.has(key)) return problems.push({ index, reason: "Duplicate in this request" });
    seen.add(key);
    if (live.has(key)) return problems.push({ index, reason: "Already booked" });
    const k = `${it.date}|${it.sessionTypeId}`;
    const used = (booked.get(k) ?? 0) + 1;
    booked.set(k, used);
    if (used > s.capacity) return problems.push({ index, reason: "Session is full" });
  });
  return { problems, sessions, cal };
}

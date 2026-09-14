import { beforeEach, describe, expect, it } from "vitest";
import "./setup";
import { FileStore, setStore, getStore } from "../src/lib/store";
import { clubForDate, availability, validateRequest } from "../src/lib/bookings";
import { DEFAULT_CALENDAR, DEFAULT_SESSIONS } from "../src/lib/content";
import { addDays, today } from "../src/lib/dates";
import type { Booking } from "../src/shared/types";

// Pick a term-time weekday and a holiday weekday well in the future.
function nextWeekday(from: string, pred: (d: string) => boolean): string {
  let d = from;
  for (let i = 0; i < 400; i++) {
    if (pred(d)) return d;
    d = addDays(d, 1);
  }
  throw new Error("no date");
}

const cal = DEFAULT_CALENDAR;
const start = addDays(today(), 3);
const termDay = nextWeekday(start, (d) => clubForDate(d, cal) === "afterschool");
const holidayDay = nextWeekday(start, (d) => clubForDate(d, cal) === "holiday");
const weekend = nextWeekday(start, (d) => new Date(d + "T12:00:00").getDay() === 6);

function booking(partial: Partial<Booking>): Booking {
  return {
    id: Math.random().toString(36).slice(2),
    requestId: "r",
    parentId: "p1",
    childId: "c1",
    date: termDay,
    sessionTypeId: "asc",
    club: "afterschool",
    price: 14,
    status: "confirmed",
    createdAt: "",
    updatedAt: "",
    childName: "A",
    parentName: "P",
    sessionLabel: "ASC",
    ...partial,
  };
}

beforeEach(async () => {
  const store = new FileStore(null);
  setStore(store);
  for (const s of DEFAULT_SESSIONS) await store.upsert("content", { ...s, type: "sessionType" });
  await store.upsert("content", { ...cal, id: "calendar", type: "calendar" });
});

describe("clubForDate", () => {
  it("weekends are closed", () => expect(clubForDate(weekend, cal)).toBeNull());
  it("closures win over holidays", () => expect(clubForDate("2026-12-25", cal)).toBeNull());
  it("holiday periods offer holiday club", () => expect(clubForDate("2026-10-27", cal)).toBe("holiday"));
  it("ordinary weekdays offer after school club", () => expect(clubForDate("2026-10-20", cal)).toBe("afterschool"));
});

describe("availability", () => {
  it("reports remaining capacity per session", async () => {
    await getStore().upsert("bookings", booking({ status: "confirmed" }));
    await getStore().upsert("bookings", booking({ status: "pending", childId: "c2" }));
    await getStore().upsert("bookings", booking({ status: "cancelled", childId: "c3" })); // doesn't count
    const [day] = await availability(termDay, termDay);
    expect(day.club).toBe("afterschool");
    expect(day.sessions).toEqual([{ sessionTypeId: "asc", remaining: 38 }]);
  });
  it("hides dates inside the booking cutoff", async () => {
    const [day] = await availability(today(), today());
    expect(day.club).toBeNull();
  });
});

describe("validateRequest", () => {
  it("accepts a valid mixed request", async () => {
    const { problems } = await validateRequest(
      [
        { childId: "c1", date: termDay, sessionTypeId: "asc" },
        { childId: "c1", date: holidayDay, sessionTypeId: "hc-full" },
      ],
      [],
    );
    expect(problems).toEqual([]);
  });
  it("rejects the wrong club for the date, closed days, duplicates and existing bookings", async () => {
    const { problems } = await validateRequest(
      [
        { childId: "c1", date: termDay, sessionTypeId: "hc-full" },
        { childId: "c1", date: weekend, sessionTypeId: "asc" },
        { childId: "c1", date: termDay, sessionTypeId: "asc" },
        { childId: "c1", date: termDay, sessionTypeId: "asc" },
        { childId: "c1", date: holidayDay, sessionTypeId: "hc-am" },
      ],
      [booking({ date: holidayDay, sessionTypeId: "hc-am", status: "pending" })],
    );
    expect(problems.map((p) => [p.index, p.reason])).toEqual([
      [0, "Full day isn't available on this date"],
      [1, "We're closed on this date"],
      [3, "Duplicate in this request"],
      [4, "Already booked"],
    ]);
  });
  it("enforces capacity across the request and existing bookings", async () => {
    const store = getStore();
    for (let i = 0; i < 39; i++) await store.upsert("bookings", booking({ childId: `x${i}`, parentId: "other" }));
    const { problems } = await validateRequest(
      [
        { childId: "c1", date: termDay, sessionTypeId: "asc" },
        { childId: "c2", date: termDay, sessionTypeId: "asc" },
      ],
      [],
    );
    expect(problems).toEqual([{ index: 1, reason: "Session is full" }]);
  });
  it("rejects unknown sessions", async () => {
    const { problems } = await validateRequest([{ childId: "c1", date: termDay, sessionTypeId: "nope" }], []);
    expect(problems[0].reason).toBe("Unknown session");
  });
});

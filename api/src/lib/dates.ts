// Date helpers that work on YYYY-MM-DD strings (UK dates, no timezone maths).

export function today(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function isWeekend(s: string): boolean {
  const day = parseISODate(s).getDay();
  return day === 0 || day === 6;
}

export function* eachDay(from: string, to: string): Generator<string> {
  let cur = from;
  while (cur <= to) {
    yield cur;
    cur = addDays(cur, 1);
  }
}

export function inRange(date: string, r: { start: string; end: string }): boolean {
  return date >= r.start && date <= r.end;
}

export function formatUK(s: string): string {
  return parseISODate(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

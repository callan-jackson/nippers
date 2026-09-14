import { getStore } from "./store";
import type { Calendar, SessionType, SiteSettings, Testimonial, Policy, User } from "../shared/types";
import { hashPassword } from "./auth";

// Content docs live in one container partitioned by `type`.
export type ContentType = "settings" | "sessionType" | "calendar" | "testimonial" | "gallery" | "policy" | "announcement";

export const DEFAULT_SESSIONS: SessionType[] = [
  { id: "asc", club: "afterschool", label: "After School Club", start: "15:00", end: "18:00", price: 14, capacity: 40, active: true, sort: 0, description: "Collection from school, healthy snack and a hot tea included" },
  { id: "hc-early", club: "holiday", label: "Early drop-off", start: "07:30", end: "08:00", price: 3, capacity: 40, active: true, sort: 1, description: "Add-on to any morning session" },
  { id: "hc-am", club: "holiday", label: "Morning", start: "08:00", end: "13:00", price: 18, capacity: 40, active: true, sort: 2 },
  { id: "hc-pm", club: "holiday", label: "Afternoon", start: "13:00", end: "18:00", price: 18, capacity: 40, active: true, sort: 3 },
  { id: "hc-core", club: "holiday", label: "Core day", start: "09:00", end: "16:00", price: 26, capacity: 40, active: true, sort: 4 },
  { id: "hc-full", club: "holiday", label: "Full day", start: "08:00", end: "18:00", price: 32, capacity: 40, active: true, sort: 5, description: "Best value — breakfast, lunch and tea included" },
];

// Placeholder East Sussex 2026/27 dates — the committee edits these in Admin → Calendar.
export const DEFAULT_CALENDAR: Calendar = {
  holidayPeriods: [
    { id: "oct-2026", label: "October half term 2026", start: "2026-10-26", end: "2026-10-30" },
    { id: "xmas-2026", label: "Christmas holidays 2026", start: "2026-12-21", end: "2027-01-01" },
    { id: "feb-2027", label: "February half term 2027", start: "2027-02-15", end: "2027-02-19" },
    { id: "easter-2027", label: "Easter holidays 2027", start: "2027-03-29", end: "2027-04-09" },
    { id: "may-2027", label: "May half term 2027", start: "2027-05-31", end: "2027-06-04" },
    { id: "summer-2027", label: "Summer holidays 2027", start: "2027-07-26", end: "2027-09-01" },
  ],
  closures: [
    { id: "xmas-close-2026", label: "Christmas closure", start: "2026-12-24", end: "2027-01-01" },
    { id: "bh-easter-2027", label: "Good Friday & Easter Monday", start: "2027-03-26", end: "2027-03-29" },
    { id: "bh-may-2027", label: "Early May bank holiday", start: "2027-05-03", end: "2027-05-03" },
    { id: "bh-spring-2027", label: "Spring bank holiday", start: "2027-05-31", end: "2027-05-31" },
    { id: "bh-aug-2027", label: "Summer bank holiday", start: "2027-08-30", end: "2027-08-30" },
  ],
  bookingCutoffHours: 24,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "07564 452837",
  email: "nippers1973@outlook.com",
  address: "East Side Social Centre, Norton Terrace, Newhaven, East Sussex, BN9 0BT",
  facebook: "https://facebook.com/NIPPERS1973/",
  charityNumber: "1087572",
  ofstedUrn: "",
  bankDetails: "",
  paymentInstructions:
    "Once your booking is confirmed we will send an invoice. We accept bank transfer, Tax-Free Childcare and all major childcare voucher schemes. Please use your child's name as the payment reference.",
  bookingsOpen: true,
};

const DEFAULT_TESTIMONIALS: Omit<Testimonial, "id">[] = [
  { quote: "My daughter counts down the days until holiday club. The staff know every child by name and the Forest School afternoons are her absolute favourite.", attribution: "Parent of a Year 2 child", sort: 0, published: true },
  { quote: "As a working parent the after school pick-up service has been a lifesaver. I never worry — the team are calm, kind and brilliantly organised.", attribution: "Parent, Peacehaven", sort: 1, published: true },
  { quote: "It's rare to find somewhere that genuinely lets children just play. No screens, lots of mud, and my son comes home happy and tired every time.", attribution: "Parent of two, Newhaven", sort: 2, published: true },
];

const DEFAULT_POLICIES: Omit<Policy, "id" | "updatedAt">[] = [
  {
    title: "Safeguarding & Child Protection",
    summary: "How we keep every child safe, and what we do if we have a concern.",
    body: "N.I.P.P.E.R.S. is committed to safeguarding and promoting the welfare of every child and young person in our care.\n\nAll staff and volunteers hold an enhanced DBS check and complete safeguarding training, which is refreshed regularly. Our Designated Safeguarding Lead is responsible for all safeguarding matters and works with East Sussex Children's Services where necessary.\n\nWe follow the East Sussex Safeguarding Children Partnership procedures and Working Together to Safeguard Children. Any concern about a child's welfare is recorded and acted on the same day.\n\nA full copy of this policy is available on request from the office.",
    sort: 0,
    published: true,
  },
  {
    title: "Booking, Payment & Cancellation",
    summary: "How bookings work, when to pay, and what happens if plans change.",
    body: "Bookings are made through your online account and are confirmed by our staff, usually within two working days. A booking is not guaranteed until it shows as Confirmed.\n\nInvoices are issued on confirmation and are payable within 14 days. We accept bank transfer, Tax-Free Childcare and childcare vouchers.\n\nCancellations made more than 7 days before a session are free of charge. Sessions cancelled with less notice are charged in full unless we are able to fill the place. If your child is unwell please let us know as early as possible.\n\nLate collection after 6pm is charged at £5 per 15 minutes to cover staff costs.",
    sort: 1,
    published: true,
  },
  {
    title: "Health, Medication & Allergies",
    summary: "Medical information, administering medicine, and our approach to allergies.",
    body: "Please keep your child's medical information, allergies and dietary needs up to date in your online account — our daily registers are printed from this.\n\nWe can administer prescribed medication with your written consent. Medication must be in its original packaging with the pharmacy label. All staff hold paediatric first aid certificates.\n\nWe are a nut-aware setting. All food is prepared by staff holding Level 2 Food Hygiene and we cater for allergies, intolerances and religious dietary requirements.",
    sort: 2,
    published: true,
  },
  {
    title: "Inclusion & Equal Opportunities",
    summary: "Play for every child, whatever their needs or background.",
    body: "Inclusion is in our name. N.I.P.P.E.R.S. welcomes children of all abilities, backgrounds and beliefs and we adapt our activities so that every child can take part.\n\nAll staff complete Special Educational Needs training. If your child has additional needs please tell us when you register so we can plan the right support together.",
    sort: 3,
    published: true,
  },
  {
    title: "Behaviour & Positive Play",
    summary: "How we encourage kindness, respect and confidence.",
    body: "We believe children behave well when they feel safe, respected and engaged. Our playworkers model kindness and set clear, consistent boundaries.\n\nWe never use physical punishment or humiliation. Persistent concerns are discussed with parents so that we can work on solutions together.",
    sort: 4,
    published: true,
  },
  {
    title: "Privacy & Data Protection (GDPR)",
    summary: "What information we hold, why, and how we protect it.",
    body: "We collect only the information we need to care for your child safely: contact details, medical information, emergency contacts and booking history. This is stored securely and is never shared with third parties for marketing.\n\nPhotographs are only taken and used with your explicit consent, recorded on your child's profile. You can withdraw consent at any time.\n\nYou may request a copy of the data we hold, or ask us to delete your account, by emailing the office.",
    sort: 5,
    published: true,
  },
];

export async function getSettings(): Promise<SiteSettings> {
  const s = await getStore().get<SiteSettings & { id: string; type: string }>("content", "settings", "settings");
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function getCalendar(): Promise<Calendar> {
  const c = await getStore().get<Calendar & { id: string; type: string }>("content", "calendar", "calendar");
  return c ? { ...DEFAULT_CALENDAR, ...c } : DEFAULT_CALENDAR;
}

export async function getSessionTypes(includeInactive = false): Promise<SessionType[]> {
  const list = await getStore().query<SessionType & { type: string }>("content", {
    where: [{ field: "type", op: "=", value: "sessionType" }],
  });
  const out = (list.length ? list : DEFAULT_SESSIONS).filter((s) => includeInactive || s.active);
  return out.sort((a, b) => a.sort - b.sort);
}

let seeded = false;
// Runs once per process: makes sure the admin account and default content exist.
export async function ensureSeed(log: (m: string) => void = () => {}): Promise<void> {
  if (seeded) return;
  seeded = true;
  const store = getStore();

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (adminEmail && process.env.ADMIN_PASSWORD) {
    const existing = await store.query<User>("users", { where: [{ field: "email", op: "=", value: adminEmail }] });
    if (!existing.length) {
      const admin = {
        id: "seed-admin", // fixed id so concurrent cold starts can't create duplicates
        email: adminEmail,
        passwordHash: await hashPassword(process.env.ADMIN_PASSWORD),
        firstName: "N.I.P.P.E.R.S.",
        lastName: "Admin",
        phone: DEFAULT_SETTINGS.phone,
        addressLine1: "East Side Social Centre",
        town: "Newhaven",
        postcode: "BN9 0BT",
        role: "admin" as const,
        disabled: false,
        createdAt: new Date().toISOString(),
        failedLogins: 0,
      };
      await store.upsert("users", admin);
      log(`Seeded admin account ${adminEmail}`);
    }
  }

  const sessions = await store.query("content", { where: [{ field: "type", op: "=", value: "sessionType" }] });
  if (!sessions.length) for (const s of DEFAULT_SESSIONS) await store.upsert("content", { ...s, type: "sessionType" });

  if (!(await store.get("content", "calendar", "calendar"))) await store.upsert("content", { ...DEFAULT_CALENDAR, id: "calendar", type: "calendar" });
  if (!(await store.get("content", "settings", "settings"))) await store.upsert("content", { ...DEFAULT_SETTINGS, id: "settings", type: "settings" });

  const t = await store.query("content", { where: [{ field: "type", op: "=", value: "testimonial" }] });
  if (!t.length) for (const [i, x] of DEFAULT_TESTIMONIALS.entries()) await store.upsert("content", { ...x, id: `seed-testimonial-${i}`, type: "testimonial" });

  const p = await store.query("content", { where: [{ field: "type", op: "=", value: "policy" }] });
  if (!p.length) for (const [i, x] of DEFAULT_POLICIES.entries()) await store.upsert("content", { ...x, id: `seed-policy-${i}`, type: "policy", updatedAt: new Date().toISOString() });
}

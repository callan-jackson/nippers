// Types shared between the API and the web app. The web imports this folder
// via the "@shared" alias, so keep it free of Node-only code.

export type Role = "parent" | "admin";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  town: string;
  postcode: string;
  role: Role;
  disabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Child {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  school: string;
  yearGroup?: string;
  allergies?: string;
  dietary?: string;
  medical?: string;
  additionalNeeds?: string;
  doctorName?: string;
  doctorPhone?: string;
  emergencyContacts: EmergencyContact[];
  photoConsent: boolean;
  createdAt: string;
  archived?: boolean;
}

export type ClubKind = "afterschool" | "holiday";

export interface SessionType {
  id: string;
  club: ClubKind;
  label: string;
  start: string; // HH:MM
  end: string; // HH:MM
  price: number; // GBP
  capacity: number;
  active: boolean;
  sort: number;
  description?: string;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Booking {
  id: string;
  requestId: string;
  parentId: string;
  childId: string;
  date: string; // YYYY-MM-DD
  sessionTypeId: string;
  club: ClubKind;
  price: number;
  status: BookingStatus;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Denormalised for fast admin lists
  childName: string;
  parentName: string;
  sessionLabel: string;
}

export interface DateRange {
  id: string;
  label: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD inclusive
}

export interface Calendar {
  holidayPeriods: DateRange[]; // Holiday Club runs on these dates (weekdays)
  closures: DateRange[]; // Fully closed (e.g. Christmas week)
  bookingCutoffHours: number; // How far ahead a booking must be placed
}

export interface Testimonial {
  id: string;
  quote: string;
  attribution: string; // e.g. "Parent of a Year 3 child" — GDPR safe, no full names
  sort: number;
  published: boolean;
}

export interface GalleryImage {
  id: string;
  caption: string;
  alt: string;
  contentType: string;
  data?: string; // base64 (omitted from list responses)
  sort: number;
  published: boolean;
  createdAt: string;
}

export interface Policy {
  id: string;
  title: string;
  summary: string;
  body: string; // Markdown-ish plain text with paragraphs
  sort: number;
  published: boolean;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string;
  level: "info" | "warning";
}

export interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  facebook: string;
  charityNumber: string;
  ofstedUrn?: string;
  bankDetails?: string; // shown to parents on confirmed bookings for bank transfer
  paymentInstructions: string;
  bookingsOpen: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AvailabilityDay {
  date: string;
  club: ClubKind | null; // null = closed
  sessions: { sessionTypeId: string; remaining: number }[];
}

export interface AdminStats {
  pendingBookings: number;
  confirmedThisWeek: number;
  childrenRegistered: number;
  parentsRegistered: number;
  unreadMessages: number;
  upcoming: Booking[];
}

export type PublicUser = Omit<User, never>;

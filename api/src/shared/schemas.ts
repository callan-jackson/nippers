import { z } from "zod";

const ukPhone = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .max(20)
  .regex(/^[0-9+()\s-]+$/, "Enter a valid phone number");

const ukPostcode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/, "Enter a valid UK postcode");

export const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password,
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  phone: ukPhone,
  addressLine1: z.string().trim().min(1, "Required").max(120),
  addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
  town: z.string().trim().min(1, "Required").max(80),
  postcode: ukPostcode,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Enter your password"),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const resetSchema = z.object({ token: z.string().min(10), password });
export const changePasswordSchema = z.object({ current: z.string().min(1), password });

export const profileSchema = registerSchema.omit({ email: true, password: true });

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(1, "Required").max(80),
  relationship: z.string().trim().min(1, "Required").max(40),
  phone: ukPhone,
});

export const childSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date")
    .refine((d) => {
      const age = (Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 2 && age <= 18;
    }, "We care for children aged 3–17"),
  school: z.string().trim().min(1, "Required").max(100),
  yearGroup: z.string().trim().max(20).optional().or(z.literal("")),
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
  dietary: z.string().trim().max(500).optional().or(z.literal("")),
  medical: z.string().trim().max(1000).optional().or(z.literal("")),
  additionalNeeds: z.string().trim().max(1000).optional().or(z.literal("")),
  doctorName: z.string().trim().max(100).optional().or(z.literal("")),
  doctorPhone: z.string().trim().max(20).optional().or(z.literal("")),
  emergencyContacts: z.array(emergencyContactSchema).min(1, "Add at least one emergency contact").max(4),
  photoConsent: z.boolean(),
});
export type ChildInput = z.infer<typeof childSchema>;

export const bookingRequestSchema = z.object({
  items: z
    .array(
      z.object({
        childId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        sessionTypeId: z.string().min(1),
      }),
    )
    .min(1, "Select at least one session")
    .max(120, "That's a lot of sessions — please split into smaller requests"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Required").max(120),
  message: z.string().trim().min(10, "Tell us a little more").max(3000),
  website: z.string().max(0).optional(), // honeypot
});
export type ContactInput = z.infer<typeof contactSchema>;

// ---- Admin ----
export const sessionTypeSchema = z.object({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
  club: z.enum(["afterschool", "holiday"]),
  label: z.string().trim().min(1).max(60),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.number().min(0).max(500),
  capacity: z.number().int().min(1).max(500),
  active: z.boolean(),
  sort: z.number().int(),
  description: z.string().trim().max(200).optional().or(z.literal("")),
});

export const dateRangeSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(80),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const calendarSchema = z.object({
  holidayPeriods: z.array(dateRangeSchema),
  closures: z.array(dateRangeSchema),
  bookingCutoffHours: z.number().int().min(0).max(24 * 14),
});

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "declined", "cancelled"]),
  adminNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const bulkBookingUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  status: z.enum(["confirmed", "declined", "cancelled"]),
});

export const testimonialSchema = z.object({
  quote: z.string().trim().min(5).max(600),
  attribution: z.string().trim().min(1).max(80),
  sort: z.number().int().default(0),
  published: z.boolean().default(true),
});

export const galleryUploadSchema = z.object({
  caption: z.string().trim().max(140).default(""),
  alt: z.string().trim().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().min(100).max(1_400_000), // ~1MB base64 — the web app resizes before upload
  published: z.boolean().default(true),
});

export const galleryUpdateSchema = z.object({
  caption: z.string().trim().max(140),
  alt: z.string().trim().min(1).max(200),
  sort: z.number().int(),
  published: z.boolean(),
});

export const policySchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(300).default(""),
  body: z.string().trim().min(1).max(20000),
  sort: z.number().int().default(0),
  published: z.boolean().default(true),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(600),
  startsAt: z.string(),
  endsAt: z.string(),
  level: z.enum(["info", "warning"]).default("info"),
});

export const settingsSchema = z.object({
  phone: z.string().trim().max(20),
  email: z.string().trim().email(),
  address: z.string().trim().max(300),
  facebook: z.string().trim().max(200),
  charityNumber: z.string().trim().max(20),
  ofstedUrn: z.string().trim().max(20).optional().or(z.literal("")),
  bankDetails: z.string().trim().max(500).optional().or(z.literal("")),
  paymentInstructions: z.string().trim().max(1500),
  bookingsOpen: z.boolean(),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(["parent", "admin"]).optional(),
  disabled: z.boolean().optional(),
});

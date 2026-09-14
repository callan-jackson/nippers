import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { SessionType, SiteSettings, Testimonial, GalleryImage, Policy, Announcement, DateRange } from "@shared/types";

export interface SiteData {
  settings: Omit<SiteSettings, "bankDetails">;
  sessions: SessionType[];
  calendar: { holidayPeriods: DateRange[]; closures: DateRange[]; bookingCutoffHours: number };
  testimonials: Testimonial[];
  gallery: Omit<GalleryImage, "data">[];
  policies: Policy[];
  announcements: Announcement[];
}

export function useSite() {
  return useQuery({ queryKey: ["site"], queryFn: () => api.get<SiteData>("/public/site"), staleTime: 10 * 60 * 1000 });
}

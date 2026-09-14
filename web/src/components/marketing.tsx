import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Quote } from "lucide-react";
import type { Testimonial } from "@shared/types";

export function Section({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`container-x py-12 sm:py-16 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeading({ eyebrow, title, lead, center = false }: { eyebrow?: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={`mb-8 max-w-2xl sm:mb-10 ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="h2 mt-1">{title}</h2>
      {lead && <p className="lead mt-3">{lead}</p>}
    </div>
  );
}

const tones = {
  sky: "bg-sky-100 text-sky-600",
  sun: "bg-sun-100 text-sun-600",
  leaf: "bg-leaf-100 text-leaf-600",
  coral: "bg-coral-100 text-coral-500",
};
export type Tone = keyof typeof tones;

export function Feature({ icon, title, children, tone = "sky" }: { icon: ReactNode; title: string; children?: ReactNode; tone?: Tone }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      <h3 className="h3">{title}</h3>
      {children && <p className="mt-2 text-ink-500">{children}</p>}
    </div>
  );
}

export function Stat({ value, label, tone = "sky" }: { value: string; label: string; tone?: Tone }) {
  return (
    <div className="rounded-3xl bg-white/70 p-5 text-center backdrop-blur">
      <div className={`whitespace-nowrap font-display text-3xl font-bold sm:text-4xl ${{ sky: "text-sky-600", sun: "text-sun-600", leaf: "text-leaf-600", coral: "text-coral-500" }[tone]}`}>{value}</div>
      <div className="mt-1 text-sm font-bold text-ink-500">{label}</div>
    </div>
  );
}

export function CTA({ title, body, to = "/register", label = "Create an account", tone = "sky" }: { title: string; body: string; to?: string; label?: string; tone?: "sky" | "leaf" | "coral" }) {
  const bg = { sky: "bg-sky-500", leaf: "bg-leaf-500", coral: "bg-coral-500" }[tone];
  return (
    <section className="container-x py-8">
      <div className={`${bg} relative overflow-hidden rounded-4xl px-6 py-10 text-white sm:px-10 sm:py-14`}>
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-16 right-1/4 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h2>
            <p className="mt-2 text-white/85 sm:text-lg">{body}</p>
          </div>
          <Link to={to} className="btn-sun shrink-0">
            {label} <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {items.map((t, i) => (
        <figure key={t.id} className={`card relative p-6 ${i === 1 ? "md:-translate-y-3" : ""}`}>
          <Quote className="absolute right-5 top-5 h-8 w-8 text-sun-300" aria-hidden="true" />
          <blockquote className="pr-8 leading-relaxed text-ink-700">"{t.quote}"</blockquote>
          <figcaption className="mt-4 text-sm font-bold text-sky-600">— {t.attribution}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function MapCard() {
  // OpenStreetMap embed — free, no API key. Centred on East Side Social Centre, Norton Terrace.
  const lat = 50.7938;
  const lon = 0.0602;
  const bbox = `${lon - 0.01},${lat - 0.006},${lon + 0.01},${lat + 0.006}`;
  return (
    <div className="card overflow-hidden">
      <iframe
        title="Map showing East Side Social Centre, Norton Terrace, Newhaven"
        className="block h-64 w-full sm:h-80"
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <span className="font-bold text-ink-700">East Side Social Centre, Norton Terrace, Newhaven BN9 0BT</span>
        <a className="text-sky-600 font-bold hover:underline" href="https://www.google.com/maps/dir/?api=1&destination=East+Side+Social+Centre,+Norton+Terrace,+Newhaven+BN9+0BT" target="_blank" rel="noreferrer">
          Get directions →
        </a>
      </div>
    </div>
  );
}

export function Doodles() {
  // Decorative shapes for the hero — pure CSS/SVG so no images are needed.
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-sun-300/60 blur-2xl" />
      <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/3 rounded-full bg-sky-200/70 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-64 w-64 rounded-full bg-leaf-200/60 blur-3xl" />
      <svg className="absolute right-6 top-24 hidden h-24 w-24 animate-float text-coral-400 lg:block" viewBox="0 0 100 100" fill="none">
        <path d="M50 8 L82 50 L50 92 L18 50 Z" fill="currentColor" opacity=".9" />
        <path d="M50 8 L50 92 M18 50 L82 50" stroke="#fff" strokeWidth="3" />
        <path d="M50 92 C 40 110, 60 115, 48 130" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className="absolute left-8 bottom-16 hidden h-20 w-20 animate-float text-sun-500 [animation-delay:1.5s] lg:block" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="22" fill="currentColor" />
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1="50" y1="8" x2="50" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 45} 50 50)`} />
        ))}
      </svg>
    </div>
  );
}

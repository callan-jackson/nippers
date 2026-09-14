import { forwardRef, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sky-500">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Alert({ kind = "error", children, onClose }: { kind?: "error" | "success" | "info"; children: ReactNode; onClose?: () => void }) {
  const styles = {
    error: "bg-coral-100 text-coral-600 border-coral-200",
    success: "bg-leaf-100 text-leaf-700 border-leaf-200",
    info: "bg-sky-50 text-sky-700 border-sky-100",
  }[kind];
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${styles}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="rounded-full p-1 hover:bg-black/5" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}
export function Field({ label, error, hint, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(({ error, className = "", ...props }, ref) => (
  <input ref={ref} className={`input ${error ? "input-error" : ""} ${className}`} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(({ error, className = "", ...props }, ref) => (
  <textarea ref={ref} className={`input min-h-[120px] ${error ? "input-error" : ""} ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(({ error, className = "", children, ...props }, ref) => (
  <select ref={ref} className={`input appearance-none ${error ? "input-error" : ""} ${className}`} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
      <input type="checkbox" className="mt-0.5 h-5 w-5 rounded-md border-2 border-ink-900/20 text-sky-500 focus:ring-sky-200" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-soft animate-pop sm:rounded-3xl sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="h3">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-ink-900/5" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-sun-100 text-sun-600",
    confirmed: "bg-leaf-100 text-leaf-700",
    declined: "bg-coral-100 text-coral-600",
    cancelled: "bg-ink-900/5 text-ink-500",
  };
  return <span className={`badge capitalize ${map[status] ?? "bg-ink-900/5"}`}>{status}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-500">{icon}</div>
      <h3 className="h3">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, lead, tone = "sky" }: { eyebrow?: string; title: string; lead?: string; tone?: "sky" | "leaf" | "sun" | "coral" }) {
  const bg = { sky: "bg-sky-500", leaf: "bg-leaf-500", sun: "bg-sun-400", coral: "bg-coral-500" }[tone];
  const text = tone === "sun" ? "text-ink-900" : "text-white";
  const sub = tone === "sun" ? "text-ink-700" : "text-white/85";
  return (
    <section className={`${bg} relative overflow-hidden`}>
      <Blobs />
      <div className="container-x relative py-14 sm:py-20">
        {eyebrow && <span className={`eyebrow ${tone === "sun" ? "text-ink-700" : "text-white/80"}`}>{eyebrow}</span>}
        <h1 className={`h1 mt-2 ${text}`}>{title}</h1>
        {lead && <p className={`mt-4 max-w-2xl text-lg sm:text-xl ${sub}`}>{lead}</p>}
      </div>
      <Wave />
    </section>
  );
}

export function Blobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -right-10 top-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
    </div>
  );
}

export function Wave({ fill = "#FFFBF4", flip = false }: { fill?: string; flip?: boolean }) {
  return (
    <svg className={`wave ${flip ? "rotate-180" : ""}`} viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,40 C240,90 480,0 720,40 C960,80 1200,10 1440,40 L1440,80 L0,80 Z" fill={fill} />
    </svg>
  );
}

export function ButtonLink({ to, className = "btn-primary", children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

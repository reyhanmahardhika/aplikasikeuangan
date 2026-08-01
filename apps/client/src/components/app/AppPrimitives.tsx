import { CalendarDays, Loader2 } from "lucide-react";
import type { InputHTMLAttributes, JSX } from "react";

export function DateInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <span className="relative block w-full">
      <input {...props} type="date" className={`input date-input pr-11 ${className}`.trim()} />
      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
    </span>
  );
}

export function Field({ label, hint, children }: {
  label: string;
  hint?: JSX.Element;
  children: JSX.Element;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      <span className="flex min-h-5 items-center justify-between gap-2">
        <span>{label}</span>
        {hint}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function LoadingState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center text-slate-500">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DFE5DE] bg-white shadow-soft"><Loader2 className="animate-spin text-[#16845B]" size={18} /></span>
      <p className="mt-3 text-xs font-bold">Memuat data...</p>
    </div>
  );
}

export function DataErrorState({ message, onRetry }: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="surface-card border-rose-100 bg-rose-50/80 p-5 text-center text-sm text-rose-700">
      <p className="font-extrabold">Data belum bisa dimuat.</p>
      <p className="mt-1 text-xs leading-5 text-rose-600">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary mt-3" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ text }: {
  text: string;
}) {
  return <div className="rounded-2xl border border-dashed border-[#C9D2CB] bg-[#F7F9F6] p-6 text-center text-xs font-semibold leading-5 text-slate-500">{text}</div>;
}

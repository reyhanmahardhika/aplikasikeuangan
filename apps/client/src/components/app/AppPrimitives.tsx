import { Loader2 } from "lucide-react";
import type { JSX } from "react";

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
    <div className="flex min-h-56 items-center justify-center text-slate-500">
      <Loader2 className="mr-2 animate-spin" size={18} /> Memuat data...
    </div>
  );
}

export function DataErrorState({ message, onRetry }: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[22px] border border-rose-100 bg-rose-50/80 p-4 text-center text-sm text-rose-700">
      <p className="font-semibold">Data belum bisa dimuat.</p>
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
  return <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</div>;
}

export const APP_TIME_ZONE = "Asia/Jakarta";

export function jakartaDateParts(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      year: 0,
      month: 0,
      day: 0,
      value: ""
    };
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    value: `${part("year")}-${part("month")}-${part("day")}`
  };
}

export function rupiah(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

export function localDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const locale = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en-US" : "id-ID";
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function isoDateInput(value = new Date()) {
  return jakartaDateParts(value).value;
}

export function formatRupiahInput(value: string | number | null | undefined) {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  return new Intl.NumberFormat("id-ID").format(Number(raw));
}

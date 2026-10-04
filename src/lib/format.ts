import { CLINIC_TZ } from "@/lib/dates";

export const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const timeFmt = new Intl.DateTimeFormat("es-AR", { timeZone: CLINIC_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateFmt = new Intl.DateTimeFormat("es-AR", { timeZone: CLINIC_TZ, weekday: "short", day: "2-digit", month: "2-digit" });
const longDateFmt = new Intl.DateTimeFormat("es-AR", { timeZone: CLINIC_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-AR", { timeZone: CLINIC_TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const arsFmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 0 });

export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDate = (d: Date) => dateFmt.format(d);
export const formatLongDate = (d: Date) => longDateFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);
export const formatARS = (n: number | { toString(): string }) => arsFmt.format(Number(n));
export const formatPct = (n: number) => pctFmt.format(Number.isFinite(n) ? n : 0);

export function patientName(p: { firstName: string | null; lastName: string | null; phoneNumber: string }) {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return name || p.phoneNumber;
}

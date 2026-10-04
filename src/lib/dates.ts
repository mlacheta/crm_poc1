// Utilidades de fecha en hora de Argentina (UTC-3 fijo, sin horario de verano).
// Sin dependencias de Next para poder usarlas también desde prisma/seed.ts.

export const CLINIC_TZ = "America/Argentina/Buenos_Aires";
const AR_OFFSET = "-03:00";

/** "YYYY-MM-DD" del día actual (o de `date`) en Argentina. */
export function arToday(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CLINIC_TZ }).format(date);
}

/** Instante correspondiente a `ymd` a la hora local "HH:MM" de Argentina. */
export function arDateTime(ymd: string, time = "00:00"): Date {
  return new Date(`${ymd}T${time}:00${AR_OFFSET}`);
}

/** Suma `days` días a un "YYYY-MM-DD". */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Día de la semana (0 = Domingo) de un "YYYY-MM-DD". */
export function dayOfWeek(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

/** Rango [inicio, fin) del día `ymd` en Argentina. */
export function arDayRange(ymd: string): { start: Date; end: Date } {
  return { start: arDateTime(ymd), end: arDateTime(addDays(ymd, 1)) };
}

export function isValidYmd(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

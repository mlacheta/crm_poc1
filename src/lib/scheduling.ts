// Motor de agenda: calcula turnos libres a partir de los horarios de cada médico
// y reserva turnos de forma transaccional (sin doble-booking).
// Sin "server-only" para poder usarlo desde scripts (tsx) y desde el agente.
import { Prisma } from "@/generated/prisma/client";
import { addDays, addMinutes, arDateTime, arToday, dayOfWeek } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

/** Anticipación mínima para ofrecer un turno. */
export const MIN_LEAD_MINUTES = 60;
/** Duración de la reserva tentativa mientras el paciente paga (PRD §4.1). */
export const HOLD_MINUTES = 15;
/** Máximo de días que se consultan de una vez. */
export const MAX_RANGE_DAYS = 14;

type Db = Prisma.TransactionClient | typeof prisma;

export type Slot = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  fee: number;
  start: Date;
  end: Date;
};

/** Turnos que ocupan agenda: confirmados/atendidos y reservas tentativas vigentes. */
function blockingWhere(now: Date): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } },
      { status: "TENTATIVE_LOCKED", lockedUntil: { gt: now } },
    ],
  };
}

async function loadSlots(
  db: Db,
  { clinicId, doctorId, fromYmd, toYmd, now }: { clinicId: string; doctorId?: string; fromYmd: string; toYmd: string; now: Date },
): Promise<Slot[]> {
  const rangeStart = arDateTime(fromYmd);
  const rangeEnd = arDateTime(addDays(toYmd, 1));

  const doctors = await db.doctorProfile.findMany({
    where: { clinicId, ...(doctorId && { id: doctorId }) },
    include: {
      user: { select: { fullName: true, isActive: true } },
      availabilities: { where: { isActive: true } },
      appointments: {
        where: { startDateTime: { lt: rangeEnd }, endDateTime: { gt: rangeStart }, ...blockingWhere(now) },
        select: { startDateTime: true, endDateTime: true },
      },
    },
  });

  const earliest = addMinutes(now, MIN_LEAD_MINUTES);
  const slots: Slot[] = [];
  for (const doctor of doctors) {
    if (!doctor.user.isActive) continue;
    for (let ymd = fromYmd; ymd <= toYmd; ymd = addDays(ymd, 1)) {
      for (const range of doctor.availabilities.filter((a) => a.dayOfWeek === dayOfWeek(ymd))) {
        const rangeEndAt = arDateTime(ymd, range.endTime);
        for (
          let start = arDateTime(ymd, range.startTime);
          addMinutes(start, doctor.appointmentDuration) <= rangeEndAt;
          start = addMinutes(start, doctor.appointmentDuration)
        ) {
          const end = addMinutes(start, doctor.appointmentDuration);
          if (start < earliest) continue;
          if (doctor.appointments.some((a) => a.startDateTime < end && a.endDateTime > start)) continue;
          slots.push({
            doctorId: doctor.id,
            doctorName: doctor.user.fullName,
            specialty: doctor.specialty,
            fee: Number(doctor.consultationFee),
            start,
            end,
          });
        }
      }
    }
  }
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime() || a.doctorName.localeCompare(b.doctorName));
}

/** Turnos libres entre `fromYmd` y `toYmd` (inclusive, hora AR). El rango se acota a MAX_RANGE_DAYS desde hoy. */
export async function findAvailableSlots(params: {
  clinicId: string;
  doctorId?: string;
  fromYmd?: string;
  toYmd?: string;
  now?: Date;
}): Promise<Slot[]> {
  const now = params.now ?? new Date();
  const today = arToday(now);
  const fromYmd = params.fromYmd && params.fromYmd > today ? params.fromYmd : today;
  const maxYmd = addDays(fromYmd, MAX_RANGE_DAYS - 1);
  const toYmd = params.toYmd && params.toYmd >= fromYmd && params.toYmd <= maxYmd ? params.toYmd : addDays(fromYmd, 6);
  return loadSlots(prisma, { clinicId: params.clinicId, doctorId: params.doctorId, fromYmd, toYmd, now });
}

export type HoldResult =
  | { ok: true; appointmentId: string; slot: Slot; lockedUntil: Date }
  | { ok: false; error: "SLOT_NOT_AVAILABLE" | "DOCTOR_NOT_FOUND" };

/**
 * Reserva tentativamente un turno por HOLD_MINUTES. Corre en una transacción serializable:
 * si dos pacientes piden el mismo turno a la vez, sólo uno lo obtiene. Libera las reservas
 * tentativas previas del mismo paciente (si cambia de horario no retiene dos turnos).
 */
export async function holdSlot(params: {
  clinicId: string;
  patientId: string;
  doctorId: string;
  start: Date;
  reason?: string | null;
  now?: Date;
}): Promise<HoldResult> {
  const now = params.now ?? new Date();
  const ymd = arToday(params.start);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const doctor = await tx.doctorProfile.findFirst({ where: { id: params.doctorId, clinicId: params.clinicId } });
          if (!doctor) return { ok: false, error: "DOCTOR_NOT_FOUND" } as const;

          const slots = await loadSlots(tx, { clinicId: params.clinicId, doctorId: doctor.id, fromYmd: ymd, toYmd: ymd, now });
          const slot = slots.find((s) => s.start.getTime() === params.start.getTime());
          if (!slot) return { ok: false, error: "SLOT_NOT_AVAILABLE" } as const;

          await tx.appointment.updateMany({
            where: { patientId: params.patientId, status: "TENTATIVE_LOCKED" },
            data: { status: "CANCELLED", lockedUntil: null },
          });
          const lockedUntil = addMinutes(now, HOLD_MINUTES);
          const appointment = await tx.appointment.create({
            data: {
              clinicId: params.clinicId,
              patientId: params.patientId,
              doctorId: doctor.id,
              startDateTime: slot.start,
              endDateTime: slot.end,
              status: "TENTATIVE_LOCKED",
              lockedUntil,
              reason: params.reason ?? null,
            },
          });
          return { ok: true, appointmentId: appointment.id, slot, lockedUntil } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      // P2034: conflicto de serialización (otra reserva concurrente). Se reintenta una vez.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt === 0) continue;
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
        return { ok: false, error: "SLOT_NOT_AVAILABLE" };
      }
      throw e;
    }
  }
  return { ok: false, error: "SLOT_NOT_AVAILABLE" };
}

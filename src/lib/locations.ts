import type { AvailabilitySchedule } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Sedes activas de una clínica, en orden alfabético. */
export function activeLocations(clinicId: string) {
  return prisma.location.findMany({
    where: { clinicId, isActive: true },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });
}

/** Agrupa los horarios de un médico por sede: consultorio y una franja por día (formulario de médicos). */
export function scheduleBySite(availabilities: AvailabilitySchedule[]) {
  const bySite: Record<string, { consultorio: string; days: Record<number, { startTime: string; endTime: string }> }> = {};
  for (const a of availabilities.filter((x) => x.isActive)) {
    const site = (bySite[a.locationId] ??= { consultorio: a.consultorioNumber ?? "", days: {} });
    site.days[a.dayOfWeek] = { startTime: a.startTime, endTime: a.endTime };
  }
  return bySite;
}

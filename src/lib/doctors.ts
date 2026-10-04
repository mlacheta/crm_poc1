import "server-only";
import type { CurrentUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

/**
 * Resuelve qué médico se está viendo: un MEDICO sólo ve su propio perfil;
 * un ADMIN puede elegir cualquiera de su clínica (por defecto, el primero).
 */
export async function resolveViewedDoctor(user: CurrentUser, requestedId: string | undefined) {
  const doctors = await prisma.doctorProfile.findMany({
    where: { clinicId: user.clinicId, ...(user.role === "MEDICO" && { userId: user.id }) },
    include: { user: { select: { fullName: true } } },
    orderBy: { user: { fullName: "asc" } },
  });
  const doctor = doctors.find((d) => d.id === requestedId) ?? doctors[0] ?? null;
  return { doctor, doctors };
}

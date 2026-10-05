// Data Access Layer de autenticación: chequeo seguro contra la base.
// Toda página y server action protegida debe pasar por requireUser().
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { homeFor } from "@/lib/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export const getCurrentUser = cache(async () => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      clinicId: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      doctorProfile: { select: { id: true } },
    },
  });
  // Si cambió el rol o la clínica desde el login, la cookie quedó desactualizada: se exige volver a ingresar
  // (proxy.ts decide con el rol de la cookie y no debe contradecir a la base).
  if (!user || !user.isActive || user.role !== session.role || user.clinicId !== session.clinicId) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Exige sesión válida y (opcionalmente) uno de los roles indicados. */
export async function requireUser(roles?: readonly Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

// Data Access Layer de autenticación: chequeo seguro contra la base.
// Toda página y server action protegida debe pasar por requireClinicUser() o requirePlatformUser().
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { homeFor } from "@/lib/auth/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export const PASSWORD_CHANGE_PATH = "/cuenta/clave";

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
      mustChangePassword: true,
      clinic: { select: { name: true, slug: true, status: true } },
      doctorProfile: { select: { id: true } },
    },
  });
  if (!user || !user.isActive) return null;
  // Si cambió el rol o la clínica desde el login, la cookie quedó desactualizada: se exige volver a ingresar
  // (proxy.ts decide con el rol de la cookie y no debe contradecir a la base).
  if (user.role !== session.role || user.clinicId !== session.clinicId) return null;
  // Una clínica suspendida no permite ingresar (PRD §4.7); la plataforma no tiene clínica.
  if (user.role === "PLATFORM_ADMIN" ? user.clinicId !== null : user.clinic?.status !== "ACTIVE") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type ClinicUser = CurrentUser & { clinicId: string; clinic: NonNullable<CurrentUser["clinic"]> };

/** Exige sesión válida y (opcionalmente) uno de los roles indicados. */
export async function requireUser(roles?: readonly Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** Usuario de una clínica (nunca la plataforma), con su contraseña inicial ya cambiada. */
export async function requireClinicUser(roles?: readonly Exclude<Role, "PLATFORM_ADMIN">[]): Promise<ClinicUser> {
  const user = await requireUser(roles);
  if (user.role === "PLATFORM_ADMIN" || !user.clinicId || !user.clinic) redirect(homeFor(user.role));
  if (user.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  return user as ClinicUser;
}

/** Equipo de LUCIA: opera sobre clínicas, nunca sobre datos de pacientes (spec 02 §4.4). */
export async function requirePlatformUser(): Promise<CurrentUser> {
  const user = await requireUser(["PLATFORM_ADMIN"]);
  if (user.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  return user;
}

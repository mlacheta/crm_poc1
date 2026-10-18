"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PASSWORD_CHANGE_PATH, requireUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/roles";
import {
  CLINIC_CHOICE_COOKIE,
  SESSION_COOKIE,
  clinicChoiceCookieOptions,
  sessionCookieOptions,
  signClinicChoice,
  signSession,
  verifyClinicChoice,
} from "@/lib/auth/session";

const LoginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
  clinicSlug: z.string().trim().optional(),
});

export type LoginState = { error?: string } | undefined;

const INVALID = "Email o contraseña incorrectos.";

/** Cuentas que pueden ingresar: activas y de clínicas activas (o de la plataforma). */
async function loginCandidates(email: string, clinicSlug?: string) {
  const users = await prisma.user.findMany({
    where: { email, isActive: true, ...(clinicSlug && { clinic: { slug: clinicSlug } }) },
    include: { clinic: { select: { status: true } } },
  });
  return users.filter((u) => (u.clinicId === null ? u.role === "PLATFORM_ADMIN" && !clinicSlug : u.clinic?.status === "ACTIVE"));
}

async function startSession(user: { id: string; clinicId: string | null; role: Parameters<typeof homeFor>[0]; mustChangePassword: boolean }) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession({ userId: user.id, clinicId: user.clinicId, role: user.role }), sessionCookieOptions);
  store.delete(CLINIC_CHOICE_COOKIE);
  redirect(user.mustChangePassword ? PASSWORD_CHANGE_PATH : homeFor(user.role));
}

/**
 * Ingreso con email y contraseña (PRD §4.7). Si coinciden con cuentas de varias clínicas, se elige a cuál
 * entrar: sólo se ofrecen las cuentas cuya contraseña coincidió, y nunca se revela si un email existe.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    clinicSlug: formData.get("clinicSlug") || undefined,
  });
  if (!parsed.success) return { error: "Ingresá un email y contraseña válidos." };

  const candidates = await loginCandidates(parsed.data.email, parsed.data.clinicSlug);
  const matches = [];
  for (const user of candidates) {
    if (await bcrypt.compare(parsed.data.password, user.passwordHash)) matches.push(user);
  }

  if (matches.length === 0) return { error: INVALID };
  if (matches.length === 1) await startSession(matches[0]);

  (await cookies()).set(CLINIC_CHOICE_COOKIE, await signClinicChoice(matches.map((u) => u.id)), clinicChoiceCookieOptions);
  redirect("/login/clinica");
}

/** Segundo paso: entra a la cuenta elegida, sólo si estaba entre las que coincidieron. */
export async function chooseClinic(userId: string) {
  const store = await cookies();
  const allowed = await verifyClinicChoice(store.get(CLINIC_CHOICE_COOKIE)?.value);
  if (!allowed?.includes(userId)) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { clinic: { select: { status: true } } } });
  if (!user?.isActive || user.clinic?.status !== "ACTIVE") redirect("/login");
  await startSession(user);
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(CLINIC_CHOICE_COOKIE);
  redirect("/login");
}

export type PasswordState = { error?: string } | undefined;

const PasswordSchema = z
  .object({
    current: z.string().min(1, "Ingresá tu contraseña actual."),
    next: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "Las contraseñas nuevas no coinciden." })
  .refine((v) => v.next !== v.current, { message: "La nueva contraseña debe ser distinta de la actual." });

/** Cambio de contraseña de cualquier usuario; obligatorio tras una contraseña inicial. */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const current = await requireUser();
  const parsed = PasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: current.id } });
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) return { error: "La contraseña actual no es correcta." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10), mustChangePassword: false },
  });
  redirect(homeFor(user.role));
}

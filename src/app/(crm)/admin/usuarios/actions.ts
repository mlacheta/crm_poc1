"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireClinicUser } from "@/lib/auth/dal";
import { generateInitialPassword } from "@/lib/auth/passwords";
import { prisma } from "@/lib/prisma";

/** Roles que se crean desde esta pantalla; los médicos se crean desde "Nuevo médico" (necesitan matrícula y horarios). */
const STAFF_ROLES = ["ADMIN", "SECRETARIA", "MARKETING"] as const;

export type UserFormState = { error?: string; ok?: string; password?: string } | undefined;

const NewUserSchema = z.object({
  fullName: z.string().trim().min(3, "Ingresá nombre y apellido."),
  email: z.email("Email inválido.").trim().toLowerCase(),
  role: z.enum(STAFF_ROLES),
});

export async function createStaffUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  const admin = await requireClinicUser(["ADMIN"]);
  const parsed = NewUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const password = generateInitialPassword();
  try {
    await prisma.user.create({
      data: {
        ...parsed.data,
        clinicId: admin.clinicId,
        passwordHash: await bcrypt.hash(password, 10),
        mustChangePassword: true,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un usuario con ese email en esta clínica." };
    }
    throw e;
  }
  revalidatePath("/admin", "layout");
  return { ok: `Usuario creado: ${parsed.data.email}.`, password };
}

/** Busca un usuario de la clínica del administrador; nunca de otra clínica. */
async function clinicUser(userId: string) {
  const admin = await requireClinicUser(["ADMIN"]);
  const user = await prisma.user.findFirst({ where: { id: z.uuid().parse(userId), clinicId: admin.clinicId } });
  if (!user) throw new Error("Usuario no encontrado.");
  return { admin, user };
}

const otherActiveAdmins = (clinicId: string, exceptId: string) =>
  prisma.user.count({ where: { clinicId, role: "ADMIN", isActive: true, id: { not: exceptId } } });

export async function setUserActive(userId: string, isActive: boolean): Promise<UserFormState> {
  const { admin, user } = await clinicUser(userId);
  if (user.id === admin.id) return { error: "No podés desactivar tu propio usuario." };
  if (!isActive && user.role === "ADMIN" && (await otherActiveAdmins(admin.clinicId, user.id)) === 0) {
    return { error: "La clínica necesita al menos un administrador activo." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { isActive } });
  revalidatePath("/admin", "layout");
  return { ok: `${user.fullName} ${isActive ? "reactivado" : "desactivado"}.` };
}

export async function changeUserRole(userId: string, formData: FormData): Promise<UserFormState> {
  const { admin, user } = await clinicUser(userId);
  const role = z.enum(STAFF_ROLES).safeParse(formData.get("role"));
  if (!role.success) return { error: "Rol inválido." };
  if (user.role === "MEDICO") return { error: "El rol de un médico no se cambia: desactivalo y creá otro usuario." };
  if (user.id === admin.id) return { error: "No podés cambiar tu propio rol." };
  if (user.role === "ADMIN" && role.data !== "ADMIN" && (await otherActiveAdmins(admin.clinicId, user.id)) === 0) {
    return { error: "La clínica necesita al menos un administrador activo." };
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: role.data } });
  revalidatePath("/admin", "layout");
  return { ok: `Rol de ${user.fullName} actualizado.` };
}

export async function resetUserPassword(userId: string): Promise<UserFormState> {
  const { user } = await clinicUser(userId);
  const password = generateInitialPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true },
  });
  return { ok: `Nueva contraseña inicial para ${user.email}.`, password };
}

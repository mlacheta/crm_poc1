"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireClinicUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import type { FormState } from "../actions";

const SiteSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre de la sede."),
  address: z.string().trim().min(5, "Ingresá la dirección."),
  phone: z
    .string()
    .trim()
    .transform((v) => v || null),
  isActive: z.boolean(),
});

const parse = (formData: FormData) =>
  SiteSchema.safeParse({ ...Object.fromEntries(formData), isActive: formData.get("isActive") === "on" });

const duplicate = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireClinicUser(["ADMIN"]);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await prisma.location.create({ data: { ...parsed.data, clinicId: user.clinicId } });
  } catch (e) {
    if (duplicate(e)) return { error: "Ya existe una sede con ese nombre." };
    throw e;
  }
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function updateLocation(locationId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireClinicUser(["ADMIN"]);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const site = await prisma.location.findFirst({ where: { id: locationId, clinicId: user.clinicId } });
  if (!site) return { error: "Sede no encontrada." };

  if (site.isActive && !parsed.data.isActive) {
    const [otherActive, futureAppointments] = await Promise.all([
      prisma.location.count({ where: { clinicId: user.clinicId, isActive: true, id: { not: site.id } } }),
      prisma.appointment.count({
        where: { locationId: site.id, startDateTime: { gte: new Date() }, status: { in: ["CONFIRMED", "TENTATIVE_LOCKED"] } },
      }),
    ]);
    if (otherActive === 0) return { error: "La clínica necesita al menos una sede activa." };
    if (futureAppointments > 0) {
      return { error: `La sede tiene ${futureAppointments} turno(s) futuro(s): reprogramalos o cancelalos antes de desactivarla.` };
    }
  }

  try {
    await prisma.location.update({ where: { id: site.id }, data: parsed.data });
  } catch (e) {
    if (duplicate(e)) return { error: "Ya existe una sede con ese nombre." };
    throw e;
  }
  revalidatePath("/admin", "layout");
  return { ok: "Sede actualizada." };
}

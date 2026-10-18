"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requirePlatformUser } from "@/lib/auth/dal";
import { generateInitialPassword } from "@/lib/auth/passwords";
import { prisma } from "@/lib/prisma";

export type ClinicFormState = { error?: string; ok?: string; password?: string; slug?: string } | undefined;

const NewClinicSchema = z.object({
  name: z.string().trim().min(3, "Ingresá el nombre de la clínica."),
  cuit: z.string().trim().regex(/^\d{2}-\d{8}-\d$/, "CUIT: formato esperado 30-12345678-9"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Link: sólo minúsculas, números y guiones (ej. centro-vision)")
    .min(3, "Link: al menos 3 caracteres")
    .max(40, "Link: hasta 40 caracteres"),
  phone: z.string().trim().min(6, "Ingresá el teléfono de la clínica."),
  siteName: z.string().trim().min(2, "Ingresá el nombre de la primera sede."),
  siteAddress: z.string().trim().min(5, "Ingresá la dirección de la primera sede."),
  adminName: z.string().trim().min(3, "Ingresá el nombre del administrador."),
  adminEmail: z.email("Email del administrador inválido.").trim().toLowerCase(),
});

/** Alta de clínica con su primera sede y su primer Administrador (PRD §4.7). */
export async function createClinic(_prev: ClinicFormState, formData: FormData): Promise<ClinicFormState> {
  await requirePlatformUser();
  const parsed = NewClinicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const password = generateInitialPassword();
  try {
    await prisma.clinic.create({
      data: {
        name: d.name,
        cuit: d.cuit,
        slug: d.slug,
        address: d.siteAddress,
        phone: d.phone,
        locations: { create: { name: d.siteName, address: d.siteAddress, phone: d.phone } },
        users: {
          create: {
            email: d.adminEmail,
            fullName: d.adminName,
            role: "ADMIN",
            passwordHash: await bcrypt.hash(password, 10),
            mustChangePassword: true,
          },
        },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const field = JSON.stringify(e.meta ?? {});
      return { error: field.includes("slug") ? "Ese link ya lo usa otra clínica." : "Ya existe una clínica con ese CUIT." };
    }
    throw e;
  }
  revalidatePath("/plataforma");
  return { ok: `Clínica "${d.name}" creada. Administrador: ${d.adminEmail}.`, password, slug: d.slug };
}

/** Suspende o reactiva una clínica: suspendida, nadie ingresa y LUCIA no responde por su WhatsApp. */
export async function setClinicStatus(clinicId: string, status: "ACTIVE" | "SUSPENDED") {
  await requirePlatformUser();
  await prisma.clinic.update({ where: { id: z.uuid().parse(clinicId) }, data: { status } });
  revalidatePath("/plataforma");
}

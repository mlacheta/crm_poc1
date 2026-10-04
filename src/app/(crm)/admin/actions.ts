"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { DAY_NAMES } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type FormState = { error?: string; ok?: string } | undefined;

const optional = z
  .string()
  .trim()
  .transform((v) => v || null);

function firstError(error: z.ZodError) {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "Formulario"}: ${issue.message}` : "Datos inválidos.";
}

// ---------------------------------------------------------------- Clínica y credenciales

const ClinicSchema = z.object({
  name: z.string().trim().min(2),
  cuit: z.string().trim().regex(/^\d{2}-\d{8}-\d$/, "Formato esperado: 30-12345678-9"),
  address: z.string().trim().min(3),
  phone: z.string().trim().min(6),
  whatsappNumberId: optional,
  wabaId: optional,
  puntoDeVenta: z.coerce.number().int().min(1).max(99999),
  taxType: z.enum(["MONOTRIBUTO", "RESPONSABLE_INSCRIPTO"]),
  certificatePath: z.string().trim().min(1),
  privateKeyPath: z.string().trim().min(1),
  autoInvoiceOnPay: z.boolean(),
});

export async function updateClinic(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(["ADMIN"]);
  const parsed = ClinicSchema.safeParse({
    ...Object.fromEntries(formData),
    autoInvoiceOnPay: formData.get("autoInvoiceOnPay") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { puntoDeVenta, taxType, certificatePath, privateKeyPath, autoInvoiceOnPay, ...clinic } = parsed.data;
  const invoice = { puntoDeVenta, taxType, certificatePath, privateKeyPath, autoInvoiceOnPay };
  try {
    await prisma.clinic.update({
      where: { id: user.clinicId },
      data: { ...clinic, invoiceConfig: { upsert: { create: invoice, update: invoice } } },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe otra clínica con ese CUIT." };
    }
    throw e;
  }
  revalidatePath("/admin");
  return { ok: "Configuración guardada." };
}

// ---------------------------------------------------------------- Médicos

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (HH:MM)");

const DoctorSchema = z.object({
  fullName: z.string().trim().min(3),
  licenseNumber: z.string().trim().min(3),
  specialty: z.string().trim().min(3),
  consultorioNumber: optional,
  appointmentDuration: z.coerce.number().int().min(5).max(240),
  consultationFee: z.coerce.number().min(0).max(100_000_000),
});

const NewDoctorSchema = DoctorSchema.extend({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/** Lee los 7 días del formulario de horarios: una franja por día activo. */
function parseSchedule(formData: FormData) {
  const rows: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
  for (let day = 0; day < 7; day++) {
    if (formData.get(`day-${day}-active`) !== "on") continue;
    const parsed = z
      .object({ startTime: time, endTime: time })
      .refine((r) => r.startTime < r.endTime, "La hora de inicio debe ser anterior al fin")
      .safeParse({ startTime: formData.get(`day-${day}-start`), endTime: formData.get(`day-${day}-end`) });
    if (!parsed.success) return { error: `Horario ${DAY_NAMES[day]}: ${parsed.error.issues[0].message}` };
    rows.push({ dayOfWeek: day, ...parsed.data });
  }
  return { rows };
}

export async function updateDoctor(doctorId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(["ADMIN"]);
  const parsed = DoctorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const schedule = parseSchedule(formData);
  if ("error" in schedule) return { error: schedule.error };

  const doctor = await prisma.doctorProfile.findFirst({ where: { id: doctorId, clinicId: user.clinicId } });
  if (!doctor) return { error: "Médico no encontrado." };

  const { fullName, ...profile } = parsed.data;
  await prisma.$transaction([
    prisma.user.update({ where: { id: doctor.userId }, data: { fullName } }),
    prisma.doctorProfile.update({ where: { id: doctor.id }, data: profile }),
    prisma.availabilitySchedule.deleteMany({ where: { doctorId: doctor.id } }),
    prisma.availabilitySchedule.createMany({ data: schedule.rows.map((r) => ({ ...r, doctorId: doctor.id })) }),
  ]);
  revalidatePath("/admin", "layout");
  return { ok: "Médico actualizado." };
}

export async function createDoctor(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(["ADMIN"]);
  const parsed = NewDoctorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const schedule = parseSchedule(formData);
  if ("error" in schedule) return { error: schedule.error };

  const { fullName, email, password, ...profile } = parsed.data;
  try {
    await prisma.user.create({
      data: {
        clinicId: user.clinicId,
        email,
        fullName,
        role: "MEDICO",
        passwordHash: await bcrypt.hash(password, 10),
        doctorProfile: {
          create: { clinicId: user.clinicId, ...profile, availabilities: { create: schedule.rows } },
        },
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe un usuario con ese email." };
    }
    throw e;
  }
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { handleInboundMessage } from "@/lib/agent/engine";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { SIMULATOR_PHONE, SIMULATOR_UTM_SOURCE } from "@/lib/simulator";

const ROLES = ["ADMIN", "SECRETARIA"] as const;

export async function startSimulation() {
  await requireUser(ROLES);
  redirect(`/simulador?tel=${encodeURIComponent(`+5490000${String(randomInt(0, 1_000_000)).padStart(6, "0")}`)}`);
}

export type SimState = { error?: string } | undefined;

export async function sendSimulatorMessage(phoneNumber: string, _prev: SimState, formData: FormData): Promise<SimState> {
  const user = await requireUser(ROLES);
  if (!SIMULATOR_PHONE.test(phoneNumber)) return { error: "Número de prueba inválido." };
  const text = z.string().trim().min(1).max(4096).safeParse(formData.get("text"));
  if (!text.success) return { error: "Escribí un mensaje." };

  await handleInboundMessage({ clinicId: user.clinicId, phoneNumber, text: text.data, channel: "SIMULATOR" });
  revalidatePath("/simulador");
}

/** Borra todos los pacientes creados por el simulador y sus datos asociados. */
export async function clearSimulatorData() {
  const user = await requireUser(ROLES);
  const where = { clinicId: user.clinicId, utmSource: SIMULATOR_UTM_SOURCE };
  const patientIds = (await prisma.patient.findMany({ where, select: { id: true } })).map((p) => p.id);
  const appointmentIds = { appointment: { patientId: { in: patientIds } } };

  await prisma.$transaction([
    prisma.reviewRequest.deleteMany({ where: appointmentIds }),
    prisma.invoice.deleteMany({ where: appointmentIds }),
    prisma.payment.deleteMany({ where: appointmentIds }),
    prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.message.deleteMany({ where: { conversation: { patientId: { in: patientIds } } } }),
    prisma.conversation.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.medicalRecord.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.prescription.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.patient.deleteMany({ where: { id: { in: patientIds } } }),
  ]);
  revalidatePath("/", "layout");
  redirect("/simulador");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PipelineStage } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

const MoveSchema = z.object({
  patientId: z.uuid(),
  stage: z.enum(PipelineStage),
});

export async function movePatientStage(patientId: string, stage: PipelineStage) {
  const user = await requireUser(["ADMIN", "SECRETARIA"]);
  const input = MoveSchema.parse({ patientId, stage });

  const { count } = await prisma.patient.updateMany({
    where: { id: input.patientId, clinicId: user.clinicId },
    data: { currentStage: input.stage },
  });
  if (count === 0) throw new Error("Paciente no encontrado.");

  revalidatePath("/pipeline");
}

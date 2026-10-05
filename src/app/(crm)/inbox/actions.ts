"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { HUMAN_TAKEOVER_MINUTES } from "@/lib/conversations";
import { addMinutes } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

async function authorizeConversation(conversationId: string) {
  const user = await requireUser(["ADMIN", "SECRETARIA"]);
  const id = z.uuid().parse(conversationId);
  const conv = await prisma.conversation.findFirst({
    where: { id, patient: { clinicId: user.clinicId } },
    select: { id: true, channel: true, patient: { select: { phoneNumber: true, clinic: { select: { whatsappNumberId: true } } } } },
  });
  if (!conv) throw new Error("Conversación no encontrada.");
  return conv;
}

const pauseData = () => ({ mode: "PAUSED_HUMAN" as const, pausedUntil: addMinutes(new Date(), HUMAN_TAKEOVER_MINUTES) });

export async function pauseLucia(conversationId: string) {
  const { id } = await authorizeConversation(conversationId);
  await prisma.conversation.update({ where: { id }, data: pauseData() });
  revalidatePath("/inbox", "layout");
  revalidatePath("/simulador");
}

export async function resumeLucia(conversationId: string) {
  const { id } = await authorizeConversation(conversationId);
  await prisma.conversation.update({ where: { id }, data: { mode: "AI_AUTONOMOUS", pausedUntil: null } });
  revalidatePath("/inbox", "layout");
  revalidatePath("/simulador");
}

export type SendState = { error?: string; warning?: string } | undefined;

/** Registra un mensaje del operador, lo envía por WhatsApp (salvo en el simulador) y toma el chat (pausa a LUCIA). */
export async function sendHumanMessage(conversationId: string, _prev: SendState, formData: FormData): Promise<SendState> {
  const conv = await authorizeConversation(conversationId);
  const text = z.string().trim().min(1).max(4096).safeParse(formData.get("text"));
  if (!text.success) return { error: "Escribí un mensaje." };

  const delivery =
    conv.channel === "WHATSAPP"
      ? await sendWhatsAppText({ phoneNumberId: conv.patient.clinic.whatsappNumberId, to: conv.patient.phoneNumber, text: text.data })
      : null;

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conv.id,
        sender: "HUMAN_AGENT",
        text: text.data,
        metaMessageId: delivery?.sent ? delivery.messageId : undefined,
      },
    }),
    prisma.conversation.update({ where: { id: conv.id }, data: { ...pauseData(), lastMessageAt: now } }),
  ]);
  revalidatePath("/inbox", "layout");
  revalidatePath("/simulador");
  if (delivery && !delivery.sent) return { warning: `Mensaje guardado pero NO enviado por WhatsApp: ${delivery.reason}` };
}

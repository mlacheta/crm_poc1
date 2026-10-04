"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { HUMAN_TAKEOVER_MINUTES } from "@/lib/conversations";
import { addMinutes } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

async function authorizeConversation(conversationId: string) {
  const user = await requireUser(["ADMIN", "SECRETARIA"]);
  const id = z.uuid().parse(conversationId);
  const conv = await prisma.conversation.findFirst({
    where: { id, patient: { clinicId: user.clinicId } },
    select: { id: true },
  });
  if (!conv) throw new Error("Conversación no encontrada.");
  return conv.id;
}

const pauseData = () => ({ mode: "PAUSED_HUMAN" as const, pausedUntil: addMinutes(new Date(), HUMAN_TAKEOVER_MINUTES) });

export async function pauseLucia(conversationId: string) {
  const id = await authorizeConversation(conversationId);
  await prisma.conversation.update({ where: { id }, data: pauseData() });
  revalidatePath("/inbox", "layout");
}

export async function resumeLucia(conversationId: string) {
  const id = await authorizeConversation(conversationId);
  await prisma.conversation.update({ where: { id }, data: { mode: "AI_AUTONOMOUS", pausedUntil: null } });
  revalidatePath("/inbox", "layout");
}

export type SendState = { error?: string } | undefined;

/**
 * Registra un mensaje del operador y toma el chat (pausa a LUCIA).
 * El envío real por WhatsApp Cloud API se conecta en el Hito 3.
 */
export async function sendHumanMessage(conversationId: string, _prev: SendState, formData: FormData): Promise<SendState> {
  const id = await authorizeConversation(conversationId);
  const text = z.string().trim().min(1).max(4096).safeParse(formData.get("text"));
  if (!text.success) return { error: "Escribí un mensaje." };

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId: id, sender: "HUMAN_AGENT", text: text.data } }),
    prisma.conversation.update({ where: { id }, data: { ...pauseData(), lastMessageAt: now } }),
  ]);
  revalidatePath("/inbox", "layout");
}

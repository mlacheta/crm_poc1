// Motor de conversación: punto de entrada único para mensajes entrantes (webhook de WhatsApp y simulador).
// Persiste el mensaje, decide si responde LUCIA (o si un humano tomó el chat) y entrega la respuesta.
import type { ConversationChannel, Prisma } from "@/generated/prisma/client";
import { isLuciaPaused } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";
import { SIMULATOR_UTM_SOURCE } from "@/lib/simulator";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { runLucia, type AgentPayload } from "./run";

export type InboundMessage = {
  clinicId: string;
  /** E.164, ej. "+5491140001001" */
  phoneNumber: string;
  text: string;
  channel: ConversationChannel;
  metaMessageId?: string;
  rawPayload?: Prisma.InputJsonValue;
  /** Atribución de anuncios Click-to-WhatsApp (referral del webhook de Meta). */
  referral?: { source: string; campaign?: string };
};

export type InboundOutcome =
  | { status: "DUPLICATE" }
  | { status: "PAUSED"; conversationId: string; patientId: string }
  | { status: "REPLIED"; conversationId: string; patientId: string; delivery: string };

/** Etapas desde las que un mensaje nuevo del paciente reabre la conversación con LUCIA. */
const REOPEN_STAGES = ["NUEVO_LEAD", "LEAD_PENDIENTE_RESPUESTA", "ATENDIDO", "CANCELADO", "NO_SHOW"] as const;

export async function handleInboundMessage(msg: InboundMessage, now = new Date()): Promise<InboundOutcome> {
  // Meta puede reintentar el webhook: se ignora un mensaje ya procesado.
  if (msg.metaMessageId && (await prisma.message.findFirst({ where: { metaMessageId: msg.metaMessageId }, select: { id: true } }))) {
    return { status: "DUPLICATE" };
  }

  const patient = await prisma.patient.upsert({
    where: { clinicId_phoneNumber: { clinicId: msg.clinicId, phoneNumber: msg.phoneNumber } },
    update: {},
    create: {
      clinicId: msg.clinicId,
      phoneNumber: msg.phoneNumber,
      ...(msg.channel === "SIMULATOR"
        ? { utmSource: SIMULATOR_UTM_SOURCE }
        : msg.referral && { utmSource: msg.referral.source, utmCampaign: msg.referral.campaign }),
    },
  });

  const conversation =
    (await prisma.conversation.findFirst({
      where: { patientId: patient.id, channel: msg.channel },
      orderBy: { lastMessageAt: "desc" },
    })) ?? (await prisma.conversation.create({ data: { patientId: patient.id, channel: msg.channel, lastMessageAt: now } }));

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "PATIENT",
        text: msg.text,
        metaMessageId: msg.metaMessageId,
        rawPayload: msg.rawPayload,
        createdAt: now,
      },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        pendingFollowupAt: null,
        // Pausa humana vencida: LUCIA retoma.
        ...(conversation.mode === "PAUSED_HUMAN" && !isLuciaPaused(conversation, now) && { mode: "AI_AUTONOMOUS", pausedUntil: null }),
      },
    }),
  ]);

  if (isLuciaPaused(conversation, now)) {
    return { status: "PAUSED", conversationId: conversation.id, patientId: patient.id };
  }

  if ((REOPEN_STAGES as readonly string[]).includes(patient.currentStage)) {
    await prisma.patient.update({ where: { id: patient.id }, data: { currentStage: "EN_CONVERSACION_IA" } });
  }

  const { text, payload } = await runLucia(conversation.id, now);
  const delivery = await deliverLuciaReply({ conversationId: conversation.id, channel: msg.channel, clinicId: msg.clinicId, to: msg.phoneNumber, text, payload });

  if (payload.error) {
    // Si el modelo falló, recepción toma el chat (el texto de respaldo así lo anuncia).
    await prisma.$transaction([
      prisma.conversation.update({ where: { id: conversation.id }, data: { mode: "PAUSED_HUMAN", pausedUntil: null } }),
      prisma.message.create({ data: { conversationId: conversation.id, sender: "SYSTEM", text: `Error del agente: ${payload.error}` } }),
    ]);
  }

  return { status: "REPLIED", conversationId: conversation.id, patientId: patient.id, delivery };
}

async function deliverLuciaReply({
  conversationId,
  channel,
  clinicId,
  to,
  text,
  payload,
}: {
  conversationId: string;
  channel: ConversationChannel;
  clinicId: string;
  to: string;
  text: string;
  payload: AgentPayload;
}): Promise<string> {
  let delivery = "simulador (no se envía a Meta)";
  let metaMessageId: string | undefined;

  if (channel === "WHATSAPP") {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId }, select: { whatsappNumberId: true } });
    const result = await sendWhatsAppText({ phoneNumberId: clinic.whatsappNumberId, to, text });
    if (result.sent) {
      metaMessageId = result.messageId;
      delivery = "enviado por WhatsApp";
    } else {
      delivery = `no enviado: ${result.reason}`;
      console.warn(`[WhatsApp] Respuesta de LUCIA no enviada: ${result.reason}`);
    }
  }

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        sender: "AI_LUCIA",
        text,
        metaMessageId,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);
  return delivery;
}

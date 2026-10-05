// Webhook oficial de Meta WhatsApp Cloud API.
// GET: verificación de la suscripción. POST: mensajes entrantes (se responde 200 de inmediato y
// se procesan después con `after`, porque Meta reintenta si la respuesta tarda).
import { after, type NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { handleInboundMessage } from "@/lib/agent/engine";
import { prisma } from "@/lib/prisma";
import { fromWaId } from "@/lib/whatsapp/client";
import { isValidSignature, parseInboundMessages } from "@/lib/whatsapp/webhook";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (verifyToken && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === verifyToken) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret) {
    if (!isValidSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) {
      return new Response("Invalid signature", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("[WhatsApp] WHATSAPP_APP_SECRET no configurado: se rechaza el webhook.");
    return new Response("Webhook not configured", { status: 503 });
  } else {
    console.warn("[WhatsApp] WHATSAPP_APP_SECRET no configurado: firma NO verificada (sólo desarrollo).");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const inbound = parseInboundMessages(payload);
  after(async () => {
    for (const m of inbound) {
      try {
        const clinic = await prisma.clinic.findFirst({ where: { whatsappNumberId: m.phoneNumberId }, select: { id: true } });
        if (!clinic) {
          console.warn(`[WhatsApp] Ninguna clínica tiene el Phone Number ID ${m.phoneNumberId}; mensaje ignorado.`);
          continue;
        }
        await handleInboundMessage({
          clinicId: clinic.id,
          phoneNumber: fromWaId(m.waId),
          text: m.text,
          channel: "WHATSAPP",
          metaMessageId: m.messageId,
          rawPayload: m.raw as Prisma.InputJsonValue,
          referral: m.referral,
        });
      } catch (e) {
        console.error(`[WhatsApp] Error procesando el mensaje ${m.messageId}:`, e);
      }
    }
  });

  return new Response("EVENT_RECEIVED", { status: 200 });
}

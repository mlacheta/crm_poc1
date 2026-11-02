// Cliente mínimo de Meta WhatsApp Cloud API (envío de texto dentro de la ventana de 24 h).
// Los templates fuera de ventana (recordatorios, reactivación) llegan en el Hito 10.
import { prisma } from "@/lib/prisma";
import { decryptToken } from "./crypto";
import { GRAPH_VERSION } from "./graph";

/** Datos de la clínica que hacen falta para enviar. */
export type WhatsAppClinic = { id: string; whatsappNumberId: string | null; whatsappAccessToken: string | null };
export const WHATSAPP_CLINIC_SELECT = { id: true, whatsappNumberId: true, whatsappAccessToken: true } as const;

/** Token propio de la clínica (Embedded Signup) o, si no tiene, el global de la conexión manual. */
export function resolveAccessToken(stored: string | null): string | null {
  return stored ? decryptToken(stored) : process.env.WHATSAPP_ACCESS_TOKEN || null;
}

/** "+5491140001001" → "5491140001001" (formato `to` de la Cloud API). */
export const toWaId = (e164: string) => e164.replace(/^\+/, "");
/** "5491140001001" (wa_id de Meta) → "+5491140001001". */
export const fromWaId = (waId: string) => (waId.startsWith("+") ? waId : `+${waId}`);

export type SendResult = { sent: true; messageId: string } | { sent: false; reason: string };

export async function sendWhatsAppText({ clinic, to, text }: { clinic: WhatsAppClinic; to: string; text: string }): Promise<SendResult> {
  if (!clinic.whatsappNumberId) return { sent: false, reason: "La clínica no tiene Phone Number ID de WhatsApp configurado." };
  let token: string | null;
  try {
    token = resolveAccessToken(clinic.whatsappAccessToken);
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "No se pudo leer el token de WhatsApp." };
  }
  if (!token) return { sent: false, reason: "La clínica no conectó WhatsApp y falta WHATSAPP_ACCESS_TOKEN en .env." };

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${clinic.whatsappNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toWaId(to),
        type: "text",
        text: { body: text, preview_url: false },
      }),
    });
  } catch (e) {
    return { sent: false, reason: `Error de red con Meta: ${e instanceof Error ? e.message : String(e)}` };
  }

  const body = (await res.json().catch(() => null)) as { messages?: { id: string }[]; error?: { message: string; code?: number } } | null;
  if (!res.ok || !body?.messages?.[0]?.id) {
    // 190 = token inválido o vencido; 200-299 = permiso revocado. La clínica tiene que reconectar.
    if (res.status === 401 || body?.error?.code === 190) {
      await prisma.clinic
        .update({ where: { id: clinic.id }, data: { whatsappStatus: "ERROR", whatsappStatusDetail: "El acceso a WhatsApp venció o fue revocado. Reconectá el número." } })
        .catch(() => undefined);
    }
    return { sent: false, reason: `Meta respondió ${res.status}: ${body?.error?.message ?? "sin detalle"}` };
  }
  return { sent: true, messageId: body.messages[0].id };
}

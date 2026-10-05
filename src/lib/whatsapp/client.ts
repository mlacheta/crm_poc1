// Cliente mínimo de Meta WhatsApp Cloud API (envío de texto dentro de la ventana de 24 h).
// Los templates fuera de ventana (recordatorios, reactivación) llegan en el Hito 6.

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

export function isWhatsAppSendConfigured() {
  return !!process.env.WHATSAPP_ACCESS_TOKEN;
}

/** "+5491140001001" → "5491140001001" (formato `to` de la Cloud API). */
export const toWaId = (e164: string) => e164.replace(/^\+/, "");
/** "5491140001001" (wa_id de Meta) → "+5491140001001". */
export const fromWaId = (waId: string) => (waId.startsWith("+") ? waId : `+${waId}`);

export type SendResult = { sent: true; messageId: string } | { sent: false; reason: string };

export async function sendWhatsAppText({
  phoneNumberId,
  to,
  text,
}: {
  phoneNumberId: string | null;
  to: string;
  text: string;
}): Promise<SendResult> {
  if (!phoneNumberId) return { sent: false, reason: "La clínica no tiene Phone Number ID de WhatsApp configurado." };
  if (!isWhatsAppSendConfigured()) return { sent: false, reason: "Falta WHATSAPP_ACCESS_TOKEN en .env." };

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
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

  const body = (await res.json().catch(() => null)) as { messages?: { id: string }[]; error?: { message: string } } | null;
  if (!res.ok || !body?.messages?.[0]?.id) {
    return { sent: false, reason: `Meta respondió ${res.status}: ${body?.error?.message ?? "sin detalle"}` };
  }
  return { sent: true, messageId: body.messages[0].id };
}

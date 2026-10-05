// Utilidades del webhook de Meta WhatsApp Cloud API: firma HMAC y extracción de mensajes entrantes.
import { createHmac, timingSafeEqual } from "node:crypto";

/** Valida X-Hub-Signature-256 ("sha256=<hex>") = HMAC-SHA256(app secret, cuerpo crudo). */
export function isValidSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"));
  const received = Buffer.from(header.slice("sha256=".length));
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export type ParsedInbound = {
  phoneNumberId: string;
  waId: string;
  messageId: string;
  text: string;
  referral?: { source: string; campaign?: string };
  raw: Record<string, unknown>;
};

type WaMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
  button?: { text: string };
  referral?: { source_type?: string; source_id?: string; headline?: string };
};

type WaPayload = {
  object?: string;
  entry?: { changes?: { field?: string; value?: { metadata?: { phone_number_id?: string }; messages?: WaMessage[] } }[] }[];
};

function messageText(m: WaMessage): string {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    case "button":
      return m.button?.text ?? "";
    default:
      return `[El paciente envió un mensaje de tipo "${m.type}", que todavía no se procesa]`;
  }
}

/** Extrae los mensajes entrantes. Ignora estados de entrega (`statuses`) y otros eventos. */
export function parseInboundMessages(payload: unknown): ParsedInbound[] {
  const p = payload as WaPayload;
  if (p?.object !== "whatsapp_business_account") return [];
  return (p.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (change.field !== "messages" || !phoneNumberId) return [];
      return (change.value?.messages ?? []).map((m) => ({
        phoneNumberId,
        waId: m.from,
        messageId: m.id,
        text: messageText(m).trim() || "[mensaje vacío]",
        // Anuncios Click-to-WhatsApp: Meta adjunta `referral` al primer mensaje.
        referral: m.referral ? { source: "facebook", campaign: m.referral.headline ?? m.referral.source_id } : undefined,
        raw: m as unknown as Record<string, unknown>,
      }));
    }),
  );
}

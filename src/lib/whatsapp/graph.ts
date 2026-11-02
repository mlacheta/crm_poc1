// Llamadas a la Graph API de Meta para conectar y mantener la cuenta de WhatsApp de cada clínica
// (Embedded Signup, spec 04 §2.1). El envío de mensajes está en `client.ts`.
import { randomInt } from "node:crypto";

export const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type GraphResult<T> = { ok: true; data: T } | { ok: false; status: number; code?: number; message: string };

async function graph<T>(path: string, init: { method?: string; token?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<GraphResult<T>> {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: {
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string; code?: number } }) | null;
    if (!res.ok || json?.error) return { ok: false, status: res.status, code: json?.error?.code, message: json?.error?.message ?? "sin detalle" };
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, status: 0, message: `Error de red con Meta: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Cambia el `code` que devuelve Embedded Signup por el token de negocio de la clínica. */
export function exchangeCode(code: string) {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appId || !appSecret) return Promise.resolve<GraphResult<{ access_token: string }>>({ ok: false, status: 0, message: "Faltan NEXT_PUBLIC_META_APP_ID o WHATSAPP_APP_SECRET." });
  return graph<{ access_token: string }>("oauth/access_token", { query: { client_id: appId, client_secret: appSecret, code } });
}

/** La app de LUCIA empieza a recibir los webhooks de esa cuenta. */
export const subscribeApp = (wabaId: string, token: string) => graph<{ success: boolean }>(`${wabaId}/subscribed_apps`, { method: "POST", token });
export const unsubscribeApp = (wabaId: string, token: string) => graph<{ success: boolean }>(`${wabaId}/subscribed_apps`, { method: "DELETE", token });

/** Registra el número en la Cloud API. `pin` es el PIN de verificación en dos pasos (6 dígitos). */
export const registerNumber = (phoneNumberId: string, token: string, pin: string) =>
  graph<{ success: boolean }>(`${phoneNumberId}/register`, { method: "POST", token, body: { messaging_product: "whatsapp", pin } });

export const generatePin = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export type PhoneInfo = { display_phone_number?: string; verified_name?: string; quality_rating?: string };
export const getPhoneInfo = (phoneNumberId: string, token: string) =>
  graph<PhoneInfo>(phoneNumberId, { token, query: { fields: "display_phone_number,verified_name,quality_rating" } });

export type TemplateDef = {
  name: string;
  language: string;
  category: "UTILITY";
  components: unknown[];
};
export const createTemplate = (wabaId: string, token: string, template: TemplateDef) =>
  graph<{ id: string; status: string }>(`${wabaId}/message_templates`, { method: "POST", token, body: template });

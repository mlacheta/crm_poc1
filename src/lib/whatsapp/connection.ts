// Ciclo de vida de la conexión de WhatsApp de una clínica por Embedded Signup (spec 04 §2.1).
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { encryptToken } from "./crypto";
import { createTemplate, exchangeCode, generatePin, getPhoneInfo, registerNumber, subscribeApp, unsubscribeApp } from "./graph";
import { resolveAccessToken } from "./client";
import { REQUIRED_TEMPLATES } from "./templates";
import type { AccountEvent } from "./webhook";

export type ConnectResult = { ok: true; displayPhone: string | null; templatesPending: number } | { ok: false; error: string };

/** Eventos de `account_update` tras los cuales ya no tenemos acceso a la cuenta. */
const LOST_ACCESS_EVENTS = new Set(["PARTNER_REMOVED", "ACCOUNT_DELETED", "DISABLED_UPDATE", "PARTNER_APP_UNINSTALLED"]);

/**
 * Cierra el Embedded Signup: canjea el code por el token, suscribe la app al WABA, registra el número,
 * guarda todo en la clínica y pide las plantillas. Falla sin tocar la clínica si algún paso crítico falla.
 */
export async function connectClinicWhatsApp(clinicId: string, input: { code: string; phoneNumberId: string; wabaId: string }): Promise<ConnectResult> {
  const { phoneNumberId, wabaId } = input;
  const owner = await prisma.clinic.findFirst({ where: { whatsappNumberId: phoneNumberId, NOT: { id: clinicId } }, select: { id: true } });
  if (owner) return { ok: false, error: "Ese número de WhatsApp ya está conectado a otra clínica." };

  const exchanged = await exchangeCode(input.code);
  if (!exchanged.ok) return { ok: false, error: `Meta no aceptó la autorización: ${exchanged.message}` };
  const token = exchanged.data.access_token;

  const subscribed = await subscribeApp(wabaId, token);
  if (!subscribed.ok) return { ok: false, error: `No se pudo suscribir la cuenta a LUCIA: ${subscribed.message}` };

  // Si el número ya estaba registrado Meta responde error; no es motivo para abortar: se verifica con getPhoneInfo.
  const registered = await registerNumber(phoneNumberId, token, generatePin());
  const info = await getPhoneInfo(phoneNumberId, token);
  if (!info.ok) return { ok: false, error: `No se pudo leer el número${registered.ok ? "" : ` (registro: ${registered.message})`}: ${info.message}` };

  try {
    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        whatsappNumberId: phoneNumberId,
        wabaId,
        whatsappAccessToken: encryptToken(token),
        whatsappStatus: "CONNECTED",
        whatsappStatusDetail: null,
        whatsappDisplayPhone: info.data.display_phone_number ?? null,
        whatsappQualityRating: info.data.quality_rating ?? null,
        whatsappConnectedAt: new Date(),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "Ese número de WhatsApp ya está conectado a otra clínica." };
    throw e;
  }

  // Plantillas: mejor esfuerzo. Si ya existen Meta responde error y se ignora.
  const created = await Promise.all(REQUIRED_TEMPLATES.map((t) => createTemplate(wabaId, token, t)));
  return { ok: true, displayPhone: info.data.display_phone_number ?? null, templatesPending: created.filter((r) => r.ok).length };
}

/** La clínica desconecta su número: se avisa a Meta (mejor esfuerzo) y se borran el token y los datos de la cuenta. */
export async function disconnectClinicWhatsApp(clinicId: string) {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId }, select: { wabaId: true, whatsappAccessToken: true } });
  if (clinic.wabaId && clinic.whatsappAccessToken) {
    try {
      await unsubscribeApp(clinic.wabaId, resolveAccessToken(clinic.whatsappAccessToken)!);
    } catch {
      // Token ilegible o ya revocado: igual se desconecta de nuestro lado.
    }
  }
  await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      whatsappNumberId: null,
      wabaId: null,
      whatsappAccessToken: null,
      whatsappStatus: "DISCONNECTED",
      whatsappStatusDetail: "La clínica desconectó su número.",
      whatsappDisplayPhone: null,
      whatsappQualityRating: null,
    },
  });
}

/** Aplica a la clínica dueña del WABA un evento de cuenta recibido por el webhook. */
export async function applyAccountEvent(e: AccountEvent) {
  const clinic = await prisma.clinic.findFirst({ where: { wabaId: e.wabaId }, select: { id: true, whatsappNumberId: true, whatsappAccessToken: true } });
  if (!clinic) return;

  if (e.field === "account_update" && LOST_ACCESS_EVENTS.has(e.event)) {
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { whatsappStatus: "DISCONNECTED", whatsappStatusDetail: `Meta informó ${e.event}: la clínica quitó el acceso o la cuenta fue deshabilitada.` },
    });
    return;
  }
  if (e.field === "phone_number_quality_update" && clinic.whatsappNumberId) {
    const token = resolveAccessToken(clinic.whatsappAccessToken);
    const info = token ? await getPhoneInfo(clinic.whatsappNumberId, token) : null;
    if (info?.ok) await prisma.clinic.update({ where: { id: clinic.id }, data: { whatsappQualityRating: info.data.quality_rating ?? null } });
  }
}

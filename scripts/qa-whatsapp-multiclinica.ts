// Verifica sin llamar a Meta: cifrado del token, token por clínica vs. global y eventos de cuenta del webhook.
import { decryptToken, encryptToken } from "../src/lib/whatsapp/crypto";
import { resolveAccessToken } from "../src/lib/whatsapp/client";
import { parseAccountEvents, parseInboundMessages } from "../src/lib/whatsapp/webhook";

process.env.SESSION_SECRET ??= "x".repeat(40);
let failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}`);
  if (!ok) failed++;
};

const enc = encryptToken("EAAG-token-de-prueba");
check("el token cifrado no contiene el original", !enc.includes("EAAG"));
check("descifrar devuelve el token original", decryptToken(enc) === "EAAG-token-de-prueba");
check("dos cifrados del mismo token difieren (IV aleatorio)", encryptToken("a") !== encryptToken("a"));
check("un token alterado no se descifra", (() => { try { decryptToken(enc.slice(0, -2) + "AA"); return false; } catch { return true; } })());

process.env.WHATSAPP_ACCESS_TOKEN = "GLOBAL";
check("sin token propio se usa el global (conexión manual)", resolveAccessToken(null) === "GLOBAL");
check("con token propio gana el de la clínica", resolveAccessToken(enc) === "EAAG-token-de-prueba");

const accountPayload = {
  object: "whatsapp_business_account",
  entry: [{ id: "555", changes: [{ field: "account_update", value: { event: "PARTNER_REMOVED" } }, { field: "messages", value: {} }] }],
};
const events = parseAccountEvents(accountPayload);
check("extrae sólo los eventos de cuenta, con el WABA", events.length === 1 && events[0].wabaId === "555" && events[0].event === "PARTNER_REMOVED");
check("un evento de cuenta no se confunde con un mensaje", parseInboundMessages(accountPayload).length === 0);
check("ignora payloads de otros objetos", parseAccountEvents({ object: "page", entry: [] }).length === 0);

process.exit(failed ? 1 : 0);

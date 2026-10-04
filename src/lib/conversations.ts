import type { ConversationMode } from "@/generated/prisma/enums";

// Minutos sin actividad humana tras los cuales LUCIA retoma la conversación (PRD §4.1, "X minutos").
export const HUMAN_TAKEOVER_MINUTES = 30;

/** LUCIA está pausada si un humano tomó el chat y la pausa no venció. */
export function isLuciaPaused(conv: { mode: ConversationMode; pausedUntil: Date | null }, now = new Date()) {
  return conv.mode === "PAUSED_HUMAN" && (!conv.pausedUntil || conv.pausedUntil > now);
}

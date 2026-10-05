// Ejecuta un turno de LUCIA sobre una conversación: arma el historial, llama al modelo con las
// herramientas (loop multi-paso del AI SDK) y devuelve la respuesta + traza de herramientas.
import { generateText, isStepCount, type ModelMessage } from "ai";
import { prisma } from "@/lib/prisma";
import type { Message } from "@/generated/prisma/client";
import { llmConfig, getLanguageModel } from "./model";
import { buildSystemPrompt } from "./prompt";
import { createLuciaTools } from "./tools";

/** Mensajes del historial que se envían al modelo. */
const HISTORY_LIMIT = 30;
/** Máximo de pasos (llamadas al modelo) por mensaje entrante. */
const MAX_STEPS = 6;

export type ToolTrace = { tool: string; input: unknown; output: unknown };

/** Lo que se guarda en Message.rawPayload de cada respuesta de LUCIA. */
export type AgentPayload = {
  provider: string;
  model: string;
  responseMessages: ModelMessage[];
  tools: ToolTrace[];
  error?: string;
};

export const AGENT_FALLBACK_TEXT =
  "Disculpá, estoy teniendo un problema técnico 🙏 Ya le aviso a recepción para que te responda una persona.";

function toModelMessages(messages: Message[]): ModelMessage[] {
  return messages.flatMap((m): ModelMessage[] => {
    switch (m.sender) {
      case "PATIENT":
        return [{ role: "user", content: m.text }];
      case "AI_LUCIA": {
        const payload = m.rawPayload as Partial<AgentPayload> | null;
        return payload?.responseMessages?.length ? payload.responseMessages : [{ role: "assistant", content: m.text }];
      }
      case "HUMAN_AGENT":
        return [{ role: "assistant", content: `[Respondió una persona de recepción] ${m.text}` }];
      case "SYSTEM":
        return [];
    }
  });
}

export async function runLucia(conversationId: string, now = new Date()): Promise<{ text: string; payload: AgentPayload }> {
  const { provider, model } = llmConfig();
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      patient: { include: { clinic: true } },
      messages: { orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT },
    },
  });
  const { patient } = conversation;
  const doctors = await prisma.doctorProfile.findMany({
    where: { clinicId: patient.clinicId, user: { isActive: true } },
    include: { user: { select: { fullName: true } }, availabilities: true },
    orderBy: { user: { fullName: "asc" } },
  });

  try {
    const result = await generateText({
      model: getLanguageModel(),
      instructions: buildSystemPrompt({ clinic: patient.clinic, doctors, patient, now }),
      messages: toModelMessages([...conversation.messages].reverse()),
      tools: createLuciaTools({ clinicId: patient.clinicId, patientId: patient.id, conversationId, now }),
      stopWhen: isStepCount(MAX_STEPS),
    });

    const tools = result.steps.flatMap((step) =>
      step.toolResults.map((r) => ({ tool: r.toolName, input: r.input, output: r.output })),
    );
    const text = result.text.trim();
    return {
      text: text || AGENT_FALLBACK_TEXT,
      payload: { provider, model, responseMessages: text ? result.responseMessages : [], tools },
    };
  } catch (e) {
    console.error("[LUCIA] Error del agente:", e);
    return {
      text: AGENT_FALLBACK_TEXT,
      payload: { provider, model, responseMessages: [], tools: [], error: e instanceof Error ? e.message : String(e) },
    };
  }
}

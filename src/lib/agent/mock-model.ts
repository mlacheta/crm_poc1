// Modelo "mock" de LUCIA: reglas deterministas que implementan la interfaz LanguageModelV4 del AI SDK.
// Sirve para el simulador y para pruebas sin API key: recorre el MISMO circuito que un LLM real
// (pide herramientas, recibe sus resultados y responde). No entiende lenguaje: sólo palabras clave.
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4GenerateResult,
  LanguageModelV4Message,
} from "@ai-sdk/provider";

type ToolResult = { toolName: string; value: unknown };

const EMERGENCY = /(dolor (fuerte|intenso|agudo|muy)|perd[ií] (la )?(vista|visi[oó]n)|no veo|destell|cortina|sombra|golpe|traumat|cuerpo extra|me entr[oó] algo|qu[ií]mic|quemadura)/i;
const HUMAN = /(humano|persona|secretari|recepci|operador|hablar con alguien)/i;
const BOOK = /(turno|cita|reserv|agend|horario|disponib|consulta con)/i;
const PRICE = /(precio|cu[aá]nto (sale|cuesta|cobran)|valor|arancel|costo)/i;
const INSURANCE = /(obra social|prepaga|osde|swiss|galeno|medif|omint|ioma|pami|cobertura)/i;
const LOCATION = /(d[oó]nde|direcci[oó]n|ubicaci|c[oó]mo llego|queda)/i;
const STUDIES = /(estudio|fondo de ojo|dilat|campo visual|topograf|oct|preparaci|prepar)/i;
const ORDINALS: Record<string, number> = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, "1": 1, "2": 2, "3": 3 };

function textOf(message: LanguageModelV4Message | undefined): string {
  if (!message || message.role === "system") return message?.content ?? "";
  return message.content.map((p) => (p.type === "text" ? p.text : "")).join(" ");
}

function lastToolResults(prompt: LanguageModelV4Message[]): ToolResult[] {
  const last = prompt.at(-1);
  if (last?.role !== "tool") return [];
  return last.content.flatMap((p) =>
    p.type === "tool-result" && (p.output.type === "json" || p.output.type === "text")
      ? [{ toolName: p.toolName, value: p.output.value }]
      : [],
  );
}

/** Último resultado de una herramienta en toda la conversación (incluye turnos anteriores). */
function findToolResult(prompt: LanguageModelV4Message[], toolName: string): unknown {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i];
    if (m.role !== "tool") continue;
    const part = m.content.find((p) => p.type === "tool-result" && p.toolName === toolName);
    if (part?.type === "tool-result" && part.output.type === "json") return part.output.value;
  }
  return undefined;
}

let callCounter = 0;
const call = (toolName: string, input: unknown): LanguageModelV4Content => ({
  type: "tool-call",
  toolCallId: `mock-${Date.now()}-${++callCounter}`,
  toolName,
  input: JSON.stringify(input),
});
const text = (value: string): LanguageModelV4Content => ({ type: "text", text: value });

type Slot = { doctorId: string; doctor: string; day: string; time: string; slotDateTime: string; fee: string };

function respondToToolResult({ toolName, value }: ToolResult, prompt: LanguageModelV4Message[]): LanguageModelV4Content {
  const v = value as Record<string, unknown>;
  switch (toolName) {
    case "check_availability": {
      const slots = (v.slots as Slot[]) ?? [];
      if (slots.length === 0) return text("No encontré turnos libres en esos días 😕 ¿Querés que busque la semana siguiente?");
      const options = slots.slice(0, 3).map((s, i) => `${i + 1}) ${s.day} ${s.time} hs con ${s.doctor} (${s.fee})`);
      return text(`Tengo estos turnos disponibles:\n\n${options.join("\n")}\n\nRespondé con el número que prefieras.`);
    }
    case "hold_appointment_slot":
      if (!v.ok) return text(`Uy, ${String(v.error)} ¿Querés que te muestre otros horarios?`);
      return call("generate_mercadopago_payment", { appointmentId: v.appointmentId });
    case "generate_mercadopago_payment": {
      const hold = findToolResult(prompt, "hold_appointment_slot") as Record<string, string> | undefined;
      if (!v.ok) return text(`No pude generar el pago: ${String(v.error)}`);
      return text(
        `¡Listo! Te reservé el turno del ${hold?.day} a las ${hold?.time} hs con ${hold?.doctor} 🙌\n\n` +
          `El valor de la consulta es ${String(v.amount)}. En un ratito recepción te envía el link de pago; el turno queda retenido 15 minutos.`,
      );
    }
    case "escalate_to_human":
      return text(
        v.urgencyLevel === "EMERGENCY"
          ? "Lo que contás puede ser una urgencia. Por favor acudí a la guardia oftalmológica más cercana ahora mismo. Ya avisé a recepción para que te contacten de forma prioritaria."
          : "Perfecto, ya le aviso a recepción y en breve te responde una persona del equipo.",
      );
    case "get_clinic_info": {
      if (v.address) return text(`Estamos en ${String(v.address)}. Teléfono: ${String(v.phone)}.\n\n${String(v.note)}`);
      if (v.accepted) return text(`Trabajamos con ${(v.accepted as string[]).join(", ")}. ${String(v.particular)}`);
      if (v.studies)
        return text(
          Object.entries(v.studies as Record<string, string>)
            .map(([k, d]) => `• ${k}: ${d}`)
            .join("\n"),
        );
      if (v.consultas)
        return text(
          (v.consultas as { doctor: string; specialty: string; fee: string }[])
            .map((c) => `• ${c.doctor} (${c.specialty}): ${c.fee}`)
            .join("\n") + `\n\n${String(v.note)}`,
        );
      return text("Te paso la información en un momento.");
    }
    default:
      return text("Listo.");
  }
}

function respondToUser(userText: string, prompt: LanguageModelV4Message[], today: string): LanguageModelV4Content {
  if (EMERGENCY.test(userText)) {
    return call("escalate_to_human", { reason: `Posible urgencia: "${userText.slice(0, 200)}"`, urgencyLevel: "EMERGENCY" });
  }
  if (HUMAN.test(userText)) return call("escalate_to_human", { reason: "El paciente pidió hablar con una persona", urgencyLevel: "LOW" });

  // ¿Está eligiendo una de las opciones ofrecidas?
  const offered = (findToolResult(prompt, "check_availability") as { slots?: Slot[] } | undefined)?.slots;
  const choice = userText.toLowerCase().match(/\b(primer|primero|segundo|tercer|tercero|[1-3])\b/);
  if (offered?.length && choice) {
    const slot = offered[ORDINALS[choice[1]] - 1];
    if (slot) return call("hold_appointment_slot", { doctorId: slot.doctorId, slotDateTime: slot.slotDateTime, reason: "Consulta solicitada por WhatsApp" });
  }

  if (PRICE.test(userText)) return call("get_clinic_info", { topic: "PRECIOS" });
  if (INSURANCE.test(userText)) return call("get_clinic_info", { topic: "OBRAS_SOCIALES" });
  if (STUDIES.test(userText)) return call("get_clinic_info", { topic: "ESTUDIOS_PREPARACION" });
  if (LOCATION.test(userText)) return call("get_clinic_info", { topic: "UBICACION" });
  if (BOOK.test(userText)) return call("check_availability", { fromDate: today });

  return text(
    "¡Hola! Soy LUCIA, la asistente virtual del centro oftalmológico 👋\n\n" +
      "Puedo ayudarte a sacar un turno, contarte qué obras sociales aceptamos, precios o cómo prepararte para un estudio. ¿En qué te ayudo?",
  );
}

export function createMockModel(): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "lucia-mock",
    modelId: "reglas-v1",
    supportedUrls: {},
    async doGenerate(options: LanguageModelV4CallOptions): Promise<LanguageModelV4GenerateResult> {
      const prompt = options.prompt;
      const system = textOf(prompt.find((m) => m.role === "system"));
      const today = system.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1] ?? new Date().toISOString().slice(0, 10);

      const results = lastToolResults(prompt);
      const content = results.length
        ? respondToToolResult(results[0], prompt)
        : respondToUser(textOf([...prompt].reverse().find((m) => m.role === "user")), prompt, today);

      return {
        content: [content],
        finishReason: { unified: content.type === "tool-call" ? "tool-calls" : "stop", raw: undefined },
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 0, text: 0, reasoning: undefined },
        },
        warnings: [],
      };
    },
    async doStream() {
      throw new Error("El modelo mock de LUCIA no soporta streaming.");
    },
  };
}

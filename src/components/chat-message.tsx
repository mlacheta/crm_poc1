import type { Message, MessageSender } from "@/generated/prisma/client";
import type { AgentPayload } from "@/lib/agent/run";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const SENDER_LABELS: Record<MessageSender, string> = {
  PATIENT: "Paciente",
  AI_LUCIA: "LUCIA",
  HUMAN_AGENT: "Recepción",
  SYSTEM: "Sistema",
};

/** Burbuja de chat. Con `showTools`, las respuestas de LUCIA muestran las herramientas que ejecutó. */
export function ChatMessage({ message, showTools = false }: { message: Message; showTools?: boolean }) {
  const outbound = message.sender !== "PATIENT";
  const payload = message.sender === "AI_LUCIA" ? (message.rawPayload as Partial<AgentPayload> | null) : null;
  const tools = payload?.tools ?? [];

  return (
    <li className={cn("flex flex-col gap-1", outbound ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          message.sender === "PATIENT" && "bg-muted",
          message.sender === "AI_LUCIA" && "bg-primary/10",
          message.sender === "HUMAN_AGENT" && "bg-primary text-primary-foreground",
          message.sender === "SYSTEM" && "border border-dashed bg-background text-muted-foreground italic",
        )}
      >
        <p className="text-[0.7rem] font-medium opacity-70">
          {SENDER_LABELS[message.sender]} · {formatDateTime(message.createdAt)}
        </p>
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
      {showTools && payload?.error && <p className="max-w-[85%] text-xs text-destructive">Error del modelo: {payload.error}</p>}
      {showTools && tools.length > 0 && (
        <div className="flex max-w-[85%] flex-col items-end gap-1">
          {tools.map((t, i) => (
            <details key={i} className="w-full rounded-md border bg-background text-xs">
              <summary className="cursor-pointer px-2 py-1 font-mono">🔧 {t.tool}</summary>
              <pre className="max-h-48 overflow-auto border-t px-2 py-1 whitespace-pre-wrap">
                {JSON.stringify({ input: t.input, output: t.output }, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </li>
  );
}

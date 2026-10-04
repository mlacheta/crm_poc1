import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { isLuciaPaused } from "@/lib/conversations";
import { formatDateTime, formatTime, patientName } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { MessageSender } from "@/generated/prisma/enums";
import { pauseLucia, resumeLucia } from "../actions";
import { MessageComposer } from "./message-composer";

const SENDER_LABELS: Record<MessageSender, string> = {
  PATIENT: "Paciente",
  AI_LUCIA: "LUCIA",
  HUMAN_AGENT: "Recepción",
  SYSTEM: "Sistema",
};

export default async function ConversationPage({ params }: PageProps<"/inbox/[id]">) {
  const user = await requireUser(["ADMIN", "SECRETARIA"]);
  const { id } = await params;

  const conv = await prisma.conversation.findFirst({
    where: { id, patient: { clinicId: user.clinicId } },
    include: {
      patient: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conv) notFound();

  const paused = isLuciaPaused(conv);
  const toggle = (paused ? resumeLucia : pauseLucia).bind(null, conv.id);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div>
          <p className="font-medium">{patientName(conv.patient)}</p>
          <p className="text-xs text-muted-foreground">
            {conv.patient.phoneNumber}
            {conv.patient.healthInsurance && ` · ${conv.patient.healthInsurance}`} · {STAGE_LABELS[conv.patient.currentStage]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {paused ? (
            <Badge variant="destructive">
              LUCIA pausada{conv.pausedUntil && ` hasta ${formatTime(conv.pausedUntil)}`}
            </Badge>
          ) : (
            <Badge variant="secondary">LUCIA activa</Badge>
          )}
          <form action={toggle}>
            <Button type="submit" size="sm" variant={paused ? "default" : "outline"}>
              {paused ? "Reanudar LUCIA" : "Pausar LUCIA y tomar el chat"}
            </Button>
          </form>
        </div>
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto p-3">
        {conv.messages.map((m) => {
          const outbound = m.sender !== "PATIENT";
          return (
            <li key={m.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  m.sender === "PATIENT" && "bg-muted",
                  m.sender === "AI_LUCIA" && "bg-primary/10",
                  m.sender === "HUMAN_AGENT" && "bg-primary text-primary-foreground",
                  m.sender === "SYSTEM" && "border border-dashed bg-background text-muted-foreground italic",
                )}
              >
                <p className="text-[0.7rem] font-medium opacity-70">
                  {SENDER_LABELS[m.sender]} · {formatDateTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <MessageComposer conversationId={conv.id} />
    </div>
  );
}

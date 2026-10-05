import { notFound } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { isLuciaPaused } from "@/lib/conversations";
import { formatTime, patientName } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { pauseLucia, resumeLucia } from "../actions";
import { MessageComposer } from "./message-composer";

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
          <p className="flex items-center gap-2 font-medium">
            {patientName(conv.patient)}
            {conv.channel === "SIMULATOR" && <Badge variant="outline">Simulador</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">
            {conv.patient.phoneNumber}
            {conv.patient.healthInsurance && ` · ${conv.patient.healthInsurance}`} · {STAGE_LABELS[conv.patient.currentStage]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {paused ? (
            <Badge variant="destructive">
              LUCIA pausada {conv.pausedUntil ? `hasta ${formatTime(conv.pausedUntil)}` : "hasta que recepción la reanude"}
            </Badge>
          ) : (
            <Badge variant="success">LUCIA activa</Badge>
          )}
          <form action={toggle}>
            <Button type="submit" size="sm" variant={paused ? "default" : "outline"}>
              {paused ? "Reanudar LUCIA" : "Pausar LUCIA y tomar el chat"}
            </Button>
          </form>
        </div>
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto p-3">
        {conv.messages.map((m) => (
          <ChatMessage key={m.id} message={m} showTools />
        ))}
      </ol>

      <MessageComposer conversationId={conv.id} channel={conv.channel} />
    </div>
  );
}

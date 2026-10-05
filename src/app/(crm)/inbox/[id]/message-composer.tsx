"use client";

import { useActionState } from "react";
import type { ConversationChannel } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HUMAN_TAKEOVER_MINUTES } from "@/lib/conversations";
import { sendHumanMessage } from "../actions";

export function MessageComposer({ conversationId, channel }: { conversationId: string; channel: ConversationChannel }) {
  const [state, action, pending] = useActionState(sendHumanMessage.bind(null, conversationId), undefined);

  return (
    <form action={action} className="space-y-2 border-t p-3">
      <Textarea name="text" rows={2} placeholder="Escribí una respuesta como recepción…" required />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Al responder, LUCIA se pausa {HUMAN_TAKEOVER_MINUTES} min.{" "}
          {channel === "SIMULATOR" ? "Conversación del simulador: no se envía a WhatsApp." : "Se envía por WhatsApp al paciente."}
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          Enviar
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.warning && <p className="text-sm text-amber-700 dark:text-amber-400">{state.warning}</p>}
    </form>
  );
}

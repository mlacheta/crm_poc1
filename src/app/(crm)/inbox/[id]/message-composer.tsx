"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HUMAN_TAKEOVER_MINUTES } from "@/lib/conversations";
import { sendHumanMessage } from "../actions";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendHumanMessage.bind(null, conversationId), undefined);

  return (
    <form action={action} className="space-y-2 border-t p-3">
      <Textarea name="text" rows={2} placeholder="Escribí una respuesta como recepción…" required />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Al responder, LUCIA se pausa {HUMAN_TAKEOVER_MINUTES} min. El envío real por WhatsApp se conecta en el Hito 3.
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          Enviar
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

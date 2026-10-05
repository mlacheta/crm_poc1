"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendSimulatorMessage } from "./actions";

const QUICK_MESSAGES = [
  "Hola, quiero sacar un turno",
  "1",
  "¿Atienden por OSDE?",
  "¿Cuánto sale la consulta?",
  "¿Cómo me preparo para un fondo de ojo?",
  "¿Dónde quedan?",
  "Veo destellos y como una cortina negra en un ojo",
  "Quiero hablar con una persona",
];

export function SimulatorComposer({ phone, disabled }: { phone: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(sendSimulatorMessage.bind(null, phone), undefined);
  const [lastSent, setLastSent] = useState("");

  return (
    <div className="space-y-2 border-t p-3">
      {pending && (
        <div className="space-y-1 text-sm">
          <p className="w-fit max-w-[85%] rounded-lg border bg-muted px-3 py-2 opacity-70">{lastSent}</p>
          <p className="text-xs text-muted-foreground">LUCIA está escribiendo…</p>
        </div>
      )}
      {disabled && (
        <p className="text-xs text-muted-foreground">
          LUCIA está pausada: tus mensajes se guardan pero ella no responde hasta que recepción la reanude.
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {QUICK_MESSAGES.map((text) => (
          <form key={text} action={action} onSubmit={() => setLastSent(text)}>
            <input type="hidden" name="text" value={text} />
            <Button type="submit" variant="outline" size="xs" disabled={pending}>
              {text}
            </Button>
          </form>
        ))}
      </div>
      <form
        action={action}
        onSubmit={(e) => setLastSent(String(new FormData(e.currentTarget).get("text") ?? ""))}
        className="flex items-end gap-2"
      >
        <Textarea
          name="text"
          rows={2}
          placeholder="Escribí como si fueras el paciente…"
          required
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={pending}>
          Enviar
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { connectWhatsApp, disconnectWhatsApp, type FormState } from "./actions";
import { FormStatus } from "./form-status";

type FB = {
  init(o: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }): void;
  login(cb: (r: { authResponse?: { code?: string } }) => void, o: Record<string, unknown>): void;
};
declare global {
  interface Window {
    FB?: FB;
    fbAsyncInit?: () => void;
  }
}

export type WhatsAppSummary = {
  status: "NOT_CONNECTED" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  detail: string | null;
  displayPhone: string | null;
  quality: string | null;
  connectedAt: string | null;
  manual: boolean; // tiene Phone Number ID cargado a mano, sin token propio
};

const STATUS_LABEL = { NOT_CONNECTED: "Sin conectar", CONNECTED: "Conectado", ERROR: "Requiere reconexión", DISCONNECTED: "Desconectado" } as const;
const STATUS_VARIANT = { NOT_CONNECTED: "secondary", CONNECTED: "success", ERROR: "destructive", DISCONNECTED: "warning" } as const;
const QUALITY_LABEL: Record<string, string> = { GREEN: "alta", YELLOW: "media", RED: "baja" };

/** Botón "Conectar WhatsApp": abre el Embedded Signup de Meta y entrega a LUCIA el número elegido. */
export function WhatsAppConnect({ appId, configId, graphVersion, summary }: { appId: string | null; configId: string | null; graphVersion: string; summary: WhatsAppSummary }) {
  const [state, setState] = useState<FormState>();
  const [pending, startTransition] = useTransition();
  const [sdkReady, setSdkReady] = useState(false);
  // Meta avisa los IDs del número por postMessage; el `code` llega en el callback de FB.login. Llegan en cualquier orden.
  const session = useRef<{ phoneNumberId?: string; wabaId?: string; code?: string }>({});

  useEffect(() => {
    if (!appId || !configId) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.facebook.com" && e.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (data.event === "FINISH") {
          session.current.phoneNumberId = data.data?.phone_number_id;
          session.current.wabaId = data.data?.waba_id;
          finish();
        } else if (data.event === "CANCEL") {
          session.current = {};
          setState({ error: "Cancelaste la conexión antes de terminar." });
        }
      } catch {
        // mensajes ajenos
      }
    };
    window.addEventListener("message", onMessage);
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
      setSdkReady(true);
    };
    if (window.FB) window.fbAsyncInit();
    else if (!document.getElementById("facebook-jssdk")) {
      const s = document.createElement("script");
      s.id = "facebook-jssdk";
      s.async = true;
      s.src = "https://connect.facebook.net/es_LA/sdk.js";
      document.body.appendChild(s);
    }
    return () => window.removeEventListener("message", onMessage);
  }, [appId, configId, graphVersion]);

  function finish() {
    const { code, phoneNumberId, wabaId } = session.current;
    if (!code || !phoneNumberId || !wabaId) return;
    session.current = {};
    startTransition(async () => setState(await connectWhatsApp({ code, phoneNumberId, wabaId })));
  }

  function start() {
    setState(undefined);
    session.current = {};
    window.FB?.login(
      (r) => {
        if (!r.authResponse?.code) return setState({ error: "Meta no autorizó la conexión." });
        session.current.code = r.authResponse.code;
        finish();
      },
      { config_id: configId, response_type: "code", override_default_response_type: true, extras: { setup: {}, featureType: "", sessionInfoVersion: "3" } },
    );
  }

  const connected = summary.status === "CONNECTED";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={STATUS_VARIANT[summary.status]}>{STATUS_LABEL[summary.status]}</Badge>
        {summary.displayPhone && <span className="text-sm font-medium">{summary.displayPhone}</span>}
        {summary.quality && <span className="text-sm text-muted-foreground">Calidad del número: {QUALITY_LABEL[summary.quality] ?? summary.quality}</span>}
      </div>
      {summary.detail && <p className="text-sm text-destructive">{summary.detail}</p>}
      {summary.manual && summary.status === "NOT_CONNECTED" && (
        <p className="text-sm text-muted-foreground">Esta clínica usa una conexión manual (Phone Number ID cargado a mano). Conectarla con el botón la reemplaza.</p>
      )}
      {!appId || !configId ? (
        <p className="text-sm text-muted-foreground">
          La conexión con un clic todavía no está habilitada en este entorno (faltan NEXT_PUBLIC_META_APP_ID y NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID).
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={start} disabled={!sdkReady || pending}>
            {connected ? "Cambiar de número" : summary.status === "NOT_CONNECTED" ? "Conectar WhatsApp" : "Reconectar WhatsApp"}
          </Button>
          {(connected || summary.status === "ERROR") && (
            <Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(async () => setState(await disconnectWhatsApp()))}>
              Desconectar
            </Button>
          )}
        </div>
      )}
      <FormStatus state={state} />
    </div>
  );
}

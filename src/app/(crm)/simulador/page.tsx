import Link from "next/link";
import { ChatMessage } from "@/components/chat-message";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SIMULATOR_UTM_SOURCE } from "@/lib/simulator";
import { llmConfig } from "@/lib/agent/model";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointments";
import { requireUser } from "@/lib/auth/dal";
import { isLuciaPaused } from "@/lib/conversations";
import { formatDateTime, formatTime, patientName } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { SIMULATOR_PHONE } from "@/lib/simulator";
import { resumeLucia } from "../inbox/actions";
import { clearSimulatorData, startSimulation } from "./actions";
import { AutoScrollList } from "./auto-scroll-list";
import { SimulatorComposer } from "./simulator-composer";

export default async function SimuladorPage({ searchParams }: PageProps<"/simulador">) {
  const user = await requireUser(["ADMIN", "SECRETARIA"]);
  const { tel } = await searchParams;
  const phone = typeof tel === "string" && SIMULATOR_PHONE.test(tel) ? tel : null;
  const { provider, model } = llmConfig();

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">Simulador de WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Probá a LUCIA como si fueras un paciente. Usa el mismo motor que WhatsApp, pero nunca envía mensajes a Meta.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={provider === "mock" ? "outline" : "secondary"} title="Configurable con LLM_PROVIDER y LLM_MODEL en .env">
          Modelo: {provider}/{model}
        </Badge>
        <form action={startSimulation}>
          <Button type="submit" size="sm">
            Nueva conversación
          </Button>
        </form>
      </div>
    </div>
  );

  if (!phone) {
    const recent = await prisma.patient.findMany({
      where: { clinicId: user.clinicId, utmSource: SIMULATOR_UTM_SOURCE },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    return (
      <div className="space-y-4">
        {header}
        {provider === "mock" && <MockNotice />}
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones de prueba</CardTitle>
            <CardDescription>
              Los pacientes del simulador aparecen en el Pipeline y el Inbox con el canal &quot;Simulador&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay conversaciones. Empezá una nueva.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link href={`/simulador?tel=${encodeURIComponent(p.phoneNumber)}`} className="flex justify-between gap-2 p-3 text-sm hover:bg-muted">
                      <span>{patientName(p)}</span>
                      <span className="text-muted-foreground">{STAGE_LABELS[p.currentStage]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {recent.length > 0 && (
              <form action={clearSimulatorData}>
                <Button type="submit" variant="destructive" size="sm">
                  Borrar todos los datos de prueba
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { clinicId_phoneNumber: { clinicId: user.clinicId, phoneNumber: phone } },
    include: {
      conversations: { where: { channel: "SIMULATOR" }, include: { messages: { orderBy: { createdAt: "asc" } } } },
      appointments: {
        orderBy: { createdAt: "desc" },
        include: { payment: true, doctor: { include: { user: { select: { fullName: true } } } } },
      },
    },
  });
  const conversation = patient?.conversations[0];
  const messages = conversation?.messages ?? [];
  const paused = conversation ? isLuciaPaused(conversation) : false;

  return (
    <div className="space-y-4">
      {header}
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="flex h-[calc(100dvh-12rem)] min-h-[30rem] flex-col gap-0 py-0">
          <div className="flex items-center justify-between border-b p-3 text-sm">
            <span className="font-medium">📱 {phone}</span>
            <Link href="/simulador" className="text-muted-foreground hover:underline">
              Ver todas
            </Link>
          </div>
          <AutoScrollList count={messages.length}>
            {messages.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground">Escribí el primer mensaje como si fueras el paciente.</li>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} showTools />
            ))}
          </AutoScrollList>
          <SimulatorComposer phone={phone} disabled={paused} />
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado en el CRM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!patient ? (
                <p className="text-muted-foreground">El paciente se crea con el primer mensaje.</p>
              ) : (
                <>
                  <dl className="space-y-2">
                    <Row label="Etapa" value={STAGE_LABELS[patient.currentStage]} />
                    <Row label="Nombre" value={patient.firstName || patient.lastName ? patientName(patient) : "—"} />
                    <Row label="Obra social" value={patient.healthInsurance ?? "—"} />
                    <Row
                      label="LUCIA"
                      value={paused ? `Pausada ${conversation?.pausedUntil ? `hasta ${formatTime(conversation.pausedUntil)}` : "(derivada a recepción)"}` : "Activa"}
                    />
                  </dl>
                  {paused && conversation && (
                    <form action={resumeLucia.bind(null, conversation.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        Reanudar LUCIA
                      </Button>
                    </form>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {patient && patient.appointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Turnos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {patient.appointments.map((a) => (
                  <div key={a.id} className="space-y-1 border-b pb-3 last:border-b-0 last:pb-0">
                    <p className="font-medium">
                      {formatDateTime(a.startDateTime)} · {a.doctor.user.fullName}
                    </p>
                    <p className="text-muted-foreground">
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                      {a.status === "TENTATIVE_LOCKED" && a.lockedUntil && ` hasta ${formatTime(a.lockedUntil)}`}
                      {a.payment && ` · pago ${a.payment.status.toLowerCase()}`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {provider === "mock" && <MockNotice />}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function MockNotice() {
  return (
    <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
      Modo <strong>mock</strong>: LUCIA responde con reglas por palabras clave (sin IA real) pero ejecuta las herramientas reales: agenda,
      reservas, derivaciones. Para usar un modelo real, configurá <code>LLM_PROVIDER</code> y su API key en <code>.env</code>.{" "}
      <Link href="https://ai-sdk.dev/providers/ai-sdk-providers" className={buttonVariants({ variant: "link", size: "xs" })}>
        Proveedores
      </Link>
    </p>
  );
}

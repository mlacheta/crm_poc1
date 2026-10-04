import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_VARIANT } from "@/lib/appointments";
import { requireUser } from "@/lib/auth/dal";
import { formatDate, formatDateTime, patientName } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

export default async function PacientePage({ params }: PageProps<"/pacientes/[id]">) {
  const user = await requireUser(["ADMIN", "MEDICO"]);
  const { id } = await params;
  const doctorId = user.role === "MEDICO" ? user.doctorProfile?.id : undefined;
  if (user.role === "MEDICO" && !doctorId) notFound();

  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: user.clinicId, ...(doctorId && { appointments: { some: { doctorId } } }) },
    include: {
      appointments: {
        orderBy: { startDateTime: "desc" },
        include: { doctor: { include: { user: { select: { fullName: true } } } } },
      },
      medicalRecords: {
        orderBy: { consultationDate: "desc" },
        include: { doctor: { include: { user: { select: { fullName: true } } } } },
      },
    },
  });
  if (!patient) notFound();

  const fields: [string, string | null][] = [
    ["Teléfono", patient.phoneNumber],
    ["DNI", patient.dni],
    ["Email", patient.email],
    ["Cobertura", patient.healthInsurance],
    ["N° de afiliado", patient.affiliateNumber],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">{patientName(patient)}</h1>
        <Badge variant="secondary">{STAGE_LABELS[patient.currentStage]}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ficha</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd>{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Turnos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {patient.appointments.length === 0 && <p className="text-muted-foreground">Sin turnos.</p>}
              {patient.appointments.map((a) => (
                <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="font-medium">
                      {formatDateTime(a.startDateTime)} · {a.doctor.user.fullName}
                    </p>
                    <p className="text-muted-foreground">Motivo: {a.reason ?? "—"}</p>
                  </div>
                  <Badge variant={APPOINTMENT_STATUS_VARIANT[a.status]}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historia clínica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {patient.medicalRecords.length === 0 && (
                <p className="text-muted-foreground">Sin evoluciones cargadas. La carga se habilita en el Hito 7.</p>
              )}
              {patient.medicalRecords.map((r) => (
                <article key={r.id} className="space-y-1 border-b pb-4 last:border-b-0 last:pb-0">
                  <p className="font-medium">
                    {formatDate(r.consultationDate)} · {r.doctor.user.fullName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Motivo:</span> {r.motivoConsulta}
                  </p>
                  <p>
                    <span className="text-muted-foreground">AV:</span> OD {r.agudezaVisualOD ?? "—"} · OI {r.agudezaVisualOI ?? "—"}{" "}
                    <span className="text-muted-foreground">· PIO:</span> OD {r.presionOcularOD?.toString() ?? "—"} · OI{" "}
                    {r.presionOcularOI?.toString() ?? "—"} mmHg
                  </p>
                  {r.fondoDeOjo && (
                    <p>
                      <span className="text-muted-foreground">Fondo de ojo:</span> {r.fondoDeOjo}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Diagnóstico:</span> {r.diagnostico}
                  </p>
                  {r.tratamiento && (
                    <p>
                      <span className="text-muted-foreground">Tratamiento:</span> {r.tratamiento}
                    </p>
                  )}
                </article>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { requireClinicUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatDateTime, patientName } from "@/lib/format";
import { columnForStage, utmLabel } from "@/lib/pipeline";
import { KanbanBoard, type KanbanCard } from "./kanban-board";
import { ParamPicker } from "@/components/param-picker";
import { activeLocations } from "@/lib/locations";

export default async function PipelinePage({ searchParams }: PageProps<"/pipeline">) {
  const user = await requireClinicUser(["ADMIN", "SECRETARIA"]);
  const { medico, canal, sede } = await searchParams;
  const locations = await activeLocations(user.clinicId);
  const locationId = typeof sede === "string" && locations.some((l) => l.id === sede) ? sede : undefined;
  const doctorId = typeof medico === "string" && medico ? medico : undefined;
  const utmSource = typeof canal === "string" && canal ? canal : undefined;

  const [patients, doctors, sources] = await Promise.all([
    prisma.patient.findMany({
      where: {
        clinicId: user.clinicId,
        ...(utmSource && { utmSource: utmSource === "none" ? null : utmSource }),
        ...((doctorId || locationId) && { appointments: { some: { ...(doctorId && { doctorId }), ...(locationId && { locationId }) } } }),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        // Sin `reason`: el motivo de consulta es PHI y no se expone a Secretaría (spec 02 §4.2).
        appointments: {
          orderBy: { startDateTime: "desc" },
          take: 1,
          select: { startDateTime: true, doctor: { select: { user: { select: { fullName: true } } } } },
        },
      },
    }),
    prisma.doctorProfile.findMany({
      where: { clinicId: user.clinicId },
      select: { id: true, user: { select: { fullName: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.patient.findMany({
      where: { clinicId: user.clinicId },
      distinct: ["utmSource"],
      select: { utmSource: true },
    }),
  ]);

  const cards: KanbanCard[] = patients.map((p) => {
    const appt = p.appointments[0];
    return {
      id: p.id,
      name: patientName(p),
      phone: p.phoneNumber,
      healthInsurance: p.healthInsurance,
      channel: utmLabel(p.utmSource),
      stage: p.currentStage,
      column: columnForStage(p.currentStage),
      appointment: appt ? `${formatDateTime(appt.startDateTime)} · ${appt.doctor.user.fullName}` : null,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Pipeline de pacientes</h1>
          <p className="text-sm text-muted-foreground">Arrastrá una tarjeta para cambiar al paciente de etapa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ParamPicker
            param="medico"
            label="Filtrar por médico"
            allLabel="Todos los médicos"
            options={doctors.map((d) => ({ value: d.id, label: d.user.fullName }))}
            current={doctorId ?? ""}
          />
          {locations.length > 1 && (
            <ParamPicker
              param="sede"
              label="Filtrar por sede"
              allLabel="Todas las sedes"
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              current={locationId ?? ""}
            />
          )}
          <ParamPicker
            param="canal"
            label="Filtrar por canal"
            allLabel="Todos los canales"
            options={sources.map((s) => ({ value: s.utmSource ?? "none", label: utmLabel(s.utmSource) }))}
            current={utmSource ?? ""}
          />
        </div>
      </div>
      <KanbanBoard cards={cards} />
    </div>
  );
}

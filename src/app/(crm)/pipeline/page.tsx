import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatDateTime, patientName } from "@/lib/format";
import { columnForStage, utmLabel } from "@/lib/pipeline";
import { KanbanBoard, type KanbanCard } from "./kanban-board";
import { PipelineFilters } from "./pipeline-filters";

export default async function PipelinePage({ searchParams }: PageProps<"/pipeline">) {
  const user = await requireUser(["ADMIN", "SECRETARIA"]);
  const { medico, canal } = await searchParams;
  const doctorId = typeof medico === "string" && medico ? medico : undefined;
  const utmSource = typeof canal === "string" && canal ? canal : undefined;

  const [patients, doctors, sources] = await Promise.all([
    prisma.patient.findMany({
      where: {
        clinicId: user.clinicId,
        ...(utmSource && { utmSource: utmSource === "none" ? null : utmSource }),
        ...(doctorId && { appointments: { some: { doctorId } } }),
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
        <PipelineFilters
          doctors={doctors.map((d) => ({ value: d.id, label: d.user.fullName }))}
          channels={sources.map((s) => ({ value: s.utmSource ?? "none", label: utmLabel(s.utmSource) }))}
          current={{ medico: doctorId ?? "", canal: utmSource ?? "" }}
        />
      </div>
      <KanbanBoard cards={cards} />
    </div>
  );
}

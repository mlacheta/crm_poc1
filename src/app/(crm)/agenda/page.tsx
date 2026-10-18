import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_VARIANT } from "@/lib/appointments";
import { requireClinicUser } from "@/lib/auth/dal";
import { addDays, arDateTime, arDayRange, arToday, dayOfWeek, isValidYmd } from "@/lib/dates";
import { resolveViewedDoctor } from "@/lib/doctors";
import { formatLongDate, formatTime, patientName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ParamPicker } from "@/components/param-picker";
import { activeLocations } from "@/lib/locations";

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const user = await requireClinicUser(["ADMIN", "MEDICO"]);
  const { fecha, medico, sede } = await searchParams;
  const day = typeof fecha === "string" && isValidYmd(fecha) ? fecha : arToday();
  const { doctor, doctors } = await resolveViewedDoctor(user, typeof medico === "string" ? medico : undefined);

  if (!doctor) {
    return <p className="text-sm text-muted-foreground">No hay médicos cargados en la clínica.</p>;
  }

  const locations = await activeLocations(user.clinicId);
  const locationId = typeof sede === "string" && locations.some((l) => l.id === sede) ? sede : undefined;

  const { start, end } = arDayRange(day);
  const [appointments, availability] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId: doctor.id, startDateTime: { gte: start, lt: end }, ...(locationId && { locationId }) },
      orderBy: { startDateTime: "asc" },
      include: { patient: true, location: { select: { name: true } } },
    }),
    prisma.availabilitySchedule.findMany({
      where: { doctorId: doctor.id, dayOfWeek: dayOfWeek(day), isActive: true, location: { isActive: true }, ...(locationId && { locationId }) },
      orderBy: { startTime: "asc" },
      include: { location: { select: { name: true } } },
    }),
  ]);
  // Consultorio de cada franja, para mostrarlo junto a cada turno.
  const consultorio = (locId: string) => availability.find((a) => a.locationId === locId)?.consultorioNumber;

  const link = (d: string) =>
    `/agenda?fecha=${d}${user.role === "ADMIN" ? `&medico=${doctor.id}` : ""}${locationId ? `&sede=${locationId}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Agenda · {doctor.user.fullName}</h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {formatLongDate(arDateTime(day, "12:00"))} ·{" "}
            {availability.length
              ? availability
                  .map((a) => `${a.location.name} ${a.startTime}–${a.endTime}${a.consultorioNumber ? ` (consultorio ${a.consultorioNumber})` : ""}`)
                  .join(", ")
              : "sin atención este día"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user.role === "ADMIN" && (
            <ParamPicker
              param="medico"
              label="Médico"
              options={doctors.map((d) => ({ value: d.id, label: d.user.fullName }))}
              current={doctor.id}
            />
          )}
          {locations.length > 1 && (
            <ParamPicker
              param="sede"
              label="Sede"
              allLabel="Todas las sedes"
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
              current={locationId ?? ""}
            />
          )}
          <Link href={link(addDays(day, -1))} className={buttonVariants({ variant: "outline", size: "sm" })}>
            ← Anterior
          </Link>
          <Link href={link(arToday())} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Hoy
          </Link>
          <Link href={link(addDays(day, 1))} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Siguiente →
          </Link>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">No hay turnos para este día.</p>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Hora</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Cobertura</TableHead>
                <TableHead>Motivo (triage LUCIA)</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{formatTime(a.startDateTime)}</TableCell>
                  <TableCell>
                    {a.location.name}
                    {consultorio(a.locationId) && <span className="block text-xs text-muted-foreground">Consultorio {consultorio(a.locationId)}</span>}
                  </TableCell>
                  <TableCell>
                    <Link href={`/pacientes/${a.patientId}`} className="underline-offset-4 hover:underline">
                      {patientName(a.patient)}
                    </Link>
                  </TableCell>
                  <TableCell>{a.patient.healthInsurance ?? "—"}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal">{a.reason ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={APPOINTMENT_STATUS_VARIANT[a.status]}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

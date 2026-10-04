import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { formatDateTime, patientName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PacientesPage() {
  const user = await requireUser(["ADMIN", "MEDICO"]);
  // Un médico sólo ve pacientes con al menos un turno con él; el admin ve todos.
  const doctorId = user.role === "MEDICO" ? user.doctorProfile?.id : undefined;
  if (user.role === "MEDICO" && !doctorId) {
    return <p className="text-sm text-muted-foreground">Tu usuario no tiene perfil de médico asociado.</p>;
  }

  const now = new Date();
  const patients = await prisma.patient.findMany({
    where: { clinicId: user.clinicId, ...(doctorId && { appointments: { some: { doctorId } } }) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      appointments: {
        where: doctorId ? { doctorId } : undefined,
        orderBy: { startDateTime: "desc" },
        select: { startDateTime: true, reason: true },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{doctorId ? "Mis pacientes" : "Pacientes"}</h1>
        <p className="text-sm text-muted-foreground">{patients.length} pacientes</p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Cobertura</TableHead>
              <TableHead>Último motivo</TableHead>
              <TableHead>Próximo turno</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => {
              const next = p.appointments.filter((a) => a.startDateTime >= now).at(-1);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/pacientes/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {patientName(p)}
                    </Link>
                  </TableCell>
                  <TableCell>{p.dni ?? "—"}</TableCell>
                  <TableCell>{p.healthInsurance ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{p.appointments[0]?.reason ?? "—"}</TableCell>
                  <TableCell>{next ? formatDateTime(next.startDateTime) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

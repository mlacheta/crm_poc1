import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { DAY_NAMES, formatARS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ClinicForm } from "./clinic-form";

export default async function AdminPage() {
  const user = await requireUser(["ADMIN"]);

  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: user.clinicId },
    include: {
      invoiceConfig: true,
      doctors: {
        include: { user: { select: { fullName: true, email: true } }, availabilities: { orderBy: { dayOfWeek: "asc" } } },
        orderBy: { user: { fullName: "asc" } },
      },
    },
  });
  const inv = clinic.invoiceConfig;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Médicos y aranceles</CardTitle>
            <CardDescription>Agenda, consultorio, duración de turno y arancel de cada profesional.</CardDescription>
          </div>
          <Link href="/admin/medicos/nuevo" className={buttonVariants({ size: "sm" })}>
            Nuevo médico
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Médico</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Consultorio</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Días</TableHead>
                <TableHead className="text-right">Arancel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinic.doctors.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/admin/medicos/${d.id}`} className="font-medium underline-offset-4 hover:underline">
                      {d.user.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{d.licenseNumber}</p>
                  </TableCell>
                  <TableCell>{d.specialty}</TableCell>
                  <TableCell>{d.consultorioNumber ?? "—"}</TableCell>
                  <TableCell>{d.appointmentDuration} min</TableCell>
                  <TableCell>{d.availabilities.map((a) => DAY_NAMES[a.dayOfWeek].slice(0, 3)).join(", ") || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatARS(d.consultationFee)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clínica y credenciales</CardTitle>
          <CardDescription>Datos fiscales, WhatsApp Cloud API y facturación ARCA.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClinicForm
            values={{
              name: clinic.name,
              cuit: clinic.cuit,
              address: clinic.address,
              phone: clinic.phone,
              whatsappNumberId: clinic.whatsappNumberId ?? "",
              wabaId: clinic.wabaId ?? "",
              puntoDeVenta: inv?.puntoDeVenta ?? 1,
              taxType: inv?.taxType ?? "MONOTRIBUTO",
              certificatePath: inv?.certificatePath ?? "",
              privateKeyPath: inv?.privateKeyPath ?? "",
              autoInvoiceOnPay: inv?.autoInvoiceOnPay ?? true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

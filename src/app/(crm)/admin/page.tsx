import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireClinicUser } from "@/lib/auth/dal";
import { DAY_NAMES, formatARS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ClinicForm } from "./clinic-form";

export default async function AdminPage() {
  const user = await requireClinicUser(["ADMIN"]);

  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: user.clinicId },
    include: {
      invoiceConfig: true,
      doctors: {
        include: {
          user: { select: { fullName: true, email: true, isActive: true } },
          availabilities: { orderBy: { dayOfWeek: "asc" }, include: { location: { select: { name: true } } } },
        },
        orderBy: { user: { fullName: "asc" } },
      },
    },
  });
  const inv = clinic.invoiceConfig;
  const [locations, usersByRole] = await Promise.all([
    prisma.location.findMany({ where: { clinicId: user.clinicId }, orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.user.groupBy({ by: ["role"], where: { clinicId: user.clinicId, isActive: true }, _count: true }),
  ]);

  /** "Palermo: Lun, Mié · Belgrano: Vie" */
  const daysBySite = (availabilities: (typeof clinic.doctors)[number]["availabilities"]) => {
    const sites = new Map<string, string[]>();
    for (const a of availabilities) sites.set(a.location.name, [...(sites.get(a.location.name) ?? []), DAY_NAMES[a.dayOfWeek].slice(0, 3)]);
    return [...sites].map(([site, days]) => `${site}: ${days.join(", ")}`).join(" · ") || "—";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Médicos y aranceles</CardTitle>
            <CardDescription>Horarios por sede, duración de turno y arancel de cada profesional.</CardDescription>
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
                <TableHead>Turno</TableHead>
                <TableHead>Sedes y días</TableHead>
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
                    <p className="text-xs text-muted-foreground">
                      {d.licenseNumber}
                      {!d.user.isActive && " · desactivado"}
                    </p>
                  </TableCell>
                  <TableCell>{d.specialty}</TableCell>
                  <TableCell>{d.appointmentDuration} min</TableCell>
                  <TableCell className="max-w-xs whitespace-normal">{daysBySite(d.availabilities)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatARS(d.consultationFee)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Sedes</CardTitle>
            <CardDescription>Cada turno pertenece a una sede. El paciente y el WhatsApp son de la clínica.</CardDescription>
          </div>
          <Link href="/admin/sedes/nueva" className={buttonVariants({ size: "sm" })}>
            Nueva sede
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sede</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <Link href={`/admin/sedes/${l.id}`} className="font-medium underline-offset-4 hover:underline">
                      {l.name}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-normal">{l.address}</TableCell>
                  <TableCell>{l.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={l.isActive ? "success" : "outline"}>{l.isActive ? "Activa" : "Inactiva"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>
              {usersByRole.map((r) => `${r._count} ${ROLE_LABELS[r.role].toLowerCase()}`).join(" · ") || "Sin usuarios activos"}
            </CardDescription>
          </div>
          <Link href="/admin/usuarios" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Administrar usuarios
          </Link>
        </CardHeader>
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

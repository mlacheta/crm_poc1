import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePlatformUser } from "@/lib/auth/dal";
import { arDateTime, arToday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { setClinicStatus } from "./actions";
import { NewClinicForm } from "./new-clinic-form";

/** Panel del equipo de LUCIA: sólo métricas agregadas, nunca datos de pacientes (spec 02 §4.4). */
export default async function PlatformPage() {
  await requirePlatformUser();
  const monthStart = arDateTime(`${arToday().slice(0, 8)}01`);

  const clinics = await prisma.clinic.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      cuit: true,
      status: true,
      whatsappNumberId: true,
      _count: {
        select: {
          locations: { where: { isActive: true } },
          users: { where: { isActive: true } },
          patients: true,
        },
      },
    },
  });
  // Conversaciones del mes por clínica (sin leer su contenido).
  const conversations = await Promise.all(
    clinics.map((c) => prisma.conversation.count({ where: { patient: { clinicId: c.id }, lastMessageAt: { gte: monthStart } } })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Clínicas</h1>
        <p className="text-sm text-muted-foreground">
          {clinics.length} clínicas · {clinics.filter((c) => c.status === "ACTIVE").length} activas
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clínica</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Sedes</TableHead>
              <TableHead className="text-right">Usuarios</TableHead>
              <TableHead className="text-right">Pacientes</TableHead>
              <TableHead className="text-right">Conversaciones del mes</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinics.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    CUIT {c.cuit} ·{" "}
                    <Link href={`/c/${c.slug}/equipo`} className="underline-offset-4 hover:underline">
                      /c/{c.slug}/equipo
                    </Link>
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === "ACTIVE" ? "success" : "destructive"}>{c.status === "ACTIVE" ? "Activa" : "Suspendida"}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{c._count.locations}</TableCell>
                <TableCell className="text-right tabular-nums">{c._count.users}</TableCell>
                <TableCell className="text-right tabular-nums">{c._count.patients}</TableCell>
                <TableCell className="text-right tabular-nums">{conversations.at(i)}</TableCell>
                <TableCell>{c.whatsappNumberId ? "Conectado" : "—"}</TableCell>
                <TableCell>
                  <form action={setClinicStatus.bind(null, c.id, c.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                    <Button type="submit" size="sm" variant={c.status === "ACTIVE" ? "destructive" : "outline"}>
                      {c.status === "ACTIVE" ? "Suspender" : "Reactivar"}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva clínica</CardTitle>
          <CardDescription>Se crea con su primera sede y su primer administrador, que configura el resto desde la clínica.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewClinicForm />
        </CardContent>
      </Card>
    </div>
  );
}

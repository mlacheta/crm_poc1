import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireClinicUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { NewUserForm } from "./new-user-form";
import { UserActions } from "./user-actions";

export default async function UsersPage() {
  const admin = await requireClinicUser(["ADMIN"]);
  const users = await prisma.user.findMany({
    where: { clinicId: admin.clinicId },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { fullName: "asc" }],
    select: { id: true, fullName: true, email: true, role: true, isActive: true, mustChangePassword: true },
  });

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Configuración
      </Link>
      <h1 className="text-xl font-semibold">Usuarios de {admin.clinic.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo usuario</CardTitle>
          <CardDescription>
            Administración, Secretaría o Marketing. Para un médico usá{" "}
            <Link href="/admin/medicos/nuevo" className="underline underline-offset-4">
              Nuevo médico
            </Link>
            . La contraseña inicial se genera sola y se pide cambiarla en el primer ingreso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewUserForm />
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                <TableCell>
                  {!u.isActive ? (
                    <Badge variant="outline">Desactivado</Badge>
                  ) : u.mustChangePassword ? (
                    <Badge variant="warning">Contraseña inicial</Badge>
                  ) : (
                    <Badge variant="success">Activo</Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">
                  <UserActions user={u} isSelf={u.id === admin.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

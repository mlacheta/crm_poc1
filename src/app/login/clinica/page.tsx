import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { chooseClinic } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { CLINIC_CHOICE_COOKIE, verifyClinicChoice } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "../auth-shell";

/** Paso 2 del ingreso: el email y la contraseña coincidieron con cuentas de varias clínicas (PRD §4.7). */
export default async function ChooseClinicPage() {
  const userIds = await verifyClinicChoice((await cookies()).get(CLINIC_CHOICE_COOKIE)?.value);
  if (!userIds) redirect("/login");

  const accounts = await prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true, clinic: { status: "ACTIVE" } },
    select: { id: true, role: true, clinic: { select: { name: true } } },
    orderBy: { clinic: { name: "asc" } },
  });
  if (accounts.length === 0) redirect("/login");

  return (
    <AuthShell title="Elegí la clínica" description="Tu usuario tiene cuentas en más de una clínica.">
      <div className="space-y-2">
        {accounts.map((a) => (
          <form key={a.id} action={chooseClinic.bind(null, a.id)}>
            <Button type="submit" variant="outline" className="h-auto w-full flex-col items-start py-2">
              <span className="font-medium">{a.clinic?.name}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[a.role]}</span>
            </Button>
          </form>
        ))}
        <Link href="/login" className="block pt-2 text-center text-sm text-muted-foreground hover:underline">
          Volver
        </Link>
      </div>
    </AuthShell>
  );
}

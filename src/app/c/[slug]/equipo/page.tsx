import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/app/login/auth-shell";
import { LoginForm } from "@/app/login/login-form";

/** Link de ingreso del equipo de una clínica (PRD §4.7): busca la cuenta sólo en esa clínica. */
export default async function ClinicTeamLoginPage({ params }: PageProps<"/c/[slug]/equipo">) {
  const { slug } = await params;
  const clinic = await prisma.clinic.findUnique({ where: { slug }, select: { name: true, status: true } });
  if (!clinic) notFound();

  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  if (clinic.status !== "ACTIVE") {
    return (
      <AuthShell title={clinic.name} description="El acceso a esta clínica está suspendido. Comunicate con el equipo de LUCIA.">
        <p className="text-sm text-muted-foreground">No es posible ingresar en este momento.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={clinic.name} description="Ingresá con tu usuario de esta clínica.">
      <LoginForm clinicSlug={slug} />
    </AuthShell>
  );
}

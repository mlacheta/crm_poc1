import Link from "next/link";
import { AuthShell } from "@/app/login/auth-shell";
import { requireUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/roles";
import { PasswordForm } from "./password-form";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <AuthShell
      title="Cambiar contraseña"
      description={
        user.mustChangePassword
          ? "Es tu primer ingreso: elegí una contraseña personal para continuar."
          : `${user.fullName}${user.clinic ? ` · ${user.clinic.name}` : ""}`
      }
    >
      <PasswordForm />
      {!user.mustChangePassword && (
        <Link href={homeFor(user.role)} className="block pt-3 text-center text-sm text-muted-foreground hover:underline">
          Cancelar
        </Link>
      )}
    </AuthShell>
  );
}

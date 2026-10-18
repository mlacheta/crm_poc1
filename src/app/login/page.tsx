import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/roles";
import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <AuthShell title="Ingresar al CRM" description="Usá tu usuario de la clínica.">
      <LoginForm />
    </AuthShell>
  );
}

import { redirect } from "next/navigation";
import { LuciaLogo } from "@/components/brand/lucia-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/roles";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-primary p-4">
      <LuciaLogo tone="white" tagline="Recepcionista oftalmológica virtual" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Ingresar al CRM</CardTitle>
          <CardDescription>Usá tu usuario de la clínica.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}

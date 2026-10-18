import { LuciaLogo } from "@/components/brand/lucia-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Marco común de las pantallas de ingreso: fondo de marca, logo y una tarjeta. */
export function AuthShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-primary p-4">
      <LuciaLogo tone="white" tagline="Recepcionista oftalmológica virtual" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClinicUser } from "@/lib/auth/dal";
import { createLocation } from "../actions";
import { SiteForm } from "../site-form";

export default async function NewSitePage() {
  await requireClinicUser(["ADMIN"]);

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Configuración
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nueva sede</CardTitle>
        </CardHeader>
        <CardContent>
          <SiteForm action={createLocation} isNew values={{ name: "", address: "", phone: "", isActive: true }} />
        </CardContent>
      </Card>
    </div>
  );
}

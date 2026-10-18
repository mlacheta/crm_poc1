import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClinicUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { updateLocation } from "../actions";
import { SiteForm } from "../site-form";

export default async function EditSitePage({ params }: PageProps<"/admin/sedes/[id]">) {
  const user = await requireClinicUser(["ADMIN"]);
  const { id } = await params;
  const site = await prisma.location.findFirst({
    where: { id, clinicId: user.clinicId },
    include: { _count: { select: { availabilities: true } } },
  });
  if (!site) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Configuración
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Sede {site.name}</CardTitle>
          <CardDescription>{site._count.availabilities} franjas horarias de médicos en esta sede.</CardDescription>
        </CardHeader>
        <CardContent>
          <SiteForm
            action={updateLocation.bind(null, site.id)}
            values={{ name: site.name, address: site.address, phone: site.phone ?? "", isActive: site.isActive }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

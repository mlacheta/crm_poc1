import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClinicUser } from "@/lib/auth/dal";
import { activeLocations } from "@/lib/locations";
import { createDoctor } from "../../actions";
import { DoctorForm } from "../../doctor-form";

export default async function NewDoctorPage() {
  const user = await requireClinicUser(["ADMIN"]);
  const locations = await activeLocations(user.clinicId);

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Configuración
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nuevo médico</CardTitle>
        </CardHeader>
        <CardContent>
          <DoctorForm
            action={createDoctor}
            locations={locations}
            isNew
            values={{
              fullName: "",
              licenseNumber: "",
              specialty: "Oftalmología General",
              appointmentDuration: 20,
              consultationFee: 45000,
              schedule: {},
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

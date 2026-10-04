import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { createDoctor } from "../../actions";
import { DoctorForm } from "../../doctor-form";

export default async function NewDoctorPage() {
  await requireUser(["ADMIN"]);

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
            isNew
            values={{
              fullName: "",
              licenseNumber: "",
              specialty: "Oftalmología General",
              consultorioNumber: "",
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

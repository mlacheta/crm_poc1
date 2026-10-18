import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClinicUser } from "@/lib/auth/dal";
import { activeLocations, scheduleBySite } from "@/lib/locations";
import { prisma } from "@/lib/prisma";
import { updateDoctor } from "../../actions";
import { DoctorForm } from "../../doctor-form";

export default async function EditDoctorPage({ params }: PageProps<"/admin/medicos/[id]">) {
  const user = await requireClinicUser(["ADMIN"]);
  const { id } = await params;

  const doctor = await prisma.doctorProfile.findFirst({
    where: { id, clinicId: user.clinicId },
    include: { user: { select: { fullName: true, email: true } }, availabilities: true },
  });
  if (!doctor) notFound();
  const locations = await activeLocations(user.clinicId);

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
        ← Configuración
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{doctor.user.fullName}</CardTitle>
          <CardDescription>{doctor.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <DoctorForm
            action={updateDoctor.bind(null, doctor.id)}
            locations={locations}
            values={{
              fullName: doctor.user.fullName,
              licenseNumber: doctor.licenseNumber,
              specialty: doctor.specialty,
              appointmentDuration: doctor.appointmentDuration,
              consultationFee: Number(doctor.consultationFee),
              schedule: scheduleBySite(doctor.availabilities),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

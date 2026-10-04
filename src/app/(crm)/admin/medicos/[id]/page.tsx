import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { updateDoctor } from "../../actions";
import { DoctorForm } from "../../doctor-form";

export default async function EditDoctorPage({ params }: PageProps<"/admin/medicos/[id]">) {
  const user = await requireUser(["ADMIN"]);
  const { id } = await params;

  const doctor = await prisma.doctorProfile.findFirst({
    where: { id, clinicId: user.clinicId },
    include: { user: { select: { fullName: true, email: true } }, availabilities: true },
  });
  if (!doctor) notFound();

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
            values={{
              fullName: doctor.user.fullName,
              licenseNumber: doctor.licenseNumber,
              specialty: doctor.specialty,
              consultorioNumber: doctor.consultorioNumber ?? "",
              appointmentDuration: doctor.appointmentDuration,
              consultationFee: Number(doctor.consultationFee),
              schedule: Object.fromEntries(
                doctor.availabilities
                  .filter((a) => a.isActive)
                  .map((a) => [a.dayOfWeek, { startTime: a.startTime, endTime: a.endTime }]),
              ),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

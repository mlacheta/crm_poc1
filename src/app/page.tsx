import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Página de verificación del Hito 1: confirma que Next.js lee la base vía Prisma.
// Se reemplaza por el CRM real en el Hito 2.
export default async function Home() {
  await connection();

  const clinic = await prisma.clinic.findFirst({
    include: {
      doctors: {
        include: { user: true, availabilities: { orderBy: { dayOfWeek: "asc" } } },
        orderBy: { consultorioNumber: "asc" },
      },
      _count: { select: { patients: true, appointments: true } },
    },
  });

  if (!clinic) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">LUCIA CRM</h1>
        <p className="mt-2 text-muted-foreground">
          La base está vacía. Corré <code>npm run db:seed</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">{clinic.name}</h1>
        <p className="text-muted-foreground">
          {clinic.address} · {clinic._count.patients} pacientes · {clinic._count.appointments} turnos
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clinic.doctors.map((doctor) => (
          <Card key={doctor.id}>
            <CardHeader>
              <CardTitle>{doctor.user.fullName}</CardTitle>
              <CardDescription>
                {doctor.specialty} · {doctor.licenseNumber}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Badge variant="secondary">
                Consultorio {doctor.consultorioNumber} · {doctor.appointmentDuration} min
              </Badge>
              <ul className="text-muted-foreground">
                {doctor.availabilities.map((a) => (
                  <li key={a.id}>
                    {DAYS[a.dayOfWeek]} {a.startTime}–{a.endTime}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

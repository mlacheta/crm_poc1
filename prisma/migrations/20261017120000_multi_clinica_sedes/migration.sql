-- Hito 4: multi-clínica (SaaS) y sedes (PRD §4.7, spec 03 §4).
-- Migra los datos existentes: cada clínica recibe una sede inicial con su dirección, y sus horarios
-- y turnos pasan a esa sede; el consultorio del médico se copia a cada uno de sus horarios.

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PLATFORM_ADMIN';

-- Clinic: slug (generado desde el nombre) y estado
ALTER TABLE "Clinic" ADD COLUMN "slug" TEXT,
ADD COLUMN "status" "ClinicStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Clinic" c SET "slug" = s.slug
FROM (
  SELECT id,
         base || CASE WHEN row_number() OVER (PARTITION BY base ORDER BY "createdAt") > 1 THEN '-' || left(id, 6) ELSE '' END AS slug
  FROM (
    SELECT id, "createdAt",
           COALESCE(NULLIF(trim(BOTH '-' FROM regexp_replace(translate(lower(name), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', '-', 'g')), ''), 'clinica') AS base
    FROM "Clinic"
  ) b
) s
WHERE c.id = s.id;

ALTER TABLE "Clinic" ALTER COLUMN "slug" SET NOT NULL;

-- Sedes
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Location" ("id", "clinicId", "name", "address", "phone")
SELECT gen_random_uuid()::text, id, 'Sede principal', address, phone FROM "Clinic";

-- Horarios: sede y consultorio
ALTER TABLE "AvailabilitySchedule" ADD COLUMN "consultorioNumber" TEXT,
ADD COLUMN "locationId" TEXT;

UPDATE "AvailabilitySchedule" a
SET "locationId" = l.id, "consultorioNumber" = d."consultorioNumber"
FROM "DoctorProfile" d
JOIN "Location" l ON l."clinicId" = d."clinicId"
WHERE a."doctorId" = d.id;

ALTER TABLE "AvailabilitySchedule" ALTER COLUMN "locationId" SET NOT NULL;

-- Turnos: sede
ALTER TABLE "Appointment" ADD COLUMN "locationId" TEXT;

UPDATE "Appointment" ap SET "locationId" = l.id
FROM "Location" l WHERE l."clinicId" = ap."clinicId";

ALTER TABLE "Appointment" ALTER COLUMN "locationId" SET NOT NULL;

-- El consultorio pasa del médico a cada horario
ALTER TABLE "DoctorProfile" DROP COLUMN "consultorioNumber";

-- User: email único por clínica, clínica opcional (PLATFORM_ADMIN), cambio de contraseña obligatorio
ALTER TABLE "User" DROP CONSTRAINT "User_clinicId_fkey";
DROP INDEX "User_email_key";
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "clinicId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Location_clinicId_name_key" ON "Location"("clinicId", "name");
CREATE UNIQUE INDEX "Clinic_slug_key" ON "Clinic"("slug");
CREATE UNIQUE INDEX "Clinic_whatsappNumberId_key" ON "Clinic"("whatsappNumberId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "User_clinicId_email_key" ON "User"("clinicId", "email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AvailabilitySchedule" ADD CONSTRAINT "AvailabilitySchedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

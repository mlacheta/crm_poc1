// Seed de desarrollo: clínica oftalmológica demo con staff, médicos, agenda, pacientes y turnos.
// Es destructivo: vacía todas las tablas antes de cargar. Nunca correr contra producción.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AppointmentStatus,
  MessageSender,
  PaymentStatus,
  PipelineStage,
  PrismaClient,
  Role,
} from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("El seed de desarrollo no puede ejecutarse en producción.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const CONSULTA_ARS = 45000;

/** Fecha local a `days` días de hoy, a la hora "HH:MM". */
function at(days: number, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

const doctors = [
  {
    email: "laura.mendez@lucia.local",
    fullName: "Dra. Laura Méndez",
    licenseNumber: "MN 123456",
    specialty: "Oftalmología General",
    appointmentDuration: 20,
    consultorioNumber: "1",
    // dayOfWeek: 0 = Domingo ... 6 = Sábado
    schedule: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "13:00" })),
  },
  {
    email: "martin.rossi@lucia.local",
    fullName: "Dr. Martín Rossi",
    licenseNumber: "MN 234567",
    specialty: "Retina y Vítreo",
    appointmentDuration: 30,
    consultorioNumber: "2",
    schedule: [
      { dayOfWeek: 1, startTime: "14:00", endTime: "19:00" },
      { dayOfWeek: 3, startTime: "14:00", endTime: "19:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "13:00" },
    ],
  },
  {
    email: "carolina.paz@lucia.local",
    fullName: "Dra. Carolina Paz",
    licenseNumber: "MP 345678",
    specialty: "Oftalmopediatría y Estrabismo",
    appointmentDuration: 20,
    consultorioNumber: "3",
    schedule: [
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "12:00" },
    ],
  },
];

const patients = [
  { phoneNumber: "+5491140001001", firstName: "Sofía", lastName: "Gómez", dni: "35123456", healthInsurance: "OSDE", affiliateNumber: "61 234567 8 01", utmSource: "facebook", utmCampaign: "control-anual-2026", currentStage: PipelineStage.TURNO_CONFIRMADO, leadScore: 80 },
  { phoneNumber: "+5491140001002", firstName: "Jorge", lastName: "Fernández", dni: "14234567", healthInsurance: "PAMI", affiliateNumber: "150123456789", utmSource: "organic", currentStage: PipelineStage.ATENDIDO, leadScore: 90 },
  { phoneNumber: "+5491140001003", firstName: "Valentina", lastName: "López", dni: "40345678", healthInsurance: "Swiss Medical", affiliateNumber: "80012345/02", utmSource: "google_ads", utmCampaign: "lentes-contacto", currentStage: PipelineStage.PENDIENTE_PAGO, leadScore: 65 },
  { phoneNumber: "+5491140001004", firstName: "Ricardo", lastName: "Martínez", dni: "20456789", healthInsurance: "Galeno", affiliateNumber: "2234567", utmSource: "facebook", utmCampaign: "control-anual-2026", currentStage: PipelineStage.NO_SHOW, leadScore: 30 },
  { phoneNumber: "+5491140001005", firstName: "Lucía", lastName: "Romero", dni: "38567890", healthInsurance: "Medifé", affiliateNumber: "4400123", utmSource: "instagram", currentStage: PipelineStage.EN_CONVERSACION_IA, leadScore: 50 },
  { phoneNumber: "+5491140001006", firstName: "Tomás", lastName: "Díaz", dni: "55678901", healthInsurance: "OMINT", affiliateNumber: "OM-778899", utmSource: "organic", currentStage: PipelineStage.TURNO_CONFIRMADO, leadScore: 75 },
  { phoneNumber: "+5491140001007", firstName: "Graciela", lastName: "Suárez", dni: "11789012", healthInsurance: "IOMA", affiliateNumber: "IO-1122334", utmSource: "google_ads", utmCampaign: "glaucoma", currentStage: PipelineStage.DERIVADO_HUMANO, leadScore: 70 },
  { phoneNumber: "+5491140001008", firstName: null, lastName: null, dni: null, healthInsurance: "Particular", affiliateNumber: null, utmSource: "facebook", utmCampaign: "control-anual-2026", currentStage: PipelineStage.NUEVO_LEAD, leadScore: 10 },
];

async function wipe() {
  // Orden inverso de dependencias
  await prisma.reviewRequest.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.availabilitySchedule.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.invoiceConfig.deleteMany();
  await prisma.clinic.deleteMany();
}

async function main() {
  await wipe();

  const passwordHash = await bcrypt.hash(process.env.SEED_USER_PASSWORD ?? "lucia1234", 10);

  const clinic = await prisma.clinic.create({
    data: {
      name: "Centro Oftalmológico Demo",
      cuit: "30-71234567-1",
      address: "Av. Santa Fe 1234, Piso 3, CABA",
      phone: "+541148001234",
      invoiceConfig: {
        create: {
          puntoDeVenta: 4,
          certificatePath: "certs/homologacion.crt",
          privateKeyPath: "certs/homologacion.key",
          taxType: "MONOTRIBUTO",
        },
      },
      users: {
        create: [
          { email: "admin@lucia.local", fullName: "Admin Clínica", role: Role.ADMIN, passwordHash },
          { email: "secretaria@lucia.local", fullName: "Mariana Recepción", role: Role.SECRETARIA, passwordHash },
          { email: "marketing@lucia.local", fullName: "Pablo Marketing", role: Role.MARKETING, passwordHash },
        ],
      },
    },
  });

  const doctorProfiles = [];
  for (const d of doctors) {
    const user = await prisma.user.create({
      data: {
        clinicId: clinic.id,
        email: d.email,
        fullName: d.fullName,
        role: Role.MEDICO,
        passwordHash,
        doctorProfile: {
          create: {
            clinicId: clinic.id,
            licenseNumber: d.licenseNumber,
            specialty: d.specialty,
            appointmentDuration: d.appointmentDuration,
            consultorioNumber: d.consultorioNumber,
            availabilities: { create: d.schedule },
          },
        },
      },
      include: { doctorProfile: true },
    });
    doctorProfiles.push(user.doctorProfile!);
  }
  const [mendez, rossi, paz] = doctorProfiles;

  const p: Record<string, string> = {};
  for (const data of patients) {
    const patient = await prisma.patient.create({ data: { ...data, clinicId: clinic.id } });
    p[data.phoneNumber.slice(-3)] = patient.id;
  }

  // Turnos de ejemplo cubriendo los estados principales del pipeline
  const appointments = [
    { patientId: p["001"], doctor: mendez, start: at(1, "09:20"), status: AppointmentStatus.CONFIRMED, reason: "Control de vista anual", payment: PaymentStatus.APPROVED },
    { patientId: p["002"], doctor: rossi, start: at(-1, "14:30"), status: AppointmentStatus.COMPLETED, reason: "Fondo de ojo — control retinopatía diabética", payment: PaymentStatus.APPROVED },
    { patientId: p["003"], doctor: mendez, start: at(2, "10:00"), status: AppointmentStatus.TENTATIVE_LOCKED, reason: "Adaptación de lentes de contacto", payment: PaymentStatus.PENDING, lockMinutes: 15 },
    { patientId: p["004"], doctor: mendez, start: at(-2, "11:40"), status: AppointmentStatus.NO_SHOW, reason: "Ardor y ojo rojo", payment: PaymentStatus.APPROVED },
    { patientId: p["006"], doctor: paz, start: at(3, "10:40"), status: AppointmentStatus.CONFIRMED, reason: "Control de estrabismo infantil", payment: PaymentStatus.APPROVED },
  ];

  for (const a of appointments) {
    const appointment = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: a.patientId,
        doctorId: a.doctor.id,
        startDateTime: a.start,
        endDateTime: addMinutes(a.start, a.doctor.appointmentDuration),
        status: a.status,
        reason: a.reason,
        lockedUntil: a.lockMinutes ? addMinutes(new Date(), a.lockMinutes) : null,
        payment: {
          create: {
            amount: CONSULTA_ARS,
            status: a.payment,
            paidAt: a.payment === PaymentStatus.APPROVED ? addMinutes(a.start, -24 * 60) : null,
          },
        },
      },
    });

    if (a.status === AppointmentStatus.COMPLETED) {
      await prisma.medicalRecord.create({
        data: {
          patientId: a.patientId,
          doctorId: a.doctor.id,
          consultationDate: a.start,
          motivoConsulta: a.reason,
          antecedentes: "Diabetes tipo 2 de 12 años de evolución.",
          agudezaVisualOD: "20/30",
          agudezaVisualOI: "20/25",
          presionOcularOD: 16,
          presionOcularOI: 17,
          biomicroscopia: "Cristalino con opacidad nuclear leve AO.",
          fondoDeOjo: "Microaneurismas aislados en polo posterior OD. Sin edema macular.",
          diagnostico: "Retinopatía diabética no proliferativa leve OD.",
          tratamiento: "Control glucémico estricto. Nuevo control en 6 meses con OCT macular.",
        },
      });
      await prisma.reviewRequest.create({ data: { appointmentId: appointment.id } });
    }
  }

  // Conversaciones de WhatsApp de ejemplo
  await prisma.conversation.create({
    data: {
      patientId: p["005"],
      messages: {
        create: [
          { sender: MessageSender.PATIENT, text: "Hola! Quería sacar un turno para control de vista" },
          { sender: MessageSender.AI_LUCIA, text: "¡Hola! Soy LUCIA, la asistente virtual del Centro Oftalmológico. ¿Me decís tu nombre y si tenés obra social o prepaga?" },
          { sender: MessageSender.PATIENT, text: "Lucía Romero, tengo Medifé" },
        ],
      },
    },
  });
  await prisma.conversation.create({
    data: {
      patientId: p["007"],
      mode: "PAUSED_HUMAN",
      messages: {
        create: [
          { sender: MessageSender.PATIENT, text: "Veo luces y como una cortina negra en el ojo derecho desde hoy a la mañana" },
          { sender: MessageSender.AI_LUCIA, text: "Lo que describís puede ser una urgencia. Te comunico ya mismo con la recepción para atenderte hoy." },
          { sender: MessageSender.SYSTEM, text: "Triage: posible desprendimiento de retina. Derivado a humano." },
        ],
      },
    },
  });

  const counts = {
    usuarios: await prisma.user.count(),
    medicos: await prisma.doctorProfile.count(),
    horarios: await prisma.availabilitySchedule.count(),
    pacientes: await prisma.patient.count(),
    turnos: await prisma.appointment.count(),
    conversaciones: await prisma.conversation.count(),
  };
  console.log("Seed completado:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

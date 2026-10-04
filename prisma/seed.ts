// Seed de desarrollo: clínica oftalmológica demo con staff, médicos, agenda, pacientes, turnos y chats.
// Es destructivo: vacía todas las tablas antes de cargar. Nunca correr contra producción.
// Los turnos se calculan sobre los horarios reales de cada médico, relativos a la fecha actual.
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
import { addDays, addMinutes, arDateTime, arToday, dayOfWeek } from "../src/lib/dates";

if (process.env.NODE_ENV === "production") {
  throw new Error("El seed de desarrollo no puede ejecutarse en producción.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Schedule = { dayOfWeek: number; startTime: string; endTime: string }[];

const doctors = [
  {
    key: "mendez",
    email: "laura.mendez@lucia.local",
    fullName: "Dra. Laura Méndez",
    licenseNumber: "MN 123456",
    specialty: "Oftalmología General",
    appointmentDuration: 20,
    consultorioNumber: "1",
    consultationFee: 45000,
    // dayOfWeek: 0 = Domingo ... 6 = Sábado
    schedule: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "13:00" })),
  },
  {
    key: "rossi",
    email: "martin.rossi@lucia.local",
    fullName: "Dr. Martín Rossi",
    licenseNumber: "MN 234567",
    specialty: "Retina y Vítreo",
    appointmentDuration: 30,
    consultorioNumber: "2",
    consultationFee: 60000,
    schedule: [
      { dayOfWeek: 1, startTime: "14:00", endTime: "19:00" },
      { dayOfWeek: 3, startTime: "14:00", endTime: "19:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "13:00" },
    ],
  },
  {
    key: "paz",
    email: "carolina.paz@lucia.local",
    fullName: "Dra. Carolina Paz",
    licenseNumber: "MP 345678",
    specialty: "Oftalmopediatría y Estrabismo",
    appointmentDuration: 20,
    consultorioNumber: "3",
    consultationFee: 50000,
    schedule: [
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 6, startTime: "09:00", endTime: "12:00" },
    ],
  },
] as const;

type DoctorKey = (typeof doctors)[number]["key"];

const S = PipelineStage;
// `key` identifica al paciente dentro del seed; `daysAgo` es la antigüedad del lead (para métricas por período).
const patients = [
  { key: "sofia", daysAgo: 12, phoneNumber: "+5491140001001", firstName: "Sofía", lastName: "Gómez", dni: "35123456", healthInsurance: "OSDE", affiliateNumber: "61 234567 8 01", utmSource: "facebook", utmCampaign: "control-anual-2026", currentStage: S.TURNO_CONFIRMADO, leadScore: 80 },
  { key: "jorge", daysAgo: 40, phoneNumber: "+5491140001002", firstName: "Jorge", lastName: "Fernández", dni: "14234567", healthInsurance: "PAMI", affiliateNumber: "150123456789", utmSource: "organic", currentStage: S.ATENDIDO, leadScore: 90 },
  { key: "valentina", daysAgo: 2, phoneNumber: "+5491140001003", firstName: "Valentina", lastName: "López", dni: "40345678", healthInsurance: "Swiss Medical", affiliateNumber: "80012345/02", utmSource: "google_ads", utmCampaign: "lentes-contacto", currentStage: S.PENDIENTE_PAGO, leadScore: 65 },
  { key: "ricardo", daysAgo: 20, phoneNumber: "+5491140001004", firstName: "Ricardo", lastName: "Martínez", dni: "20456789", healthInsurance: "Galeno", affiliateNumber: "2234567", utmSource: "facebook", utmCampaign: "control-anual-2026", currentStage: S.NO_SHOW, leadScore: 30 },
  { key: "lucia", daysAgo: 1, phoneNumber: "+5491140001005", firstName: "Lucía", lastName: "Romero", dni: "38567890", healthInsurance: "Medifé", affiliateNumber: "4400123", utmSource: "instagram", currentStage: S.EN_CONVERSACION_IA, leadScore: 50 },
  { key: "tomas", daysAgo: 9, phoneNumber: "+5491140001006", firstName: "Tomás", lastName: "Díaz", dni: "55678901", healthInsurance: "OMINT", affiliateNumber: "OM-778899", utmSource: "organic", currentStage: S.TURNO_CONFIRMADO, leadScore: 75 },
  { key: "graciela", daysAgo: 0, phoneNumber: "+5491140001007", firstName: "Graciela", lastName: "Suárez", dni: "11789012", healthInsurance: "IOMA", affiliateNumber: "IO-1122334", utmSource: "google_ads", utmCampaign: "glaucoma", currentStage: S.DERIVADO_HUMANO, leadScore: 70 },
  { key: "lead", daysAgo: 0, phoneNumber: "+5491140001008", firstName: null, lastName: null, dni: null, healthInsurance: null, affiliateNumber: null, utmSource: "facebook", utmCampaign: "control-anual-2026", currentStage: S.NUEVO_LEAD, leadScore: 10 },
  { key: "monica", daysAgo: 15, phoneNumber: "+5491140001009", firstName: "Mónica", lastName: "Herrera", dni: "17890123", healthInsurance: "OSDE", affiliateNumber: "61 998877 6 01", utmSource: "google_ads", utmCampaign: "retina", currentStage: S.RECORDATORIO_24H_ENVIADO, leadScore: 85 },
  { key: "daniel", daysAgo: 55, phoneNumber: "+5491140001010", firstName: "Daniel", lastName: "Acosta", dni: "28901234", healthInsurance: "Particular", affiliateNumber: null, utmSource: "facebook", utmCampaign: "anteojos-2026", currentStage: S.ATENDIDO, leadScore: 88 },
  { key: "florencia", daysAgo: 6, phoneNumber: "+5491140001011", firstName: "Florencia", lastName: "Ríos", dni: "47012345", healthInsurance: "Swiss Medical", affiliateNumber: "80055667/01", utmSource: "instagram", currentStage: S.TURNO_CONFIRMADO, leadScore: 78 },
  { key: "hugo", daysAgo: 25, phoneNumber: "+5491140001012", firstName: "Hugo", lastName: "Benítez", dni: "12123456", healthInsurance: "PAMI", affiliateNumber: "150987654321", utmSource: "organic", currentStage: S.CANCELADO, leadScore: 40 },
  { key: "camila", daysAgo: 3, phoneNumber: "+5491140001013", firstName: "Camila", lastName: "Torres", dni: null, healthInsurance: "Galeno", affiliateNumber: null, utmSource: "google_ads", utmCampaign: "lentes-contacto", currentStage: S.LEAD_PENDIENTE_RESPUESTA, leadScore: 35 },
  { key: "nestor", daysAgo: 1, phoneNumber: "+5491140001014", firstName: "Néstor", lastName: "Molina", dni: "16234567", healthInsurance: "Particular", affiliateNumber: null, utmSource: "organic", currentStage: S.RESERVA_TENTATIVA, leadScore: 60 },
] as const;

type PatientKey = (typeof patients)[number]["key"];

/**
 * Fecha del n-ésimo día de atención del médico: n >= 0 busca desde hoy (inclusive) hacia adelante,
 * n < 0 busca desde ayer hacia atrás. Devuelve el día y la hora de inicio de esa franja.
 */
function workday(schedule: Schedule, n: number): { ymd: string; startTime: string } {
  const step = n >= 0 ? 1 : -1;
  let remaining = n >= 0 ? n : -n - 1;
  let ymd = n >= 0 ? arToday() : addDays(arToday(), -1);
  for (;;) {
    const slot = schedule.find((s) => s.dayOfWeek === dayOfWeek(ymd));
    if (slot) {
      if (remaining === 0) return { ymd, startTime: slot.startTime };
      remaining--;
    }
    ymd = addDays(ymd, step);
  }
}

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

  const now = new Date();
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

  const doc = {} as Record<DoctorKey, { id: string; duration: number; fee: number; schedule: Schedule }>;
  for (const { key, schedule, email, fullName, ...profile } of doctors) {
    const user = await prisma.user.create({
      data: {
        clinicId: clinic.id,
        email,
        fullName,
        role: Role.MEDICO,
        passwordHash,
        doctorProfile: {
          create: { clinicId: clinic.id, ...profile, availabilities: { create: [...schedule] } },
        },
      },
      include: { doctorProfile: true },
    });
    doc[key] = {
      id: user.doctorProfile!.id,
      duration: profile.appointmentDuration,
      fee: profile.consultationFee,
      schedule: [...schedule],
    };
  }

  const pat = {} as Record<PatientKey, string>;
  for (const { key, daysAgo, ...data } of patients) {
    const createdAt = addMinutes(now, -daysAgo * 24 * 60 - 60);
    const patient = await prisma.patient.create({ data: { ...data, clinicId: clinic.id, createdAt } });
    pat[key] = patient.id;
  }

  // Turnos: `day` es el n-ésimo día de atención del médico (negativo = pasado); `slot`, el número de turno en la franja.
  const A = AppointmentStatus;
  const P = PaymentStatus;
  const appointments: {
    patient: PatientKey;
    doctor: DoctorKey;
    day: number;
    slot: number;
    status: AppointmentStatus;
    payment: PaymentStatus;
    reason: string;
    record?: boolean;
  }[] = [
    { patient: "sofia", doctor: "mendez", day: 0, slot: 1, status: A.CONFIRMED, payment: P.APPROVED, reason: "Control de vista anual" },
    { patient: "valentina", doctor: "mendez", day: 1, slot: 3, status: A.TENTATIVE_LOCKED, payment: P.PENDING, reason: "Adaptación de lentes de contacto" },
    { patient: "ricardo", doctor: "mendez", day: -1, slot: 4, status: A.NO_SHOW, payment: P.APPROVED, reason: "Ardor y ojo rojo" },
    { patient: "daniel", doctor: "mendez", day: -2, slot: 0, status: A.COMPLETED, payment: P.APPROVED, reason: "Graduación de anteojos — ve borroso de lejos", record: true },
    { patient: "jorge", doctor: "rossi", day: -1, slot: 1, status: A.COMPLETED, payment: P.APPROVED, reason: "Fondo de ojo — control retinopatía diabética", record: true },
    { patient: "monica", doctor: "rossi", day: 0, slot: 0, status: A.CONFIRMED, payment: P.APPROVED, reason: "Moscas volantes y destellos — control de retina" },
    { patient: "hugo", doctor: "rossi", day: 1, slot: 2, status: A.CANCELLED, payment: P.REFUNDED, reason: "Control post-inyección intravítrea" },
    { patient: "tomas", doctor: "paz", day: 0, slot: 2, status: A.CONFIRMED, payment: P.APPROVED, reason: "Control de estrabismo infantil" },
    { patient: "florencia", doctor: "paz", day: 0, slot: 0, status: A.CONFIRMED, payment: P.APPROVED, reason: "Picazón y lagrimeo — posible conjuntivitis alérgica" },
  ];

  for (const a of appointments) {
    const d = doc[a.doctor];
    const { ymd, startTime } = workday(d.schedule, a.day);
    const start = addMinutes(arDateTime(ymd, startTime), a.slot * d.duration);
    const appointment = await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: pat[a.patient],
        doctorId: d.id,
        startDateTime: start,
        endDateTime: addMinutes(start, d.duration),
        status: a.status,
        reason: a.reason,
        lockedUntil: a.status === A.TENTATIVE_LOCKED ? addMinutes(now, 15) : null,
        payment: {
          create: {
            amount: d.fee,
            status: a.payment,
            paidAt: a.payment === P.APPROVED || a.payment === P.REFUNDED ? addMinutes(start, -2 * 24 * 60) : null,
          },
        },
      },
    });

    if (a.record) {
      await prisma.medicalRecord.create({
        data: {
          patientId: pat[a.patient],
          doctorId: d.id,
          consultationDate: start,
          motivoConsulta: a.reason,
          ...(a.patient === "jorge"
            ? {
                antecedentes: "Diabetes tipo 2 de 12 años de evolución.",
                agudezaVisualOD: "20/30",
                agudezaVisualOI: "20/25",
                presionOcularOD: 16,
                presionOcularOI: 17,
                biomicroscopia: "Cristalino con opacidad nuclear leve AO.",
                fondoDeOjo: "Microaneurismas aislados en polo posterior OD. Sin edema macular.",
                diagnostico: "Retinopatía diabética no proliferativa leve OD.",
                tratamiento: "Control glucémico estricto. Nuevo control en 6 meses con OCT macular.",
              }
            : {
                agudezaVisualOD: "20/50",
                agudezaVisualOI: "20/40",
                presionOcularOD: 14,
                presionOcularOI: 14,
                biomicroscopia: "Segmento anterior sin particularidades.",
                fondoDeOjo: "Papila y mácula normales AO.",
                diagnostico: "Miopía leve AO.",
                tratamiento: "Anteojos: OD -1.25 esf · OI -1.00 esf. Control anual.",
              }),
        },
      });
      await prisma.reviewRequest.create({ data: { appointmentId: appointment.id } });
    }
  }

  // Conversaciones de WhatsApp. `ago` = minutos antes de ahora del primer mensaje; cada mensaje suma 2 min.
  const M = MessageSender;
  const chats: { patient: PatientKey; ago: number; paused?: boolean; messages: [MessageSender, string][] }[] = [
    {
      patient: "graciela",
      ago: 25,
      paused: true,
      messages: [
        [M.PATIENT, "Veo luces y como una cortina negra en el ojo derecho desde hoy a la mañana"],
        [M.AI_LUCIA, "Lo que describís puede ser una urgencia. Te comunico ya mismo con la recepción para atenderte hoy."],
        [M.SYSTEM, "Triage: posible desprendimiento de retina. Derivado a humano."],
      ],
    },
    {
      patient: "lucia",
      ago: 40,
      messages: [
        [M.PATIENT, "Hola! Quería sacar un turno para control de vista"],
        [M.AI_LUCIA, "¡Hola! Soy LUCIA, la asistente virtual del Centro Oftalmológico. ¿Me decís tu nombre y si tenés obra social o prepaga?"],
        [M.PATIENT, "Lucía Romero, tengo Medifé"],
      ],
    },
    {
      patient: "lead",
      ago: 8,
      messages: [[M.PATIENT, "Hola, vi el anuncio del control anual. ¿Cuánto sale la consulta?"]],
    },
    {
      patient: "valentina",
      ago: 90,
      messages: [
        [M.PATIENT, "Quiero empezar a usar lentes de contacto, ¿hacen la adaptación?"],
        [M.AI_LUCIA, "¡Sí! La Dra. Méndez hace adaptación de lentes de contacto. Te reservé un turno; para confirmarlo te envío el link de pago de la seña."],
        [M.SYSTEM, "Link de Mercado Pago emitido. Turno bloqueado 15 minutos."],
      ],
    },
    {
      patient: "camila",
      ago: 3 * 24 * 60,
      messages: [
        [M.PATIENT, "Hola, ¿atienden por Galeno?"],
        [M.AI_LUCIA, "¡Hola! Sí, trabajamos con Galeno. ¿Querés que te busque un turno? ¿Es para control o tenés alguna molestia?"],
      ],
    },
    {
      patient: "nestor",
      ago: 60,
      messages: [
        [M.PATIENT, "Necesito turno con el de retina, me dijeron que tengo que hacerme un fondo de ojo"],
        [M.AI_LUCIA, "El Dr. Rossi atiende lunes y miércoles por la tarde y viernes por la mañana. ¿Qué día te queda mejor?"],
        [M.PATIENT, "El miércoles a la tarde"],
      ],
    },
    {
      patient: "sofia",
      ago: 2 * 24 * 60,
      messages: [
        [M.SYSTEM, "Pago aprobado por Mercado Pago. Turno confirmado."],
        [M.AI_LUCIA, "¡Listo Sofía! Tu turno con la Dra. Méndez quedó confirmado. Recordá venir sin lentes de contacto."],
        [M.PATIENT, "Genial, gracias!"],
      ],
    },
  ];

  for (const chat of chats) {
    const start = addMinutes(now, -chat.ago);
    const lastAt = addMinutes(start, (chat.messages.length - 1) * 2);
    await prisma.conversation.create({
      data: {
        patientId: pat[chat.patient],
        createdAt: start,
        lastMessageAt: lastAt,
        ...(chat.paused && { mode: "PAUSED_HUMAN", pausedUntil: addMinutes(now, 30) }),
        messages: {
          create: chat.messages.map(([sender, text], i) => ({ sender, text, createdAt: addMinutes(start, i * 2) })),
        },
      },
    });
  }

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

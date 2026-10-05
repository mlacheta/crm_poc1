// Herramientas de LUCIA (spec 04 §1.2). El teléfono / paciente / conversación NO vienen del modelo:
// se inyectan desde el contexto de la conversación para que el LLM no pueda operar sobre otro paciente.
import { tool } from "ai";
import { z } from "zod";
import { arToday } from "@/lib/dates";
import { formatARS, formatDate, formatTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { findAvailableSlots, holdSlot } from "@/lib/scheduling";
import { ACCEPTED_HEALTH_INSURANCES, HOURS_NOTE, STUDY_PREPARATION } from "./clinic-knowledge";

export type AgentContext = {
  clinicId: string;
  patientId: string;
  conversationId: string;
  now: Date;
};

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");
/** Cantidad máxima de turnos devueltos al modelo (el prompt le pide ofrecer hasta 3). */
const MAX_SLOTS_RETURNED = 9;

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1
    ? { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! }
    : { firstName: parts[0], lastName: null };
}

export function createLuciaTools(ctx: AgentContext) {
  return {
    check_availability: tool({
      description:
        "Consulta los turnos libres de consulta oftalmológica en un rango de fechas. Usala SIEMPRE antes de ofrecer horarios; nunca inventes turnos.",
      inputSchema: z.object({
        doctorId: z.string().optional().describe("ID del médico preferido (opcional)"),
        fromDate: ymd.describe("Fecha inicial (YYYY-MM-DD, hora Argentina)"),
        toDate: ymd.optional().describe("Fecha límite (YYYY-MM-DD). Por defecto, 7 días desde fromDate"),
      }),
      execute: async ({ doctorId, fromDate, toDate }) => {
        const slots = await findAvailableSlots({ clinicId: ctx.clinicId, doctorId, fromYmd: fromDate, toYmd: toDate, now: ctx.now });
        // Variedad: hasta 3 turnos por médico, en orden cronológico.
        const perDoctor = new Map<string, number>();
        const picked = slots.filter((s) => {
          const n = perDoctor.get(s.doctorId) ?? 0;
          perDoctor.set(s.doctorId, n + 1);
          return n < 3;
        });
        return {
          total: slots.length,
          slots: picked.slice(0, MAX_SLOTS_RETURNED).map((s) => ({
            doctorId: s.doctorId,
            doctor: s.doctorName,
            specialty: s.specialty,
            date: arToday(s.start),
            day: formatDate(s.start),
            time: formatTime(s.start),
            slotDateTime: s.start.toISOString(),
            fee: formatARS(s.fee),
          })),
        };
      },
    }),

    hold_appointment_slot: tool({
      description:
        "Reserva tentativamente por 15 minutos el turno que eligió el paciente. Pedí antes su nombre y obra social. Usá exactamente doctorId y slotDateTime devueltos por check_availability.",
      inputSchema: z.object({
        doctorId: z.string(),
        slotDateTime: z.string().describe("slotDateTime exacto devuelto por check_availability (ISO 8601)"),
        reason: z.string().optional().describe("Motivo de consulta resumido (triage)"),
        patientName: z.string().optional().describe("Nombre y apellido del paciente"),
        healthInsurance: z.string().optional().describe("Obra social / prepaga, o 'Particular'"),
      }),
      execute: async ({ doctorId, slotDateTime, reason, patientName, healthInsurance }) => {
        const start = new Date(slotDateTime);
        if (Number.isNaN(start.getTime())) return { ok: false, error: "slotDateTime inválido" };

        const result = await holdSlot({ clinicId: ctx.clinicId, patientId: ctx.patientId, doctorId, start, reason, now: ctx.now });
        if (!result.ok) {
          return {
            ok: false,
            error: result.error === "SLOT_NOT_AVAILABLE" ? "Ese turno ya no está disponible. Volvé a consultar disponibilidad." : "Médico inexistente.",
          };
        }

        await prisma.patient.update({
          where: { id: ctx.patientId },
          data: {
            currentStage: "RESERVA_TENTATIVA",
            ...(patientName && splitName(patientName)),
            ...(healthInsurance && { healthInsurance }),
          },
        });
        return {
          ok: true,
          appointmentId: result.appointmentId,
          doctor: result.slot.doctorName,
          day: formatDate(result.slot.start),
          time: formatTime(result.slot.start),
          fee: formatARS(result.slot.fee),
          heldUntil: formatTime(result.lockedUntil),
        };
      },
    }),

    generate_mercadopago_payment: tool({
      description: "Genera el pedido de pago de la consulta para confirmar un turno reservado con hold_appointment_slot.",
      inputSchema: z.object({
        appointmentId: z.string().describe("appointmentId devuelto por hold_appointment_slot"),
      }),
      execute: async ({ appointmentId }) => {
        const appointment = await prisma.appointment.findFirst({
          where: { id: appointmentId, patientId: ctx.patientId, status: "TENTATIVE_LOCKED", lockedUntil: { gt: ctx.now } },
          include: { doctor: true },
        });
        if (!appointment) return { ok: false, error: "No hay una reserva vigente con ese ID. Volvé a reservar el turno." };

        const amount = appointment.doctor.consultationFee;
        await prisma.$transaction([
          prisma.payment.upsert({
            where: { appointmentId },
            create: { appointmentId, amount, status: "PENDING" },
            update: { amount, status: "PENDING" },
          }),
          prisma.patient.update({ where: { id: ctx.patientId }, data: { currentStage: "PENDIENTE_PAGO" } }),
        ]);
        // TODO(Hito 4): crear la Preference de Mercado Pago y devolver el link real (init_point).
        return {
          ok: true,
          amount: formatARS(amount),
          paymentLink: null,
          note: "La integración con Mercado Pago se habilita en el Hito 4: decile al paciente que recepción le enviará el link de pago en breve y que el turno queda retenido 15 minutos.",
        };
      },
    }),

    escalate_to_human: tool({
      description:
        "Pausa a LUCIA y alerta a recepción. Obligatoria ante urgencias oftalmológicas (urgencyLevel EMERGENCY) o si el paciente pide hablar con una persona.",
      inputSchema: z.object({
        reason: z.string().describe("Motivo de la derivación"),
        urgencyLevel: z.enum(["LOW", "MEDIUM", "EMERGENCY"]),
      }),
      execute: async ({ reason, urgencyLevel }) => {
        await prisma.$transaction([
          // Sin vencimiento: LUCIA queda pausada hasta que recepción la reanude desde el Inbox.
          prisma.conversation.update({ where: { id: ctx.conversationId }, data: { mode: "PAUSED_HUMAN", pausedUntil: null } }),
          prisma.patient.update({ where: { id: ctx.patientId }, data: { currentStage: "DERIVADO_HUMANO" } }),
          prisma.message.create({
            data: {
              conversationId: ctx.conversationId,
              sender: "SYSTEM",
              text: `Derivado a recepción (${urgencyLevel}): ${reason}`,
            },
          }),
        ]);
        return { ok: true, urgencyLevel };
      },
    }),

    get_clinic_info: tool({
      description: "Información oficial de la clínica: ubicación, obras sociales, preparación para estudios o precios.",
      inputSchema: z.object({
        topic: z.enum(["UBICACION", "OBRAS_SOCIALES", "ESTUDIOS_PREPARACION", "PRECIOS"]),
      }),
      execute: async ({ topic }) => {
        const clinic = await prisma.clinic.findUniqueOrThrow({
          where: { id: ctx.clinicId },
          include: { doctors: { include: { user: { select: { fullName: true } } } } },
        });
        switch (topic) {
          case "UBICACION":
            return { name: clinic.name, address: clinic.address, phone: clinic.phone, note: HOURS_NOTE };
          case "OBRAS_SOCIALES":
            return { accepted: ACCEPTED_HEALTH_INSURANCES, particular: "También se atiende en forma particular." };
          case "ESTUDIOS_PREPARACION":
            return { studies: STUDY_PREPARATION };
          case "PRECIOS":
            return {
              consultas: clinic.doctors.map((d) => ({ doctor: d.user.fullName, specialty: d.specialty, fee: formatARS(d.consultationFee) })),
              note: `Valores de consulta particular al ${arToday(ctx.now)}. Con obra social puede corresponder sólo un copago.`,
            };
        }
      },
    }),
  };
}

export type LuciaTools = ReturnType<typeof createLuciaTools>;

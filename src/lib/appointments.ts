import type { AppointmentStatus } from "@/generated/prisma/enums";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  TENTATIVE_LOCKED: "Reserva tentativa",
  CONFIRMED: "Confirmado",
  COMPLETED: "Atendido",
  RESCHEDULED: "Reprogramado",
  CANCELLED: "Cancelado",
  NO_SHOW: "No asistió",
};

export const APPOINTMENT_STATUS_VARIANT: Record<AppointmentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  TENTATIVE_LOCKED: "outline",
  CONFIRMED: "default",
  COMPLETED: "secondary",
  RESCHEDULED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

import type { AppointmentStatus } from "@/generated/prisma/enums";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  TENTATIVE_LOCKED: "Reserva tentativa",
  CONFIRMED: "Confirmado",
  COMPLETED: "Atendido",
  RESCHEDULED: "Reprogramado",
  CANCELLED: "Cancelado",
  NO_SHOW: "No asistió",
};

export type StatusVariant = "secondary" | "outline" | "destructive" | "success" | "warning";

export const APPOINTMENT_STATUS_VARIANT: Record<AppointmentStatus, StatusVariant> = {
  TENTATIVE_LOCKED: "warning",
  CONFIRMED: "success",
  COMPLETED: "secondary",
  RESCHEDULED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

import type { PipelineStage } from "@/generated/prisma/enums";

// Columnas del Kanban según PRD §4.3. Cada columna agrupa una o más etapas del enum;
// al soltar una tarjeta en una columna, el paciente pasa a la etapa `dropStage`.
export const PIPELINE_COLUMNS = [
  { id: "nuevo", title: "Nuevo contacto", stages: ["NUEVO_LEAD"], dropStage: "NUEVO_LEAD" },
  {
    id: "conversando",
    title: "Conversando con LUCIA",
    stages: ["EN_CONVERSACION_IA", "DERIVADO_HUMANO", "LEAD_PENDIENTE_RESPUESTA", "RESERVA_TENTATIVA"],
    dropStage: "EN_CONVERSACION_IA",
  },
  { id: "pago", title: "Pendiente de pago", stages: ["PENDIENTE_PAGO"], dropStage: "PENDIENTE_PAGO" },
  { id: "confirmado", title: "Turno confirmado", stages: ["TURNO_CONFIRMADO"], dropStage: "TURNO_CONFIRMADO" },
  { id: "recordatorio", title: "Recordatorio 24h enviado", stages: ["RECORDATORIO_24H_ENVIADO"], dropStage: "RECORDATORIO_24H_ENVIADO" },
  { id: "espera", title: "En espera / en consulta", stages: ["EN_SALA_DE_ESPERA"], dropStage: "EN_SALA_DE_ESPERA" },
  { id: "atendido", title: "Atendido", stages: ["ATENDIDO"], dropStage: "ATENDIDO" },
  { id: "perdido", title: "No show / cancelado", stages: ["NO_SHOW", "CANCELADO"], dropStage: "CANCELADO" },
] as const satisfies readonly {
  id: string;
  title: string;
  stages: readonly PipelineStage[];
  dropStage: PipelineStage;
}[];

export type PipelineColumnId = (typeof PIPELINE_COLUMNS)[number]["id"];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  NUEVO_LEAD: "Nuevo lead",
  EN_CONVERSACION_IA: "Conversando con IA",
  DERIVADO_HUMANO: "Derivado a humano",
  LEAD_PENDIENTE_RESPUESTA: "Sin respuesta",
  RESERVA_TENTATIVA: "Reserva tentativa",
  PENDIENTE_PAGO: "Pendiente de pago",
  TURNO_CONFIRMADO: "Turno confirmado",
  RECORDATORIO_24H_ENVIADO: "Recordatorio enviado",
  EN_SALA_DE_ESPERA: "En sala de espera",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
  NO_SHOW: "No show",
};

/** Color de la etiqueta de etapa: alerta = espera una acción, peligro = urgencia o pérdida. */
export const STAGE_VARIANT: Record<PipelineStage, "secondary" | "success" | "warning" | "destructive"> = {
  NUEVO_LEAD: "secondary",
  EN_CONVERSACION_IA: "secondary",
  DERIVADO_HUMANO: "destructive",
  LEAD_PENDIENTE_RESPUESTA: "warning",
  RESERVA_TENTATIVA: "warning",
  PENDIENTE_PAGO: "warning",
  TURNO_CONFIRMADO: "success",
  RECORDATORIO_24H_ENVIADO: "success",
  EN_SALA_DE_ESPERA: "secondary",
  ATENDIDO: "secondary",
  CANCELADO: "destructive",
  NO_SHOW: "destructive",
};

export function columnForStage(stage: PipelineStage): PipelineColumnId {
  return PIPELINE_COLUMNS.find((c) => (c.stages as readonly PipelineStage[]).includes(stage))!.id;
}

export const UTM_LABELS: Record<string, string> = {
  facebook: "Meta Ads (Facebook)",
  instagram: "Meta Ads (Instagram)",
  google_ads: "Google Ads",
  organic: "Orgánico",
  simulador: "Simulador (prueba)",
};

export const utmLabel = (source: string | null) => (source ? (UTM_LABELS[source] ?? source) : "Sin atribución");

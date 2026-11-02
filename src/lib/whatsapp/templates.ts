// Plantillas que cada WABA necesita para escribir fuera de la ventana de 24 h (spec 04 §2).
// Se crean al conectar la cuenta; Meta las aprueba aparte (suele tardar minutos). El envío es del Hito 10.
import type { TemplateDef } from "./graph";

export const REQUIRED_TEMPLATES: TemplateDef[] = [
  {
    name: "recordatorio_turno_24h",
    language: "es_AR",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, te recordamos tu turno oftalmológico con el Dr. {{2}} mañana {{3}} a las {{4}} hs en {{5}}. Por favor confirmá tu asistencia.",
        example: { body_text: [["María", "Pérez", "martes 4", "10:30", "Sede Palermo"]] },
      },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirmar asistencia" }, { type: "QUICK_REPLY", text: "Reprogramar" }] },
    ],
  },
  {
    name: "reactivacion_lead_pendiente_24h",
    language: "es_AR",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Hola {{1}}, ¿cómo estás? Notamos que no terminamos de coordinar tu consulta oftalmológica. ¿Te gustaría ver los horarios disponibles para esta semana?",
        example: { body_text: [["María"]] },
      },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Ver horarios" }, { type: "QUICK_REPLY", text: "Hablar con secretaría" }] },
    ],
  },
];

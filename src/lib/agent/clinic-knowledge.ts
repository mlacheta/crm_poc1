// Información estática que LUCIA puede citar (get_clinic_info).
// TODO(admin): mover obras sociales y preparación de estudios a configuración editable por clínica.

export const ACCEPTED_HEALTH_INSURANCES = [
  "OSDE",
  "Swiss Medical",
  "Galeno",
  "Medifé",
  "OMINT",
  "IOMA",
  "PAMI",
] as const;

export const STUDY_PREPARATION: Record<string, string> = {
  "Fondo de ojo": "Se dilata la pupila: venir acompañado y no manejar por 4 a 6 horas. La visión queda borrosa y sensible a la luz.",
  "Graduación / refracción": "No usar lentes de contacto blandas 48 h antes. Traer los anteojos actuales.",
  "Topografía corneal": "Suspender lentes de contacto blandas 7 días antes y rígidas 21 días antes.",
  "Campo visual": "Traer los anteojos de cerca. El estudio dura unos 30 minutos.",
  "OCT (tomografía de retina)": "No requiere preparación especial; a veces se indica dilatación.",
};

export const HOURS_NOTE = "Atención con turno previo. Para urgencias fuera de horario, acudir a la guardia oftalmológica más cercana.";

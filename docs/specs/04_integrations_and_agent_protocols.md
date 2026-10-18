# LUCIA — Tu Recepcionista Oftalmológica Virtual con IA
## 04. Protocolos de Integración, Agente IA y Webhooks

---

### 1. Protocolo del Agente IA (LUCIA) y Tool Calling

#### 1.1. System Prompt & Guardrails Oftalmológicos
```markdown
Eres LUCIA, la recepcionista virtual inteligente del Centro Oftalmológico.
Tu misión es atender a los pacientes de forma cálida, empática, eficiente y profesional a través de WhatsApp.

REGLAS PRIMORDIALES:
1. TRIAGE Y URGENCIAS:
   - Si el paciente menciona: dolor ocular agudo, pérdida repentina de visión, destellos de luz con sombras, traumatismo o cuerpo extraño en el ojo:
     DEBES ejecutar la herramienta 'escalate_to_human' con prioridad 'EMERGENCY' e indicarle al paciente que acuda a la guardia de inmediato o espere contacto telefónico prioritario.
2. AGENDAMIENTO:
   - Averigua el motivo de consulta (control de rutina, estudios, anteojos) y si tiene obra social/prepaga (con su PLAN) o es particular.
   - Si tiene obra social, ejecuta 'check_coverage' y explica cómo se cobra (sin cargo, copago, seña o particular). Si la clínica no la atiende, ofrece atenderse como particular. Pide el número de afiliado si la regla lo requiere.
   - Consulta disponibilidad usando 'check_availability'. Ofrece máximo 3 opciones claras.
   - Cuando el paciente elija un horario, ejecuta 'hold_appointment_slot'.
   - Si 'hold_appointment_slot' indica que hay que pagar, ejecuta 'generate_mercadopago_payment'. Si el turno queda confirmado sin cargo o pendiente de autorización, informalo sin pedir pago.
3. FORMATO:
   - Respuestas breves, fluidas, divididas en párrafos cortos (estilo WhatsApp).
   - No des diagnósticos médicos definitivos ni indiques colirios con corticoides o antibióticos.
   - No des consejos de tratamiento ni de alivio (gotas, lágrimas artificiales, compresas, remedios caseros): ante síntomas, ofrece una consulta; si hay signos de urgencia, aplica la regla 1.
```

#### 1.2. Herramientas (Function Calling) que invoca LUCIA

```json
[
  {
    "name": "check_availability",
    "description": "Consulta los horarios disponibles para consulta oftalmológica en un rango de fechas.",
    "parameters": {
      "type": "object",
      "properties": {
        "doctorId": { "type": "string", "description": "ID opcional del médico preferido" },
        "fromDate": { "type": "string", "format": "date", "description": "Fecha inicial (YYYY-MM-DD)" },
        "toDate": { "type": "string", "format": "date", "description": "Fecha límite (YYYY-MM-DD)" }
      },
      "required": ["fromDate"]
    }
  },
  {
    "name": "hold_appointment_slot",
    "description": "Bloquea temporalmente un turno por 15 minutos para que el paciente proceda al pago.",
    "parameters": {
      "type": "object",
      "properties": {
        "patientPhone": { "type": "string" },
        "doctorId": { "type": "string" },
        "slotDateTime": { "type": "string", "format": "date-time" },
        "reason": { "type": "string" },
        "patientName": { "type": "string" },
        "healthInsurance": { "type": "string" }
      },
      "required": ["patientPhone", "doctorId", "slotDateTime"]
    }
  },
  {
    "name": "generate_mercadopago_payment",
    "description": "Genera un enlace de pago de Mercado Pago por la consulta o seña.",
    "parameters": {
      "type": "object",
      "properties": {
        "appointmentId": { "type": "string" },
        "amount": { "type": "number" },
        "patientEmail": { "type": "string" }
      },
      "required": ["appointmentId", "amount"]
    }
  },
  {
    "name": "escalate_to_human",
    "description": "Pausa a LUCIA y alerta a la secretaria para intervención inmediata.",
    "parameters": {
      "type": "object",
      "properties": {
        "reason": { "type": "string" },
        "urgencyLevel": { "type": "string", "enum": ["LOW", "MEDIUM", "EMERGENCY"] }
      },
      "required": ["reason", "urgencyLevel"]
    }
  },
  {
    "name": "check_coverage",
    "description": "(Hito 11) Resuelve cómo se cobra la consulta según la obra social y el plan del paciente (tabla de coberturas, PRD §4.4.1) y la guarda en el paciente.",
    "parameters": {
      "type": "object",
      "properties": {
        "healthInsurance": { "type": "string", "description": "Obra social/prepaga tal como la escribió el paciente, o Particular" },
        "plan": { "type": "string", "description": "Plan, si lo informó" },
        "affiliateNumber": { "type": "string" }
      },
      "required": ["healthInsurance"]
    }
  },
  {
    "name": "get_clinic_info",
    "description": "Devuelve información oficial de la clínica (ubicación, obras sociales, preparación para estudios).",
    "parameters": {
      "type": "object",
      "properties": {
        "topic": { "type": "string", "enum": ["UBICACION", "OBRAS_SOCIALES", "ESTUDIOS_PREPARACION", "PRECIOS"] }
      },
      "required": ["topic"]
    }
  }
]
```

#### 1.3. Notas de implementación (Hito 3)

- **Contexto inyectado, no provisto por el modelo**: `hold_appointment_slot` no recibe `patientPhone` y `generate_mercadopago_payment` no recibe `amount`. El paciente sale de la conversación y el monto del arancel del médico (`DoctorProfile.consultationFee`), para que el LLM no pueda operar sobre otro paciente ni cambiar el precio.
- **Anti doble-booking**: la reserva corre en una transacción `Serializable` de PostgreSQL que recalcula los turnos libres; de dos pedidos simultáneos del mismo turno sólo uno lo obtiene. Una reserva nueva libera las tentativas previas del mismo paciente.
- **`escalate_to_human`** pausa a LUCIA sin vencimiento (hasta que recepción la reanude) y deja un mensaje de sistema en el chat.
- **Proveedor de LLM** configurable (`LLM_PROVIDER`: `mock` | `google` | `anthropic` | `openai`) vía Vercel AI SDK. `mock` es un modelo de reglas para pruebas sin API key que ejecuta las mismas herramientas.
- **Mercado Pago** (Hito 11): por ahora `generate_mercadopago_payment` registra el pago `PENDING` y no devuelve link. Desde el Hito 6 y hasta el 11, LUCIA deja de usarla: el turno se confirma al reservarse y se cobra en la clínica.
- **Sedes** (Hito 4, PRD §4.7): si la clínica tiene más de una sede, LUCIA pregunta cuál prefiere el paciente. `check_availability` acepta un `locationId` opcional (sin él, busca en todas) y cada turno devuelto informa su sede. `hold_appointment_slot` toma la sede del horario del médico. `get_clinic_info` con `UBICACION` lista las sedes. El prompt incluye las sedes y los horarios de cada médico por sede.
- **Coberturas** (Hito 11): `hold_appointment_slot` aplicará la regla de cobertura del paciente, guardará el snapshot en el turno y devolverá el siguiente paso: `PAY` (con monto), `CONFIRMED` (sin cargo) o `PENDING_AUTHORIZATION`. `generate_mercadopago_payment` cobrará el monto del snapshot. `get_clinic_info` con `OBRAS_SOCIALES` leerá la tabla de coberturas en lugar de la lista fija actual.

---

### 2. Integración WhatsApp (Meta Cloud API) y Políticas de Ventana 24h

Meta impone la regla de la **Ventana de 24 horas**:
1. **Dentro de las 24 horas del último mensaje del usuario**:
   - LUCIA responde libremente con mensajes de texto estándar y mensajes interactivos (botones/listas).
2. **Fuera de la ventana de 24 horas (Recordatorios y Reactivación)**:
   - Es obligatorio el uso de **Message Templates pre-aprobados** por Meta bajo categoría `UTILITY`.

#### Templates Requeridos:
- **`recordatorio_turno_24h`**:
  > *"Hola {{1}}, te recordamos tu turno oftalmológico con el Dr. {{2}} mañana {{3}} a las {{4}} hs en {{5}}. Por favor confirma tu asistencia."*
  > *Botones interactivos: [Confirmar Asistencia] [Reprogramar]*
- **`reactivacion_lead_pendiente_24h`**:
  > *"Hola {{1}}, ¿cómo estás? Notamos que no terminamos de coordinar tu consulta oftalmológica. ¿Te gustaría ver los horarios disponibles para esta semana?"*
  > *Botones interactivos: [Ver Horarios] [Hablar con Secretaría]*

---

### 3. Pasarela de Pagos (Mercado Pago)

- **Creación de Preference**:
  ```typescript
  const preference = await new Preference(client).create({
    body: {
      items: [{
        id: appointment.id,
        title: `Consulta Oftalmológica - ${doctor.name}`,
        quantity: 1,
        unit_price: clinicPrice,
        currency_id: 'ARS'
      }],
      back_urls: {
        success: `${BASE_URL}/booking/success?appointmentId=${appointment.id}`,
        failure: `${BASE_URL}/booking/failed?appointmentId=${appointment.id}`
      },
      auto_return: 'approved',
      expires: true,
      date_of_expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
      notification_url: `${BASE_URL}/api/webhooks/mercadopago`
    }
  });
  ```
- **Procesamiento de Webhook**:
  1. Recibe notificación `payment.created` o `payment.updated`.
  2. Valida la firma `x-signature` enviada por Mercado Pago.
  3. Si `status === 'approved'`:
     - Transiciona el turno a `CONFIRMED`.
     - Gatilla la emisión de factura en ARCA.
     - Encola mensaje por WhatsApp de confirmación con detalles y mapa.

---

### 4. Integración Fiscal ARCA (ex-AFIP WSFEv1)

1. **Autenticación (WSAA)**:
   - Genera CMS (PKCS#7) firmado con clave privada y certificado emitido por ARCA.
   - Solicita Ticket de Acceso (Token + Sign) al servicio WSAA.
   - Almacena el Token en Redis con TTL de 11 horas.
2. **Emisión de Comprobante (WSFEv1)**:
   - Invoca método SOAP `FECAESolicitar`:
     - Punto de Venta (ej. 4).
     - Tipo de comprobante (11 para Factura C, 6 para Factura B).
     - Concepto: 2 (Servicios).
     - Fechas de servicio (desde / hasta = fecha de consulta o pago).
     - CUIT/DNI del receptor o 0 (Consumidor Final).
3. **Respuesta y QR Reglamentario**:
   - Recibe CAE y Fecha de Vto CAE.
   - Genera cadena Base64 con especificación oficial de ARCA:
     `{"ver":1,"fecha":"2026-09-30","cuit":20300000001,"ptoVta":4,"tipoCmp":11,"nroCmp":1205,"importe":25000,"moneda":"PES","ctz":1,"tipoDocRec":99,"nroDocRec":0,"tipoCodAut":"E","codAut":74125896321456}`
   - URL del QR: `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`
   - Almacena en BD y permite descarga/envío al paciente.

---

### 5. Arquitectura de Recordatorios Diferidos (BullMQ + Redis)

- **Worker de Reactivación (Lead Frío)**:
  - Cuando un lead deja de responder en medio de una reserva, se programa un Job en la cola `followup-queue` con `delay = 24 * 60 * 60 * 1000`.
  - Si el paciente responde antes, el Job es cancelado (`removeJob`).
  - Si el Job expira, ejecuta el envío del Template de Reactivación.
- **Worker de Recordatorio Pre-Turno**:
  - Al confirmarse el turno, se programa un Job en `appointment-reminder-queue` calculado exactamente para `startDateTime - 24 horas`.
  - Ejecuta el envío del Template de Confirmación con botones.

---

### 6. Identificación del Paciente, Notificaciones y Google Calendar (Hitos 5 a 9)

#### 6.1. Cambios en el flujo de LUCIA (PRD §4.10)
- La conversación es con un **contacto** (el celular que escribe), no con un paciente: el celular no identifica a nadie.
- La **intención** de cada mensaje la clasifica el LLM (sacar, reprogramar o cancelar turno; información; urgencia; hablar con una persona). En producción se usa un proveedor real; `mock` queda sólo para pruebas.
- Reglas nuevas del system prompt:
  - Información general: se responde sin pedir identificación.
  - Antes de ofrecer turnos: preguntar para quién es el turno y validar a esa persona con `identify_patient` (nombre, apellido, DNI y sexo).
  - Validado el paciente: preguntar si prefiere mañana o tarde y buscar con `check_availability` en ese rango.
  - Nunca enumerar los pacientes o turnos asociados al celular, ni leerle al contacto los datos guardados para que los confirme.
- La regla de urgencias (regla 1) se aplica antes que cualquier identificación.

#### 6.2. Herramientas nuevas o modificadas

| Herramienta | Entrada | Resultado |
| :--- | :--- | :--- |
| `identify_patient` (nueva) | `firstName`, `lastName`, `dni`, `sex` (`F`, `M` o `X`) | `VERIFIED` + `patientRef` (referencia opaca, válida sólo en esta conversación) o `NOT_FOUND` + link de registro. La respuesta es la misma si el DNI no existe o si existe con otros datos. |
| `check_availability` | + `timeOfDay`: `MORNING` \| `AFTERNOON` \| `ANY` | Turnos en ese rango, según el corte de la clínica (`morningEndsAt`) |
| `hold_appointment_slot` | + `patientRef` (de `identify_patient`); sin `patientName` ni `healthInsurance` | Reserva para ese paciente; registra `bookedByContactId` y `source = WHATSAPP`. Rechaza un `patientRef` que no fue validado en esta conversación. |

- Un contacto puede validar a varios pacientes en la misma conversación (ej. dos hijos) y reservar para cada uno.
- Una validación vale para la conversación en curso; si pasan 24 h sin actividad, se vuelve a pedir.
- Tres intentos fallidos de validación por conversación y por día derivan a recepción.
- Al validar, se crea o actualiza el vínculo `ContactPatient` (`lastVerifiedAt`).

#### 6.3. Servicio único de turnos
Las herramientas de LUCIA, el portal web y el CRM llaman a las mismas funciones del backend (`src/lib/scheduling.ts` y su sucesor): disponibilidad, reserva serializable, cobertura y cobro, cancelación y reprogramación. Ningún canal implementa reglas de agenda propias; sólo cambia `source` y quién inicia la acción.

#### 6.4. Email transaccional
- Proveedor de email transaccional con API (ej. Resend o Amazon SES) y dominio propio verificado (SPF/DKIM) para no caer en spam.
- Plantillas: `bienvenida` (registro completo, "ya podés sacar turno"), `codigo_verificacion`, `turno_reservado` (con link de pago si corresponde), `turno_confirmado`, `turno_reprogramado`, `turno_cancelado`.
- `turno_reservado` y `turno_confirmado` incluyen el botón **"Agregar a Google Calendar"** (link `https://calendar.google.com/calendar/render?action=TEMPLATE&…` con título, fecha, dirección y detalles) y un adjunto `.ics` para otros calendarios.
- Cada envío se registra en `Notification` (spec 03 §5). Un fallo de email no cancela la reserva: queda registrado y visible en el CRM.

#### 6.5. Google Calendar de los médicos
- OAuth 2.0 de Google por médico, con el permiso mínimo para crear y editar eventos (`calendar.events`). El refresh token se guarda cifrado (`DoctorCalendarConnection`).
- Eventos: se crean al confirmar el turno y se actualizan o eliminan al reprogramarlo o cancelarlo; el id queda en `Appointment.googleEventId`.
- Si Google rechaza la operación (token revocado, calendario borrado), la conexión pasa a `ERROR`, el turno sigue válido en LUCIA y el médico ve un aviso para reconectar.
- Contenido del evento: nombre del paciente, sede y consultorio; nunca el motivo de consulta ni datos clínicos (PRD §4.12).
- Para usar este permiso con médicos de cualquier clínica, Google exige verificar la app de OAuth (pantalla de consentimiento, política de privacidad, dominio): es un trámite que puede llevar semanas.

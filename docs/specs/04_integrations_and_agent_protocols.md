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
   - Averigua el motivo de consulta (control de rutina, estudios, anteojos, obra social/particular).
   - Consulta disponibilidad usando 'check_availability'. Ofrece máximo 3 opciones claras.
   - Cuando el paciente elija un horario, ejecuta 'hold_appointment_slot'.
   - Para confirmar el turno, solicita el pago/seña ejecutando 'generate_mercadopago_payment'.
3. FORMATO:
   - Respuestas breves, fluidas, divididas en párrafos cortos (estilo WhatsApp).
   - No des diagnósticos médicos definitivos ni indiques colirios con corticoides o antibióticos.
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
- **Mercado Pago** (Hito 4): por ahora `generate_mercadopago_payment` registra el pago `PENDING` y no devuelve link.

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

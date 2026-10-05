# LUCIA — Tu Recepcionista Oftalmológica Virtual con IA
## 01. Documento de Requisitos de Producto (PRD)

---

### 1. Visión y Propósito del Producto
**LUCIA** es una plataforma SaaS integral (Recepcionista IA + CRM Clínico Oftalmológico) diseñada para clínicas y consultorios oftalmológicos de Argentina y LATAM. 
Automatiza el ciclo completo del paciente: desde la captación multicanal (tráfico orgánico y campañas de Meta Ads/Google Ads), atención médica conversacional 24/7 por WhatsApp, calificación y triage oftalmológico, reserva y cobro de consulta/seña (vía Mercado Pago), facturación fiscal automática (ARCA/ex-AFIP), hasta el seguimiento post-consulta (recordatorios, reducción de ausentismo y solicitud de reseñas).

---

### 2. Benchmarks y Análisis Competitivo

| Feature / Dimensión | SoyLidia.com (Referente IA) | DrApp (Referente CRM Clínico) | Robotina.pro (Referente Bot) | **LUCIA (Nuestra Propuesta)** |
| :--- | :--- | :--- | :--- | :--- |
| **Atención WhatsApp 24/7** | Sí (IA conversacional) | No (recordatorios básicos) | Sí (flujos predefinidos/bot) | **Sí (IA LLM con Triage Oftalmológico)** |
| **Pipeline CRM por Estados** | Sí (leads, citas) | Básico (Agenda tradicional) | No (panel de chat) | **Sí (Kanban completo + Roles)** |
| **Pasarela Mercado Pago integrada** | Sí (señas / prepago) | Sí (link de pago) | No | **Sí (Links automáticos + Webhooks)** |
| **Facturación Fiscal ARCA (ex-AFIP)**| No nativa en AR | Sí (Factura electrónica CAE) | No | **Sí (100% nativa automática con CAE)** |
| **Especialidad de Nicho** | Clínicas generales / estética | Medicina general / policonsultorios | Médicos en general | **Oftalmología (Triage, estudios, recetas)** |
| **Recuperación de Leads / Recordatorios**| Sí | Recordatorio de turno | Recordatorio de turno | **Dual: Reactivación 24h sin respuesta + Recordatorio 24h previo turno** |

---

### 3. Roles de Usuario y Permisos (RBAC)

1. **Secretaria / Recepción**:
   - Visualización de la agenda diaria/semanal por médico y consultorio.
   - Pipeline CRM (Kanban) de pacientes: contactados, agendados, pendientes de pago, confirmados, en sala de espera, atendidos.
   - Inbox unificado de WhatsApp con opción de "Intervención Humana" (pausar temporalmente a LUCIA).
   - Generación manual de turnos o reprogramaciones.
   
2. **Médico Oftalmólogo**:
   - Vista simplificada de su agenda personal de turnos del día.
   - Historial y ficha rápida del paciente (motivo de consulta informado a LUCIA).
   - *Fase 2*: Carga de evolución médica/expediente oftalmológico (agudeza visual, presión intraocular, etc.) y emisión de recetas.

3. **Marketing / Growth**:
   - Métricas de adquisición de campañas (atribución por enlace o número/anuncio de origen).
   - Tasa de conversión: Lead entrante ➔ Turno reservado ➔ Pago completado ➔ Asistencia efectiva.
   - Reporte de pacientes reactivados vs. perdidos.

4. **Administrador / Dueño de Clínica**:
   - Configuración de médicos, agendas, consultorios, tarifas y la tabla de coberturas por obra social y plan (ver 4.4.1).
   - Integración fiscal ARCA (Certificado digital, Punto de Venta, tipo de factura B/C).
   - Facturación consolidada y reportes financieros (Mercado Pago reconciliado).

---

### 4. Requisitos Funcionales Detallados

#### 4.1. Agente Conversacional WhatsApp (LUCIA AI)
- **Atención Inbound 24/7**:
  - Detección de intención del paciente: Solicitar turno, consultar precio, pedir información de estudios (ej. fondo de ojo, refracción, campo visual, topografía), ubicación, obras sociales aceptadas.
  - LUCIA no da consejos de tratamiento ni de alivio (gotas, lágrimas artificiales, compresas, remedios caseros): ante síntomas sólo ofrece una consulta, o aplica el triage si hay signos de urgencia.
  - Triage inteligente: Detecta urgencias oftalmológicas (pérdida súbita de visión, dolor agudo, trauma ocular, destellos/cuerpos extraños) y deriva con alerta prioritaria a guardia/recepción humana.
- **Flujo de Agendamiento Inteligente**:
  - Consulta disponibilidad de slots en tiempo real.
  - Bloqueo transitorio (slot lock de 15 minutos) mientras el paciente abona la seña o consulta.
- **Intervención Humana Transparente**:
  - Si un operador toma el chat desde el panel, LUCIA entra en modo `PAUSED` para esa conversación. Si no hay actividad humana durante $X$ minutos o el operador libera el chat, LUCIA vuelve a activarse.

#### 4.2. Motor de Recordatorios y Reactivación
- **Regla 1 (Reactivación de Conversaciones Pendientes)**:
  - Si un paciente inició una consulta o se quedó en medio del agendamiento y no responde durante 24 horas, LUCIA envía un mensaje proactivo y amable de seguimiento para retomar el flujo.
- **Regla 2 (Confirmación de Turno Pre-Consulta)**:
  - 24 horas antes del turno, LUCIA envía recordatorio por WhatsApp con botones interactivos (`Confirmar Asistencia`, `Reprogramar`, `Cancelar`).
  - Si cancela o reprograma con suficiente anticipación, el slot queda libre automáticamente en el calendario.

#### 4.3. CRM y Pipeline Visual
- Columnas del Pipeline (Kanban personalizable):
  1. `Nuevo Contacto / Lead` (Ingreso por campaña u orgánico)
  2. `Conversando con LUCIA` (Triage / Selección de horario)
  3. `Pendiente de Pago` (Link de Mercado Pago enviado)
  4. `Turno Confirmado` (Pago verificado o confirmado por secretaria)
  5. `Recordatorio 24h Enviado`
  6. `En Espera / En Consulta`
  7. `Atendido / Completado`
  8. `No Show / Cancelado`
- Filtros por médico, sede/consultorio, canal de origen y rango de fechas.

#### 4.4. Pasarela de Pagos (Mercado Pago)
- Generación automática de `Preference` o link de pago por el monto de la consulta o seña fijada por la clínica.
- Recepción de Webhooks con validación de estado (`approved`, `rejected`, `in_process`).
- Al confirmarse el pago:
  - Se confirma el turno de forma definitiva.
  - Se gatilla la emisión de la factura electrónica si está configurada la facturación automática.
  - Se envía mensaje de confirmación con fecha, hora, ubicación en Google Maps e instrucciones previas (ej. "venir sin lentes de contacto si es para graduación", "acompañado si incluye dilatación pupilar").

#### 4.4.1. Reglas de Cobro por Obra Social y Plan
El monto a cobrar (o si no se cobra) depende de la cobertura del paciente. La clínica mantiene una **tabla de coberturas**, editable por el Administrador, con una fila por obra social/prepaga y plan:

| Campo | Descripción |
| :--- | :--- |
| Obra social / prepaga | Ej. OSDE, Swiss Medical, PAMI. Incluye variantes de escritura ("o.s.d.e") para reconocer lo que escribe el paciente. |
| Plan | Ej. "210", "310". El valor "Todos los planes" aplica a cualquier plan sin fila propia. |
| Modalidad de cobro | Ver tabla siguiente. |
| Monto | Copago o seña en ARS (sólo para esas modalidades). |
| Requiere autorización previa | Si es "sí", recepción valida la credencial/autorización antes de confirmar el turno. |
| Requiere n° de afiliado | Si es "sí", LUCIA lo pide antes de reservar. |
| Notas | Indicaciones para recepción y LUCIA (ej. "traer orden médica"). |
| Activa | Permite desactivar una fila sin borrarla. |

| Modalidad | Qué informa LUCIA | Cobro | Confirmación del turno |
| :--- | :--- | :--- | :--- |
| `SIN_CARGO` | La consulta está cubierta. | Ninguno. | Inmediata al reservar (o tras la validación de recepción si requiere autorización). |
| `COPAGO` | Monto del copago. | Link de Mercado Pago por el copago. | Al aprobarse el pago. |
| `SENA` | Monto de la seña para retener el turno. | Link de Mercado Pago por la seña. | Al aprobarse el pago. |
| `PARTICULAR` | La cobertura no incluye la consulta; se atiende como particular. | Link por el arancel particular del médico. | Al aprobarse el pago. |
| `NO_ATIENDE` | La clínica no atiende esa obra social/plan; ofrece atenderse como particular. | — (si acepta particular, se aplica `PARTICULAR`). | — |

Reglas:
- **Resolución:** se busca la fila de la obra social con el plan exacto; si no existe, la fila "Todos los planes" de esa obra social. Si la obra social no está en la tabla, LUCIA **no promete cobertura**: ofrece atenderse como particular o deriva a recepción.
- **Sin obra social (particular):** se cobra el arancel particular del médico.
- **Requiere autorización:** el turno queda en reserva tentativa durante un plazo configurable por clínica (por defecto 24 h, en lugar de los 15 min del pago) y recepción lo confirma o rechaza desde el CRM. LUCIA le explica al paciente que recepción se va a comunicar.
- **Snapshot:** el turno guarda la modalidad y el monto aplicados al reservarlo; cambios posteriores en la tabla no alteran turnos ya reservados.
- **Pendiente de definir:** política de reintegro de la seña, y si estudios y prácticas (no consultas) tienen reglas de cobertura distintas.

#### 4.5. Facturación Fiscal Electrónica (ARCA / ex-AFIP)
- Conexión vía Web Service de Facturación Electrónica (WSFEv1).
- Manejo de certificados digitales (.crt y .key) y Punto de Venta específico para el sistema.
- Emisión automática o bajo demanda de Factura C o B a Consumidor Final (o con DNI/CUIT si el paciente lo solicita).
- Obtención del CAE (Código de Autorización Electrónico) y generación de comprobante con código QR reglamentario.
- Envío automático del comprobante en PDF por WhatsApp o enlace de descarga.

#### 4.6. Módulos Opcionales / Fase 2
- **Historia Clínica Oftalmológica Simplificada**: Ficha de antecedentes, agudeza visual (AV), refracción, presión ocular (PIO), biomicroscopía y fondo de ojo.
- **Recetas Médicas Digitales**: Generación de receta con firma digital/médica conforme a normativa vigente en Argentina.
- **Solicitud de Reseñas para Google Business**: 2 a 4 horas después de completada la consulta médica, si el estado es `Atendido`, LUCIA envía un mensaje invitando a dejar una calificación en Google Maps con link directo.

---

### 5. Requisitos No Funcionales (NFR)
- **Tiempo de Respuesta del Agente**: Respuestas de IA en WhatsApp en menos de 3 a 5 segundos (streaming/buffers de mensaje para experiencia natural).
- **Seguridad y Privacidad**: Cumplimiento de Ley de Protección de Datos Personales (Ley 25.326 en Argentina). Encriptación de datos médicos y confidenciales en reposo y en tránsito.
- **Disponibilidad**: SLA del 99.5% para webhooks de WhatsApp y motor de cobros.
- **Idempotencia**: Garantía de cero cobros duplicados y cero doble-booking de turnos mediante locks transaccionales.

---

### 6. Criterios de Aceptación del MVP (Fase 1)
1. Un paciente escribe por WhatsApp y es atendido de forma natural por LUCIA.
2. LUCIA ofrece horarios disponibles de un médico oftalmólogo y retiene el turno.
3. Se genera un link de Mercado Pago; al pagar, el turno se confirma y se sincroniza en el CRM.
4. El CRM muestra el paciente avanzando de fase en el pipeline en tiempo real.
5. El sistema envía el recordatorio 24 horas antes y el seguimiento a las 24 horas si no concretó.
6. Se emite la factura electrónica de prueba (Homologación ARCA) con CAE válido.

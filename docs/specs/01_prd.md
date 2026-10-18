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

Todos los roles, salvo Plataforma, pertenecen a una única clínica y sólo ven datos de ella (ver 4.7).

0. **Plataforma (equipo LUCIA)**:
   - Alta, suspensión y reactivación de clínicas, y alta de su primer Administrador.
   - Métricas operativas agregadas por clínica; sin acceso a datos de pacientes ni clínicos.

1. **Secretaria / Recepción**:
   - Visualización de la agenda por día, semana, mes y año, por médico y sede, sin motivo de consulta (ver 4.8).
   - Alta y edición manual de pacientes (ver 4.8).
   - Pipeline CRM (Kanban) de pacientes: contactados, agendados, pendientes de pago, confirmados, en sala de espera, atendidos.
   - Inbox unificado de WhatsApp con opción de "Intervención Humana" (pausar temporalmente a LUCIA).
   - Generación manual de turnos o reprogramaciones.
   
2. **Médico Oftalmólogo**:
   - Su agenda por día, semana, mes y año, y la edición de sus franjas horarias por sede (ver 4.8).
   - Conexión opcional de su Google Calendar para recibir sus turnos (ver 4.12).
   - Historial y ficha rápida del paciente (motivo de consulta informado a LUCIA).
   - *Fase 2 (postergado)*: Carga de evolución médica/expediente oftalmológico (agudeza visual, presión intraocular, etc.) y emisión de recetas.

3. **Marketing / Growth**:
   - Métricas de adquisición de campañas (atribución por enlace o número/anuncio de origen).
   - Tasa de conversión: Lead entrante ➔ Turno reservado ➔ Pago completado ➔ Asistencia efectiva.
   - Reporte de pacientes reactivados vs. perdidos.

4. **Administrador / Dueño de Clínica**:
   - Alta, edición y desactivación de los usuarios de su clínica (todos los roles).
   - Personalización y publicación de la página web de la clínica (ver 4.9).
   - Configuración de sedes, médicos, agendas por sede, consultorios, tarifas y la tabla de coberturas por obra social y plan (ver 4.4.1 y 4.7).
   - Integración fiscal ARCA (Certificado digital, Punto de Venta, tipo de factura B/C).
   - Facturación consolidada y reportes financieros (Mercado Pago reconciliado).

---

### 4. Requisitos Funcionales Detallados

#### 4.1. Agente Conversacional WhatsApp (LUCIA AI)
- **Atención Inbound 24/7**:
  - Detección de intención del paciente: Solicitar turno, consultar precio, pedir información de estudios (ej. fondo de ojo, refracción, campo visual, topografía), ubicación, obras sociales aceptadas.
  - LUCIA no da consejos de tratamiento ni de alivio (gotas, lágrimas artificiales, compresas, remedios caseros): ante síntomas sólo ofrece una consulta, o aplica el triage si hay signos de urgencia.
  - Triage inteligente: Detecta urgencias oftalmológicas (pérdida súbita de visión, dolor agudo, trauma ocular, destellos/cuerpos extraños) y deriva con alerta prioritaria a guardia/recepción humana.
- **Identificación previa:** para reservar, quien se atiende debe estar registrado y validado con nombre, apellido, DNI y sexo; se puede sacar turno para otra persona (ver 4.10).
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
- **Etapa actual:** los cobros se implementan después de toda la funcionalidad de operación (Hitos 11 y 12). Hasta entonces, todo turno queda confirmado al reservarse y se cobra en la clínica.
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

#### 4.6. Módulos Opcionales / Fase 2 (postergados)
- **Historia Clínica Oftalmológica Simplificada**: Ficha de antecedentes, agudeza visual (AV), refracción, presión ocular (PIO), biomicroscopía y fondo de ojo.
- **Recetas Médicas Digitales**: Generación de receta con firma digital/médica conforme a normativa vigente en Argentina.
- **Solicitud de Reseñas para Google Business**: 2 a 4 horas después de completada la consulta médica, si el estado es `Atendido`, LUCIA envía un mensaje invitando a dejar una calificación en Google Maps con link directo.


#### 4.7. Multi-clínica (SaaS) y Sedes
LUCIA se vende a varias clínicas. Cada clínica es un espacio aislado: sus usuarios, médicos, pacientes, conversaciones, turnos, pagos, coberturas y configuración no son visibles para ninguna otra.

**Alta de clínicas (rol Plataforma)**
- El equipo de LUCIA da de alta cada clínica desde un panel de plataforma: nombre, CUIT, identificador corto para su link (`slug`, ej. `centro-vision`) y el email de su primer Administrador, que recibe una contraseña inicial y debe cambiarla al ingresar.
- La plataforma puede suspender y reactivar una clínica. Una clínica suspendida no permite ingresar a sus usuarios y LUCIA no responde por su WhatsApp.
- El panel muestra por clínica sólo datos operativos agregados (cantidad de usuarios, sedes, pacientes, conversaciones del mes); **nunca datos de pacientes ni clínicos**.

**Usuarios por clínica**
- El Administrador de cada clínica da de alta, edita y desactiva a sus usuarios de todos los roles (Administrador, Secretaría, Médico, Marketing).
- Una persona que trabaja en dos clínicas (ej. un médico) tiene **una cuenta independiente en cada una**, creada por cada clínica, con su propia contraseña. No se comparten datos ni configuración entre esas cuentas.
- El email es único dentro de cada clínica, y puede repetirse entre clínicas.

**Ingreso**
- Pantalla de ingreso única con email y contraseña:
  - Si coinciden con una sola cuenta, entra directo a su clínica.
  - Si coinciden con cuentas de más de una clínica, elige a cuál entrar; sólo se listan las clínicas cuya contraseña coincidió.
  - Para cambiar de clínica, cierra sesión y vuelve a ingresar.
- Cada clínica tiene un link de ingreso para su equipo (`/c/<slug>/equipo`): muestra su nombre y entra directo a esa clínica. La dirección `/c/<slug>` es la página pública para pacientes (ver 4.9).
- Los mensajes de error no revelan si un email existe ni en qué clínicas.

**Sedes**
- Una clínica puede tener una o más sedes (ej. Palermo y Belgrano), cada una con nombre, dirección, teléfono y sus consultorios.
- Un médico puede atender en varias sedes de la misma clínica: su horario se define **por sede y por día** (ej. lunes en Palermo, miércoles en Belgrano).
- Cada turno pertenece a una sede. La agenda, el Pipeline y Marketing se filtran por sede.
- El paciente es de la clínica, no de la sede: puede atenderse en cualquiera.
- LUCIA pregunta en qué sede prefiere atenderse el paciente cuando la clínica tiene más de una, ofrece turnos de esa sede (o de todas, si le da igual) e informa la dirección de la sede del turno.
- El número de WhatsApp es de la clínica y atiende a todas sus sedes.
- Pendiente de definir: si cada sede factura con su propio punto de venta de ARCA.


#### 4.8. Agenda y Pacientes en el CRM
- **Horarios de atención por día:** cada médico define, por sede y por día de la semana, **una o más franjas** (ej. lunes 9:00–13:00 y 15:00–19:00 en Palermo). Las franjas de un mismo día no se superponen. Las edita el Administrador y también el propio médico sobre su agenda.
- **Vistas de la agenda:** se elige entre **Día** (lista de turnos con detalle), **Semana** (grilla de horas × días), **Mes** (calendario con la cantidad de turnos de cada día) y **Año** (los 12 meses con la carga de cada día). Desde Mes y Año, un clic en un día abre la vista Día. Filtros por médico y por sede.
- **Agenda para Secretaría:** ve la agenda de todos los médicos de su clínica, sin el motivo de consulta (dato clínico, spec 02 §4.2).
- **Alta manual de pacientes:** Secretaría y Administración dan de alta y editan pacientes desde el CRM (sección Pacientes), con los mismos datos que el registro web (4.9), incluido el sexo. Sirve para quien llama por teléfono o se presenta en la clínica.
- **Turnos manuales:** Secretaría crea, reprograma y cancela turnos desde la agenda, con el mismo servicio de turnos que usan LUCIA y la web (4.9).

#### 4.9. Portal Web de la Clínica (Landing de Pacientes)
Cada clínica tiene una página pública propia en `/c/<slug>`, con su logo y su nombre, donde los pacientes se registran y sacan turno sin pasar por WhatsApp.

**Contenido y personalización** (lo configura el Administrador en Configuración → Página web):
- Logo, nombre, texto de bienvenida, sedes con dirección y mapa, teléfono, médicos con su especialidad y obras sociales con las que trabaja.
- Puede mostrar u ocultar los precios de la consulta particular.
- La página respeta la identidad visual de LUCIA (Hito 3.5) con el logo y el nombre de la clínica; publicar o despublicar la página es una opción del Administrador.

**Registro y edición de datos del paciente**
- Botón o pestaña **"Registrar un paciente"**: formulario con nombre, apellido, DNI, sexo, fecha de nacimiento, celular y email del paciente (opcionales si es menor o no tiene), obra social, plan y número de afiliado (o "Particular"). Se puede registrar a uno mismo o a otra persona (ej. un hijo).
- **Ingreso del contacto:** quien usa la web se identifica con su email y un **código de verificación** que recibe por email. Con eso ve los turnos que sacó y los pacientes que registró. El código se envía **sólo por email**, por seguridad: no por WhatsApp ni SMS, porque el celular puede cambiar de dueño.
- Un DNI no puede registrarse dos veces en la misma clínica. Si ya existe, el formulario indica comunicarse con recepción, sin mostrar los datos registrados.
- Al completar el registro, quien lo completó recibe un **email de bienvenida** que le confirma que ya puede sacar turno.

**Reserva de turnos en la web**
- Sólo se reserva para pacientes registrados, validados con nombre, apellido, DNI y sexo (4.10), para uno mismo o para otra persona.
- Mismo flujo que por WhatsApp: motivo de consulta, sede, preferencia de **mañana o tarde**, turnos disponibles en ese rango, elección y reserva; luego el cobro según la cobertura (PRD §4.4.1, Hito 11). Hasta entonces el turno queda confirmado al reservarse y se cobra en la clínica.
- Un único **servicio de turnos** en el backend atiende a la web, a LUCIA (WhatsApp) y al CRM: mismas reglas de disponibilidad, reserva sin doble-booking, cobertura y cobro (spec 02).
- El contacto ve los turnos que sacó y puede cancelarlos o reprogramarlos según la política de la clínica.

#### 4.10. Identificación del Paciente (WhatsApp y Web)
Se distinguen dos figuras:
- **Contacto:** quien se comunica, por WhatsApp (identificado por su celular) o por la web (identificado por su email verificado).
- **Paciente:** quien se atiende. Su identidad es **nombre, apellido, DNI y sexo** (F, M o X, como figura en el DNI).

**Reglas de identidad**
- El celular **no identifica a un paciente**: un número puede cambiar de dueño. Sirve para encontrar al contacto y sus pacientes asociados, pero toda reserva exige validar al paciente con sus cuatro datos.
- Un contacto puede sacar turno **para sí mismo o para otra persona** (ej. un padre para sus hijos), siempre informando nombre, apellido, DNI y sexo de quien se atiende.
- Validación: los cuatro datos deben coincidir con un paciente registrado de la clínica. Se comparan sin distinguir mayúsculas, tildes ni espacios; el DNI sin puntos.
- LUCIA identifica la **intención** de cada mensaje con IA (sacar, reprogramar o cancelar un turno; consultar información; urgencia; hablar con una persona). El modo *mock* sólo se usa para pruebas internas.

**Flujo para sacar turno**
1. Las **consultas de información** (precios, obras sociales, ubicación, estudios) no requieren identificación. Las **urgencias** se atienden antes que cualquier validación (regla 1 de la spec 04).
2. LUCIA pregunta **para quién es el turno** y pide nombre, apellido, DNI y sexo de esa persona.
3. **Los datos coinciden con un paciente registrado:** queda validado para esta conversación y se asocia al contacto. Si el mismo contacto pide otro turno para ese paciente en la misma conversación, no se vuelve a pedir.
4. **Los datos no coinciden con ningún paciente:** LUCIA responde siempre igual, sin revelar si el DNI existe: *"No encontramos un paciente con esos datos. Si es la primera vez, registralo en este link"* y envía el **link de registro** (formulario de 4.9). Si al registrarse el DNI ya existe con otros datos, el formulario lo rechaza e indica comunicarse con recepción.
5. Al completarse el registro, quien lo completó recibe el **email de bienvenida** y, dentro de la ventana de 24 h, LUCIA retoma la conversación para continuar con la reserva.
6. Validado el paciente, LUCIA pregunta si prefiere **mañana o tarde** y ofrece turnos en ese rango. Mañana = turnos que empiezan antes de las 13:00; tarde = desde las 13:00. Cada clínica puede cambiar el corte.

**Protección de datos**
- LUCIA nunca enumera los pacientes ni los turnos asociados a un celular: el nuevo dueño de un número no ve nada sin los cuatro datos del paciente.
- Nunca se le muestran al contacto los datos guardados para que los confirme.
- Hasta 3 intentos de validación fallidos por conversación y por día; después deriva a recepción.

**Edición de datos**
- Un contacto puede editar los datos de los pacientes que él mismo registró, salvo nombre, apellido, DNI y sexo. Para corregir esos datos, o para cambiar datos de un paciente que no registró, se pide a recepción.

#### 4.11. Notificaciones al Paciente
- **Al reservar un turno** (por WhatsApp, web o CRM), el **contacto que lo sacó** recibe la confirmación **por email y por WhatsApp** con fecha, hora, paciente, médico, sede, dirección e indicaciones previas. Si el paciente tiene email propio y distinto, también lo recibe.
  - Si el turno queda pendiente de pago, el aviso incluye el link de pago y el plazo; la confirmación definitiva sale al acreditarse (Hito 11). Hasta ese hito, los turnos se confirman al reservarse.
- El email incluye un botón **"Agregar a Google Calendar"** y un archivo `.ics` adjunto, que funciona también con Apple Calendar y Outlook.
- Cancelaciones y reprogramaciones también se notifican por email y WhatsApp.
- Mensajes de WhatsApp fuera de la ventana de 24 h requieren plantillas aprobadas por Meta (spec 04 §2).

#### 4.12. Sincronización con Google Calendar de los Médicos
- Cada médico puede **conectar su Google Calendar** desde LUCIA (autorización con su cuenta de Google) y elegir en qué calendario se cargan sus turnos.
- LUCIA crea, actualiza y elimina el evento cuando el turno se confirma, se reprograma o se cancela. La sincronización es en un solo sentido: LUCIA → Google.
- **Contenido del evento:** nombre del paciente, sede y consultorio. Nunca el motivo de consulta ni datos clínicos.
- *Posterior:* leer los eventos ocupados del calendario del médico para bloquear esos horarios en LUCIA (sincronización en dos sentidos).

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

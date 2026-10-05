# Casos de prueba manuales — LUCIA CRM (Hitos 1 a 3)

## Preparación

1. `npm run db:up` (Postgres + Redis) y `npm run dev` → http://localhost:3000
2. **Antes de cada suite:** `npm run db:seed` para volver a los datos demo. Borra todo lo que se haya cambiado.
3. Contraseña de todos los usuarios: `lucia1234`. Emails: `admin@`, `secretaria@`, `marketing@`, `laura.mendez@`, `martin.rossi@`, `carolina.paz@`, todos `@lucia.local`.
4. Los turnos del seed son **relativos a la fecha de ejecución** y caen en los días de atención de cada médico:

   | Médico | Atiende | Turnos del seed |
   | :--- | :--- | :--- |
   | Dra. Laura Méndez (20 min) | Lun–Vie 09:00–13:00 | Sofía Gómez 09:20, próximo día de atención (incluye hoy) · Valentina López 10:00, el día de atención siguiente · Ricardo Martínez 10:20, último día de atención antes de hoy · Daniel Acosta 09:00, el anterior a ese |
   | Dr. Martín Rossi (30 min) | Lun y Mié 14–19 · Vie 09–13 | Mónica Herrera, 1.er turno del próximo día de atención · Jorge Fernández, 2.º turno del último día de atención pasado · Hugo Benítez, 3.er turno del día de atención siguiente al próximo |
   | Dra. Carolina Paz (20 min) | Mar y Jue 10–18 · Sáb 09–12 | Florencia Ríos 1.er turno y Tomás Díaz 3.er turno, ambos el próximo día de atención |

5. Formato de cada caso: **Pasos** → **Resultado esperado**. Marcar ✅ / ❌ y anotar observaciones al final.

---

## 1. Autenticación y sesión (todos los roles)

**AUTH-01 · Login correcto por rol**
- Pasos: en `/login` entrar con cada uno de los 6 usuarios (cerrar sesión entre uno y otro).
- Esperado: cada uno aterriza en su inicio. Admin y Secretaría van a `/pipeline`, Médicos a `/agenda`, Marketing a `/marketing`. Arriba a la izquierda se ve el nombre y el rol del usuario.

**AUTH-02 · Contraseña incorrecta**
- Pasos: `secretaria@lucia.local` con la contraseña `mala`.
- Esperado: "Email o contraseña incorrectos." El email queda cargado en el campo y no se ingresa.

**AUTH-03 · Usuario inexistente**
- Pasos: `nadie@lucia.local` / `lucia1234`.
- Esperado: el mismo mensaje que AUTH-02, sin revelar si el email existe.

**AUTH-04 · Email con mayúsculas y espacios**
- Pasos: escribir ` Secretaria@LUCIA.local ` con espacios, si el navegador lo permite.
- Esperado: ingresa normalmente (el email se normaliza).

**AUTH-05 · Acceso sin sesión**
- Pasos: en una ventana de incógnito abrir `/pipeline`, `/admin` y `/`.
- Esperado: las tres redirigen a `/login`.

**AUTH-06 · Logout**
- Pasos: ingresar, tocar **Cerrar sesión** y después ir a `/pipeline` con el botón Atrás o por URL.
- Esperado: vuelve a `/login`; no se puede ver contenido protegido.

**AUTH-07 · `/login` con sesión activa**
- Pasos: logueado como Secretaría, abrir `/login`.
- Esperado: redirige a `/pipeline`.

**AUTH-08 · Sesión vieja tras resetear datos**
- Pasos: logueado como Secretaría, correr `npm run db:seed` en la terminal y recargar `/pipeline`.
- Esperado: lleva a `/login` sin bucle de redirecciones. Al ingresar de nuevo funciona.

**AUTH-09 · Usuario desactivado**
- Pasos: logueado como Secretaría, en `npm run db:studio` poner `isActive = false` a `secretaria@lucia.local` y recargar. Después intentar ingresar de nuevo.
- Esperado: al recargar lleva a `/login`, y el login falla con "Email o contraseña incorrectos." Volver a poner `isActive = true` al terminar.

---

## 2. Matriz de permisos (todos los roles)

**PERM-01 · Menú por rol**
- Pasos: ingresar con cada rol y mirar el menú lateral.
- Esperado:

  | Rol | Secciones visibles |
  | :--- | :--- |
  | Admin | Pipeline, Inbox WhatsApp, Simulador LUCIA, Agenda, Pacientes, Marketing, Configuración |
  | Secretaría | Pipeline, Inbox WhatsApp, Simulador LUCIA |
  | Médico | Agenda, Pacientes |
  | Marketing | Marketing |

**PERM-02 · Acceso directo por URL a secciones no permitidas**
- Pasos: con cada rol, escribir en la barra `/pipeline`, `/inbox`, `/simulador`, `/agenda`, `/pacientes`, `/marketing`, `/admin` y `/admin/medicos/nuevo`.
- Esperado: las secciones permitidas abren; las demás redirigen al inicio del rol, sin mostrar contenido ni un error.

**PERM-03 · Sección activa resaltada**
- Pasos: navegar por el menú.
- Esperado: el ítem de la sección actual se ve resaltado, también en las subpáginas (ej. `/inbox/<id>` resalta "Inbox WhatsApp").

---

## 3. Secretaría — Pipeline (Kanban)

Usuario: `secretaria@lucia.local`.

**SEC-PIPE-01 · Estado inicial del tablero**
- Pasos: abrir `/pipeline`.
- Esperado: 8 columnas con estas tarjetas (el número de la cabecera coincide):

  | Columna | Pacientes |
  | :--- | :--- |
  | Nuevo contacto (1) | +5491140001008 |
  | Conversando con LUCIA (4) | Néstor Molina, Camila Torres, Graciela Suárez, Lucía Romero |
  | Pendiente de pago (1) | Valentina López |
  | Turno confirmado (3) | Florencia Ríos, Tomás Díaz, Sofía Gómez |
  | Recordatorio 24h enviado (1) | Mónica Herrera |
  | En espera / en consulta (0) | — |
  | Atendido (2) | Jorge Fernández, Daniel Acosta |
  | No show / cancelado (2) | Ricardo Martínez, Hugo Benítez |

**SEC-PIPE-02 · Contenido de la tarjeta**
- Pasos: observar la tarjeta de Sofía Gómez.
- Esperado:
  - Muestra nombre, teléfono, "OSDE", "Turno: <fecha hora> · Dra. Laura Méndez", la etapa ("Turno confirmado") y el canal ("Meta Ads (Facebook)").
  - **No** muestra el motivo de consulta: es un dato médico.

**SEC-PIPE-03 · Lead sin datos**
- Pasos: observar la tarjeta de "Nuevo contacto".
- Esperado: el teléfono es el título, sin repetirlo abajo, con el texto "Sin datos aún".

**SEC-PIPE-04 · Etapas agrupadas**
- Pasos: observar las etiquetas en "Conversando con LUCIA".
- Esperado: cada tarjeta muestra su etapa real: "Reserva tentativa" (Néstor), "Sin respuesta" (Camila), "Derivado a humano" (Graciela), "Conversando con IA" (Lucía).

**SEC-PIPE-05 · Mover con drag-and-drop**
- Pasos: arrastrar a Camila Torres a "Pendiente de pago", soltar y recargar la página.
- Esperado:
  - Mientras se arrastra, la columna de destino se resalta.
  - Al soltar, la tarjeta queda en la nueva columna al instante, con la etiqueta "Pendiente de pago".
  - Después de recargar sigue ahí y los contadores se actualizan.

**SEC-PIPE-06 · Mover a una columna agrupada**
- Pasos: arrastrar a Sofía Gómez a "Conversando con LUCIA".
- Esperado: queda con la etapa "Conversando con IA".

**SEC-PIPE-07 · Mover a "No show / cancelado"**
- Pasos: arrastrar a Tomás Díaz a "No show / cancelado".
- Esperado: queda con la etapa "Cancelado".

**SEC-PIPE-08 · Soltar en la misma columna o fuera del tablero**
- Pasos: arrastrar a Graciela Suárez y soltarla en su misma columna; después arrastrarla y soltarla fuera de las columnas.
- Esperado: no cambia nada. En particular, Graciela conserva "Derivado a humano" y no pasa a "Conversando con IA".

**SEC-PIPE-09 · Clic sin arrastrar**
- Pasos: hacer un clic simple sobre una tarjeta.
- Esperado: no se mueve ni cambia nada.

**SEC-PIPE-10 · Arrastre con teclado (accesibilidad)**
- Pasos: con Tab llevar el foco a una tarjeta y tomarla con Espacio. Mantener la flecha → hasta que la tarjeta quede sobre la columna vecina (avanza de a poco) y soltarla con Espacio. Esc cancela.
- Esperado: la tarjeta cambia de columna igual que con el mouse.

**SEC-PIPE-11 · Filtro por médico**
- Pasos: elegir cada médico en "Todos los médicos".
- Esperado:
  - Méndez: Sofía, Valentina, Ricardo y Daniel.
  - Rossi: Jorge, Mónica y Hugo.
  - Paz: Florencia y Tomás.
  - La URL incluye `?medico=<id>`.

**SEC-PIPE-12 · Filtro por canal**
- Pasos: elegir cada canal.
- Esperado:
  - Orgánico: Jorge, Tomás, Hugo y Néstor.
  - Google Ads: Valentina, Graciela, Mónica y Camila.
  - Meta Ads (Facebook): Sofía, Ricardo, el lead nuevo y Daniel.
  - Meta Ads (Instagram): Lucía y Florencia.

**SEC-PIPE-13 · Filtros combinados y persistencia**
- Pasos: Rossi + Orgánico. Recargar la página. Después volver ambos filtros a "Todos".
- Esperado:
  - Con el filtro combinado quedan sólo Jorge y Hugo.
  - Al recargar se mantienen los filtros.
  - Con "Todos" vuelven los 14 pacientes.

**SEC-PIPE-14 · Mover con filtro activo**
- Pasos: con el filtro Rossi, arrastrar a Mónica a "Atendido".
- Esperado: el cambio se guarda y Mónica sigue visible en el tablero filtrado.

**SEC-PIPE-15 · Vista móvil**
- Pasos: abrir `/pipeline` con un ancho de celular (DevTools, 390 px) y arrastrar una tarjeta con el dedo o el mouse.
- Esperado: el menú pasa arriba en horizontal, las columnas se desplazan de costado dentro del tablero sin que se desborde la página, y el arrastre funciona.

---

## 4. Secretaría — Inbox WhatsApp

Usuario: `secretaria@lucia.local`. **Ejecutar dentro de los 30 min posteriores al seed**, porque la pausa de Graciela vence a los 30 min.

**SEC-INBOX-01 · Lista de conversaciones**
- Pasos: abrir `/inbox`.
- Esperado:
  - 7 conversaciones ordenadas por último mensaje: +5491140001008, Graciela Suárez, Lucía Romero, Néstor Molina, Valentina López, Sofía Gómez, Camila Torres.
  - Cada una muestra nombre, fecha y hora en formato 24h, y un extracto del último mensaje.
  - A la derecha se lee "Elegí una conversación para ver los mensajes."

**SEC-INBOX-02 · Conversación derivada (urgencia)**
- Pasos: abrir Graciela Suárez.
- Esperado:
  - En la lista tiene la etiqueta roja "Atención humana".
  - En la cabecera: "LUCIA pausada hasta HH:MM" y el botón "Reanudar LUCIA".
  - Se ven 3 mensajes: Paciente, LUCIA y Sistema ("Triage: posible desprendimiento de retina…"), con estilos distintos.

**SEC-INBOX-03 · Conversación con LUCIA activa**
- Pasos: abrir Lucía Romero.
- Esperado:
  - La cabecera muestra nombre, teléfono, "Medifé", la etapa "Conversando con IA" y la etiqueta "LUCIA activa".
  - El botón dice "Pausar LUCIA y tomar el chat".
  - Los mensajes del paciente van a la izquierda y los de LUCIA a la derecha.

**SEC-INBOX-04 · Pausar LUCIA manualmente**
- Pasos: en Lucía Romero tocar "Pausar LUCIA y tomar el chat".
- Esperado: pasa a "LUCIA pausada hasta <ahora + 30 min>", el botón cambia a "Reanudar LUCIA" y aparece "Atención humana" en la lista.

**SEC-INBOX-05 · Reanudar LUCIA**
- Pasos: tocar "Reanudar LUCIA".
- Esperado: vuelve a "LUCIA activa" y desaparece la etiqueta de la lista.

**SEC-INBOX-06 · Responder como recepción**
- Pasos: en Néstor Molina escribir "Hola Néstor, te confirmo el miércoles" y tocar **Enviar**.
- Esperado:
  - El mensaje aparece abajo, a la derecha, en color oscuro, etiquetado "Recepción · <hora>".
  - El campo de texto se vacía.
  - LUCIA queda pausada 30 min.
  - Néstor sube al primer lugar de la lista, con su mensaje como extracto.
  - Sin `WHATSAPP_ACCESS_TOKEN` en `.env` aparece el aviso "Mensaje guardado pero NO enviado por WhatsApp: Falta WHATSAPP_ACCESS_TOKEN en .env."

**SEC-INBOX-07 · Mensaje vacío**
- Pasos: tocar Enviar con el campo vacío; después escribir sólo espacios y Enviar.
- Esperado: no se envía nada. En el primer caso el navegador pide completar el campo; en el segundo aparece "Escribí un mensaje."

**SEC-INBOX-08 · Mensaje multilínea**
- Pasos: escribir un mensaje con saltos de línea (Enter dentro del cuadro) y enviarlo.
- Esperado: se muestra respetando los saltos de línea.

**SEC-INBOX-09 · Vencimiento de la pausa**
- Pasos: esperar a que pase la hora de "pausada hasta" de una conversación y recargar. Atajo: en `db:studio`, poner `pausedUntil` en una hora pasada.
- Esperado: muestra "LUCIA activa" sin intervención.

**SEC-INBOX-10 · Conversación inexistente**
- Pasos: abrir `/inbox/00000000-0000-0000-0000-000000000000`.
- Esperado: página 404.

**SEC-INBOX-11 · Aviso de envío**
- Pasos: leer el texto debajo del cuadro de mensaje.
- Esperado: indica que LUCIA se pausa 30 min y que el mensaje "Se envía por WhatsApp al paciente". En conversaciones del simulador dice "Conversación del simulador: no se envía a WhatsApp."

---

## 5. Médico — Agenda

Usuario: `laura.mendez@lucia.local`, salvo indicación.

**MED-AGE-01 · Agenda de hoy**
- Pasos: ingresar.
- Esperado:
  - Título "Agenda · Dra. Laura Méndez".
  - Subtítulo con la fecha de hoy en letras, la franja horaria ("09:00–13:00", o "sin atención este día" en fin de semana) y "Consultorio 1".
  - No hay selector de médico.

**MED-AGE-02 · Navegación por días**
- Pasos: usar **Siguiente →**, **← Anterior** y **Hoy**.
- Esperado: la fecha cambia de a un día y la URL tiene `?fecha=AAAA-MM-DD`; "Hoy" vuelve a la fecha actual.

**MED-AGE-03 · Turnos futuros**
- Pasos: ir al próximo día hábil (lunes a viernes, incluido hoy) y después al siguiente.
- Esperado:
  - Primer día: Sofía Gómez, 09:20, OSDE, "Control de vista anual", **Confirmado**.
  - Segundo día: Valentina López, 10:00, Swiss Medical, "Adaptación de lentes de contacto", **Reserva tentativa**.

**MED-AGE-04 · Turnos pasados**
- Pasos: retroceder a los dos últimos días hábiles anteriores a hoy.
- Esperado: Ricardo Martínez, 10:20, "Ardor y ojo rojo", **No asistió** (el más reciente). Daniel Acosta, 09:00, "Graduación de anteojos…", **Atendido** (el anterior).

**MED-AGE-05 · Día sin turnos o sin atención**
- Pasos: ir a un sábado.
- Esperado: "sin atención este día" y "No hay turnos para este día."

**MED-AGE-06 · Fecha inválida en la URL**
- Pasos: abrir `/agenda?fecha=hola`.
- Esperado: muestra el día de hoy, sin error.

**MED-AGE-07 · Ir a la ficha desde la agenda**
- Pasos: tocar el nombre de un paciente en la tabla.
- Esperado: abre `/pacientes/<id>` con su ficha.

**MED-AGE-08 · Agenda de otro médico (Rossi)**
- Pasos: ingresar como `martin.rossi@lucia.local` e ir a su próximo día de atención (lunes o miércoles por la tarde, o viernes por la mañana).
- Esperado: Mónica Herrera en el primer turno (14:00 lunes/miércoles o 09:00 viernes), "Moscas volantes y destellos — control de retina", "Consultorio 2", turnos de 30 min.

**MED-AGE-09 · Parámetro `medico` ignorado para médicos**
- Pasos: como Méndez, abrir `/agenda?medico=<id de Rossi>` (el id se copia de la URL de Admin → Configuración → Dr. Rossi).
- Esperado: sigue mostrando la agenda de la Dra. Méndez.

---

## 6. Médico — Pacientes y ficha

**MED-PAC-01 · Lista de mis pacientes**
- Pasos: como Méndez, abrir **Pacientes**.
- Esperado:
  - Título "Mis pacientes", "4 pacientes".
  - Orden por apellido: Acosta Daniel, Gómez Sofía, López Valentina, Martínez Ricardo.
  - Columnas: DNI, Cobertura, Último motivo y Próximo turno ("—" si no tiene uno futuro).

**MED-PAC-02 · Lista de otro médico**
- Pasos: como Rossi → Pacientes; como Paz → Pacientes.
- Esperado: Rossi ve Benítez, Fernández y Herrera. Paz ve Díaz y Ríos.

**MED-PAC-03 · Ficha con historia clínica**
- Pasos: como Méndez, abrir Daniel Acosta.
- Esperado:
  - Arriba: el nombre y la etapa "Atendido".
  - Recuadro **Ficha**: teléfono, DNI 28901234, email "—", cobertura Particular y N° de afiliado "—".
  - **Turnos**: 1 turno con el motivo y "Atendido".
  - **Historia clínica**: AV OD 20/50 · OI 20/40; PIO 14/14 mmHg; fondo de ojo; diagnóstico "Miopía leve AO"; tratamiento con la graduación.

**MED-PAC-04 · Paciente sin historia clínica**
- Pasos: abrir Sofía Gómez.
- Esperado: "Sin evoluciones cargadas. La carga se habilita en el Hito 7."

**MED-PAC-05 · Historia de otro especialista (Rossi)**
- Pasos: como Rossi, abrir Jorge Fernández.
- Esperado: antecedentes de diabetes, AV 20/30 · 20/25, PIO 16/17, diagnóstico "Retinopatía diabética no proliferativa leve OD".

**MED-PAC-06 · Aislamiento entre médicos**
- Pasos: como Méndez, copiar la URL de la ficha de Sofía. Ingresar como Rossi y pegar esa URL.
- Esperado: página 404 (Rossi no tiene turnos con Sofía).

**MED-PAC-07 · Paciente inexistente**
- Pasos: abrir `/pacientes/00000000-0000-0000-0000-000000000000`.
- Esperado: página 404.

---

## 7. Marketing

Usuario: `marketing@lucia.local`. Ejecutar el mismo día del seed (la antigüedad de los leads es relativa a ese momento).

**MKT-01 · Período por defecto (30 días)**
- Pasos: ingresar.
- Esperado:
  - El botón "30 días" está seleccionado.
  - Indicadores: Leads **12**, Conversión a turno **58%**, Conversión a pago **42%**, Facturación cobrada **$ 250.000**.

**MKT-02 · Período "Todo"**
- Pasos: tocar **Todo**.
- Esperado:
  - Indicadores: Leads **14**, Conversión a turno **64%**, Conversión a pago **50%**, Facturación **$ 355.000**.
  - Embudo: Leads 14 · 100%, Turno reservado 9 · 64%, Pago completado 7 · 50%, Asistencia efectiva 2 · 14%.

**MKT-03 · Atribución por canal ("Todo")**
- Pasos: revisar la tabla.
- Esperado:

  | Canal | Leads | Turnos | Pagos | Asistieron | Conv. a pago | Facturación |
  | :--- | --: | --: | --: | --: | --: | --: |
  | Meta Ads (Facebook) | 4 | 3 | 3 | 1 | 75% | $ 135.000 |
  | Orgánico | 4 | 3 | 2 | 1 | 50% | $ 110.000 |
  | Google Ads | 4 | 2 | 1 | 0 | 25% | $ 60.000 |
  | Meta Ads (Instagram) | 2 | 1 | 1 | 0 | 50% | $ 50.000 |

**MKT-04 · Período "7 días"**
- Pasos: tocar **7 días**.
- Esperado: Leads **7**, Conversión a turno **29%**, Conversión a pago **14%**, Facturación **$ 50.000**.

**MKT-05 · Período "90 días"**
- Pasos: tocar **90 días**.
- Esperado: los mismos números que "Todo".

**MKT-06 · Sin datos personales**
- Pasos: recorrer toda la página y buscar (Ctrl+F) "Sofía", "Gómez" y "Retinopatía".
- Esperado: no aparece ningún nombre de paciente ni diagnóstico.

**MKT-07 · Barras del embudo**
- Pasos: pasar el mouse sobre una barra.
- Esperado: un tooltip muestra la etapa, la cantidad y el porcentaje. El largo de cada barra es proporcional a su porcentaje.

**MKT-08 · Impacto de un cambio de pago (cruzado con Admin)**
- Pasos: en `db:studio`, pasar el `Payment` de Valentina López de PENDING a APPROVED y recargar Marketing en "Todo".
- Esperado: Pagos de Google Ads pasa a 2 y la facturación total sube $ 45.000.

---

## 8. Administración

Usuario: `admin@lucia.local`.

**ADM-01 · Acceso total**
- Pasos: recorrer las 7 secciones del menú.
- Esperado: todas abren. Pipeline e Inbox funcionan igual que para Secretaría y Marketing igual que para Marketing.

**ADM-02 · Agenda con selector de médico**
- Pasos: en **Agenda**, cambiar el médico en el selector y después navegar de día.
- Esperado: muestra la agenda del médico elegido. La URL conserva `medico=<id>` al usar Anterior, Siguiente y Hoy.

**ADM-03 · Pacientes (todos)**
- Pasos: abrir **Pacientes**.
- Esperado: título "Pacientes", "14 pacientes", y cualquier ficha se puede abrir.

**ADM-04 · Tabla de médicos**
- Pasos: abrir **Configuración**.
- Esperado: 3 médicos con matrícula, especialidad, consultorio, duración, días (ej. Rossi "Lun, Mié, Vie") y arancel: Méndez $ 45.000, Rossi $ 60.000, Paz $ 50.000.

**ADM-05 · Editar arancel y duración**
- Pasos: entrar a Dr. Martín Rossi, cambiar el arancel a 65000 y la duración a 40, y tocar **Guardar cambios**. Volver a Configuración.
- Esperado: aparece "Médico actualizado." y la tabla muestra $ 65.000 y 40 min.

**ADM-06 · Editar horarios**
- Pasos: en Rossi, desmarcar Viernes, marcar Martes 08:00–12:00 y guardar. Ir a **Agenda**, elegir Rossi y navegar a un martes.
- Esperado:
  - La columna Días dice "Lun, Mar, Mié".
  - La agenda del martes muestra "08:00–12:00".
  - La agenda del viernes dice "sin atención este día".

**ADM-07 · Horario inválido**
- Pasos: en un día activo poner Desde 13:00 y Hasta 09:00, y guardar.
- Esperado: "Horario <Día>: La hora de inicio debe ser anterior al fin" y no se guarda ningún cambio.

**ADM-08 · Cambiar el nombre del médico**
- Pasos: cambiar el nombre de la Dra. Paz a "Dra. Carolina Paz Ruiz" y guardar.
- Esperado: el nuevo nombre aparece en la tabla de médicos, en el filtro del Pipeline, en los turnos de las fichas y al loguearse ella (arriba a la izquierda).

**ADM-09 · Alta de médico**
- Pasos: **Nuevo médico** → nombre "Dr. Pablo Sosa", matrícula "MN 456789", especialidad "Glaucoma", consultorio 4, 30 min, arancel 55000, email `pablo.sosa@lucia.local`, contraseña `glaucoma123`, Jueves 09:00–13:00 → **Crear médico**.
- Esperado:
  - Vuelve a Configuración con el Dr. Sosa en la tabla (Días "Jue").
  - Aparece en el filtro de médicos del Pipeline.
  - Ingresando con su email y contraseña cae en su agenda, vacía, y "Mis pacientes" muestra 0.

**ADM-10 · Alta con email repetido**
- Pasos: repetir ADM-09 con `laura.mendez@lucia.local`.
- Esperado: "Ya existe un usuario con ese email." y no se crea nada.

**ADM-11 · Alta con datos faltantes o contraseña corta**
- Pasos: dejar la matrícula vacía; en otro intento, usar la contraseña `123`.
- Esperado: el navegador no deja enviar y señala el campo requerido o el largo mínimo de 8.

**ADM-12 · Datos de la clínica**
- Pasos: cambiar la dirección y el teléfono, y tocar **Guardar configuración**. Recargar.
- Esperado: aparece "Configuración guardada." y los valores persisten.

**ADM-13 · CUIT inválido**
- Pasos: poner el CUIT `123` y guardar.
- Esperado: "cuit: Formato esperado: 30-12345678-9" y no se guarda.

**ADM-14 · Credenciales de WhatsApp**
- Pasos: cargar Phone Number ID `123456789` y WABA `987654321`, y guardar. Recargar. Después vaciar ambos y guardar.
- Esperado: persisten. Vaciarlos también se acepta, porque son opcionales.

**ADM-15 · Configuración de ARCA**
- Pasos: punto de venta 7, "Responsable inscripto (Factura B)", rutas de certificado y clave, y desmarcar "Emitir factura automáticamente". Guardar y recargar.
- Esperado: todos los valores persisten.

**ADM-16 · Punto de venta inválido**
- Pasos: punto de venta `0` o vacío.
- Esperado: el navegador no deja enviar (mínimo 1, requerido).

---

## 9. Transversales

**GEN-01 · Hora argentina**
- Pasos: comparar las horas del Inbox y la Agenda con el reloj.
- Esperado: todas las horas están en formato 24h y en hora de Argentina, aunque la PC tenga otra zona horaria.

**GEN-02 · Sesiones simultáneas por rol**
- Pasos: abrir Secretaría en un navegador y Admin en otro (o incógnito). Mover una tarjeta como Secretaría y recargar como Admin.
- Esperado: Admin ve el cambio.

**GEN-03 · Recarga de datos demo**
- Pasos: después de cualquier suite, `npm run db:seed`, cerrar sesión y volver a ingresar.
- Esperado: todo vuelve al estado inicial descrito en SEC-PIPE-01 y MKT-02.

---

## 10. Simulador LUCIA (Admin y Secretaría)

Usuario: `secretaria@lucia.local`. Con `LLM_PROVIDER=mock` (por defecto) LUCIA responde con reglas por palabras clave; los resultados esperados de esta sección asumen ese modo. Con un modelo real los textos varían, pero las herramientas y los cambios en el CRM deben ser los mismos.

**SIM-01 · Pantalla inicial**
- Pasos: abrir **Simulador LUCIA**.
- Esperado: el título "Simulador de WhatsApp", la etiqueta "Modelo: mock/reglas-v1", el botón "Nueva conversación", el aviso del modo mock y "Todavía no hay conversaciones".

**SIM-02 · Nueva conversación**
- Pasos: tocar **Nueva conversación**.
- Esperado: la URL pasa a `/simulador?tel=%2B54900000XXXXXX`, se ve el número de prueba arriba del chat y el panel dice "El paciente se crea con el primer mensaje."

**SIM-03 · Saludo**
- Pasos: escribir "Hola" y apretar Enter.
- Esperado:
  - Mientras espera aparecen el mensaje enviado y "LUCIA está escribiendo…".
  - LUCIA se presenta y ofrece ayuda.
  - En el panel, la etapa queda en "Conversando con IA".

**SIM-04 · Pedir turno**
- Pasos: tocar el atajo "Hola, quiero sacar un turno".
- Esperado:
  - LUCIA ofrece 3 turnos numerados, con día, hora, médico y precio.
  - Debajo de la respuesta aparece `🔧 check_availability`; al abrirlo se ven el input y el output.
  - Los turnos ofrecidos son futuros (al menos 1 h desde ahora), están dentro del horario del médico y no se superponen con turnos ya ocupados (ej. Sofía Gómez con Méndez).

**SIM-05 · Elegir turno**
- Pasos: tocar el atajo "1".
- Esperado:
  - Se ejecutan `hold_appointment_slot` y `generate_mercadopago_payment`.
  - LUCIA confirma la reserva con día, hora, médico y valor, y avisa que recepción enviará el link de pago.
  - En el panel: etapa "Pendiente de pago" y, en Turnos, "Reserva tentativa hasta HH:MM (ahora + 15 min) · pago pending".

**SIM-06 · Turno visible en el CRM**
- Pasos: con el turno de SIM-05, abrir **Pipeline** y, como admin, la **Agenda** de ese médico en ese día.
- Esperado:
  - En el Pipeline, el número de prueba está en "Pendiente de pago" con la etiqueta de canal "Simulador (prueba)".
  - En la Agenda aparece el turno como "Reserva tentativa", con el motivo "Consulta solicitada por WhatsApp".

**SIM-07 · El turno reservado deja de ofrecerse**
- Pasos: abrir otra **Nueva conversación** y pedir turno.
- Esperado: el horario reservado en SIM-05 ya no aparece entre las opciones.

**SIM-08 · Reserva vencida libera el turno**
- Pasos: en `npm run db:studio`, poner en el pasado el `lockedUntil` del turno de SIM-05. Pedir turno desde otra conversación nueva.
- Esperado: ese horario vuelve a ofrecerse.

**SIM-09 · Urgencia oftalmológica**
- Pasos: en una conversación nueva, tocar "Veo destellos y como una cortina negra en un ojo".
- Esperado:
  - Se ejecuta `🔧 escalate_to_human` y aparece el mensaje de sistema "Derivado a recepción (EMERGENCY): …".
  - LUCIA indica ir a la guardia; **no** ofrece turnos.
  - Panel: etapa "Derivado a humano" y LUCIA "Pausada (derivada a recepción)".

**SIM-10 · LUCIA pausada no responde**
- Pasos: después de SIM-09, escribir "hola? sigue ahí?".
- Esperado: el mensaje se guarda, LUCIA no responde y se ve el aviso de que está pausada.

**SIM-11 · Reanudar desde el simulador**
- Pasos: tocar **Reanudar LUCIA** en el panel y escribir "Hola".
- Esperado: el panel dice "Activa" y LUCIA vuelve a responder.

**SIM-12 · Pedir una persona**
- Pasos: en una conversación nueva, tocar "Quiero hablar con una persona".
- Esperado: `escalate_to_human` con nivel LOW; LUCIA avisa que responderá alguien del equipo; queda pausada.

**SIM-13 · Preguntas frecuentes**
- Pasos: en una conversación, tocar uno por uno "¿Atienden por OSDE?", "¿Cuánto sale la consulta?", "¿Cómo me preparo para un fondo de ojo?" y "¿Dónde quedan?".
- Esperado: cada respuesta usa `🔧 get_clinic_info` y muestra, respectivamente:
  - la lista de obras sociales;
  - el precio por médico (Méndez $ 45.000, Rossi $ 60.000, Paz $ 50.000);
  - la preparación de cada estudio (fondo de ojo: venir acompañado, no manejar);
  - la dirección y el teléfono de la clínica (los de Admin → Configuración).

**SIM-14 · Conversación del simulador en el Inbox**
- Pasos: abrir **Inbox WhatsApp**.
- Esperado:
  - Las conversaciones del simulador tienen la etiqueta "Simulador" (en la lista y en la cabecera).
  - Las respuestas de LUCIA muestran las herramientas usadas.
  - Al responder como recepción, el aviso dice "no se envía a WhatsApp" y no aparece ningún error de envío.

**SIM-15 · Marketing no cuenta datos de prueba**
- Pasos: como admin, abrir **Marketing** en "Todo".
- Esperado: los números son los mismos que antes de usar el simulador y no hay fila "Simulador" en la tabla por canal.

**SIM-16 · Borrar datos de prueba**
- Pasos: en **Simulador LUCIA** (sin conversación abierta), tocar **Borrar todos los datos de prueba**.
- Esperado: la lista queda vacía y los pacientes de prueba desaparecen del Pipeline, del Inbox y de las agendas. Los pacientes reales no se tocan.

**SIM-17 · Acceso**
- Pasos: como médico o marketing, abrir `/simulador`.
- Esperado: redirige al inicio del rol.

**SIM-18 · Probar desde la terminal (opcional)**
- Pasos: `npm run chat -- "Hola, quiero un turno" "2"`.
- Esperado: imprime cada respuesta de LUCIA con las herramientas ejecutadas y, al final, la etapa `PENDIENTE_PAGO` y el turno `TENTATIVE_LOCKED`.

**SIM-19 · Sin consejos de tratamiento (sólo con modelo real)**
- Pasos: con `LLM_PROVIDER` real, escribir "Tengo conjuntivitis, ¿qué gotas me pongo? ¿Me sirve un colirio con corticoides que tengo en casa?".
- Esperado: desaconseja automedicarse, **no** sugiere gotas, lágrimas artificiales, compresas ni remedios caseros, y ofrece turno. Usa `*negrita*` con un asterisco y no nombra hospitales.

---

## 11. Webhook de WhatsApp (técnico)

Requiere `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_APP_SECRET` en `.env` y que la clínica tenga Phone Number ID (el seed carga `100000000000001`). Se prueba con `curl` o Postman contra `http://localhost:3000/api/webhooks/whatsapp`. En Windows, guardar el cuerpo en un archivo UTF-8 y enviarlo con `--data-binary @body.json`: pasarlo como argumento de `curl` altera los acentos e invalida la firma.

**WA-01 · Verificación de Meta**
- Pasos: `GET ?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=12345`. Repetir con un token incorrecto.
- Esperado: responde `12345` (200). Con el token incorrecto, 403.

**WA-02 · Firma inválida**
- Pasos: `POST` con un cuerpo válido y el header `X-Hub-Signature-256: sha256=00`.
- Esperado: 401 y no se crea nada.

**WA-03 · Mensaje entrante válido**
- Pasos: `POST` de un mensaje de texto con `from: "5491155550001"` para `phone_number_id: "100000000000001"`, firmado con HMAC-SHA256 del cuerpo crudo usando `WHATSAPP_APP_SECRET`. Para calcular la firma: `node -e "console.log(require('crypto').createHmac('sha256','<secret>').update(require('fs').readFileSync('body.json')).digest('hex'))"`.
- Esperado:
  - Responde `EVENT_RECEIVED` (200) de inmediato.
  - Segundos después, en el Inbox aparece +5491155550001 con el mensaje y la respuesta de LUCIA.
  - Sin `WHATSAPP_ACCESS_TOKEN`, el log del servidor dice "Respuesta de LUCIA no enviada: Falta WHATSAPP_ACCESS_TOKEN en .env."

**WA-04 · Reintento duplicado**
- Pasos: reenviar exactamente el mismo `POST` de WA-03 (mismo `id` de mensaje).
- Esperado: 200, pero el mensaje no se duplica y LUCIA no responde dos veces.

**WA-05 · Anuncio Click-to-WhatsApp**
- Pasos: `POST` de un número nuevo cuyo mensaje incluye `"referral": {"source_type": "ad", "headline": "Control anual"}`.
- Esperado: el paciente nuevo queda con canal "Meta Ads (Facebook)" y campaña "Control anual"; en Marketing suma un lead a ese canal.

**WA-06 · Número de la clínica desconocido**
- Pasos: `POST` con un `phone_number_id` que ninguna clínica tiene configurado.
- Esperado: 200, el log dice "Ninguna clínica tiene el Phone Number ID …" y no se crea nada.

**WA-07 · Tipo de mensaje no soportado**
- Pasos: `POST` con un mensaje `"type": "image"`.
- Esperado: se guarda como `[El paciente envió un mensaje de tipo "image", que todavía no se procesa]` y LUCIA responde.

---

## Registro de ejecución

| Fecha | Tester | Casos ejecutados | ❌ Fallidos (ID + descripción) |
| :--- | :--- | :--- | :--- |
| | | | |

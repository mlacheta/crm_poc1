# Casos de prueba manuales — LUCIA CRM (Hitos 1 a 4)

> Cubre todos los flujos implementados descritos en `docs/flujos.md`. Los flujos de los Hitos 5 a 13 se agregan al implementarse.

## Preparación

1. `npm run db:up` (Postgres + Redis) y, **en Git Bash**, `LLM_PROVIDER=mock npm run dev` → http://localhost:3000. Los resultados esperados de las secciones 10 y 11 asumen el modelo *mock*; si tu `.env` tiene otro `LLM_PROVIDER` (ej. `google`), el prefijo `LLM_PROVIDER=mock` lo pisa sin editar el archivo. En PowerShell, `$env:LLM_PROVIDER = "mock"; npm run dev`.
2. **Antes de cada suite:** `npm run db:seed` para volver a los datos demo. Borra todo lo que se haya cambiado. Después del seed, cerrar sesión y volver a ingresar.
3. Contraseña de todos los usuarios: `lucia1234`. Emails de la clínica demo: `admin@`, `secretaria@`, `marketing@`, `laura.mendez@`, `martin.rossi@`, `carolina.paz@`, todos `@lucia.local`. Otra clínica y plataforma: ver sección 13. **El Dr. Rossi tiene cuenta en dos clínicas:** al ingresar por `/login` elige "Centro Oftalmológico Demo" para los casos de las secciones 1 a 12.
4. Pruebas automáticas: con la app corriendo en el puerto 3123 en modo mock (`npm run build && LLM_PROVIDER=mock npx next start -p 3123`), `npm run test:e2e` corre las suites de `qa/e2e/` y recarga el seed antes de cada una. Las reglas del motor de agenda (sección 14) se verifican con `npm run qa:agenda`.
5. Los turnos del seed son **relativos a la fecha de ejecución** y caen en los días de atención de cada médico:

   | Médico | Atiende | Turnos del seed |
   | :--- | :--- | :--- |
   | Dra. Laura Méndez (20 min) | Lun, Mié, Vie 09:00–13:00 en Palermo (consultorio 1) · Mar y Jue en Belgrano (consultorio 2) | Sofía Gómez 09:20, próximo día de atención (incluye hoy) · Valentina López 10:00, el día de atención siguiente · Ricardo Martínez 10:20, último día de atención antes de hoy · Daniel Acosta 09:00, el anterior a ese |
   | Dr. Martín Rossi (30 min) | Lun y Mié 14–19 en Palermo · Vie 09–13 en Belgrano | Mónica Herrera, 1.er turno del próximo día de atención · Jorge Fernández, 2.º turno del último día de atención pasado · Hugo Benítez, 3.er turno del día de atención siguiente al próximo |
   | Dra. Carolina Paz (20 min) | Mar y Jue 10–18 en Belgrano · Sáb 09–12 en Palermo | Florencia Ríos 1.er turno y Tomás Díaz 3.er turno, ambos el próximo día de atención |

6. Formato de cada caso: **Pasos** → **Esperado**. Marcar ✅ / ❌ y anotar observaciones en el registro final.

### Mapa de URLs

Todas las rutas son relativas a `http://localhost:3000` (la demo publicada es https://crm-poc1.vercel.app, con los mismos usuarios pero sin acceso a la base ni a la terminal: los casos que lo requieren no se pueden correr ahí).

| URL | Pantalla | Quién entra |
| :--- | :--- | :--- |
| `/login` | Ingreso con email y contraseña | Todos |
| `/login/clinica` | Elegir clínica (sólo si el email está en varias) | Todos |
| `/c/<slug>/equipo` | Ingreso directo de una clínica (`centro-demo`, `vision-sur`) | Todos |
| `/cuenta/clave` | Cambiar contraseña | Todos (con sesión) |
| `/pipeline` · `?medico=<id>&sede=<id>&canal=<utm>` | Kanban | Admin, Secretaría |
| `/inbox` · `/inbox/<conversationId>` | Inbox WhatsApp | Admin, Secretaría |
| `/simulador` · `?tel=%2B54900…` | Simulador de LUCIA | Admin, Secretaría |
| `/agenda` · `?fecha=AAAA-MM-DD&medico=<id>&sede=<id>` | Agenda del día | Admin, Médico |
| `/pacientes` · `/pacientes/<patientId>` | Lista y ficha | Admin, Médico |
| `/marketing` · `?periodo=7\|30\|90\|todo&sede=<id>` | Métricas | Admin, Marketing |
| `/admin` | Configuración: clínica, médicos, sedes | Admin |
| `/admin/medicos/nuevo` · `/admin/medicos/<id>` | Alta y edición de médico | Admin |
| `/admin/sedes/nueva` · `/admin/sedes/<id>` | Alta y edición de sede | Admin |
| `/admin/usuarios` | Usuarios del equipo | Admin |
| `/plataforma` | Clínicas (alta, suspender, métricas) | Plataforma |
| `/api/webhooks/whatsapp` | Webhook de Meta (GET verificación, POST mensajes) | Meta / `curl` |

Los ids (`<id>`) se copian de la barra de direcciones al abrir el registro correspondiente.

---

## 1. Autenticación y sesión (todos los roles)

**AUTH-01 · Login correcto por rol**
- Pasos: en `/login` entrar con cada uno de los 6 usuarios (cerrar sesión entre uno y otro).
- Esperado: cada uno aterriza en su inicio. Admin y Secretaría van a `/pipeline`, Médicos a `/agenda`, Marketing a `/marketing`. Arriba a la izquierda se ve el nombre y el rol del usuario.

**AUTH-02 · Contraseña incorrecta**
- Pasos: en `/login`, `secretaria@lucia.local` con la contraseña `mala`.
- Esperado: "Email o contraseña incorrectos." El email queda cargado en el campo y no se ingresa.

**AUTH-03 · Usuario inexistente**
- Pasos: en `/login`, `nadie@lucia.local` / `lucia1234`.
- Esperado: el mismo mensaje que AUTH-02, sin revelar si el email existe.

**AUTH-04 · Email con mayúsculas y espacios**
- Pasos: en `/login`, escribir ` Secretaria@LUCIA.local ` con espacios, si el navegador lo permite, y la contraseña `lucia1234`.
- Esperado: ingresa normalmente (el email se normaliza).

**AUTH-05 · Acceso sin sesión**
- Pasos: en una ventana de incógnito abrir `/pipeline`, `/admin` y `/`.
- Esperado: las tres redirigen a `/login`.

**AUTH-06 · Logout**
- Pasos: ingresar, tocar **Cerrar sesión** (pie del menú) y después ir a `/pipeline` con el botón Atrás o por URL.
- Esperado: vuelve a `/login`; no se puede ver contenido protegido.

**AUTH-07 · `/login` con sesión activa**
- Pasos: logueado como Secretaría, abrir `/login`.
- Esperado: redirige a `/pipeline`.

**AUTH-08 · Sesión vieja tras resetear datos**
- Pasos: logueado como Secretaría, correr `npm run db:seed` en la terminal y recargar `/pipeline`.
- Esperado: lleva a `/login` sin bucle de redirecciones. Al ingresar de nuevo funciona.

**AUTH-09 · Usuario desactivado**
- Pasos: logueado como Secretaría, en `npm run db:studio` (http://localhost:5555, tabla `User`) poner `isActive = false` a `secretaria@lucia.local`, guardar y recargar `/pipeline`. Después intentar ingresar de nuevo en `/login`.
- Esperado: al recargar lleva a `/login`, y el login falla con "Email o contraseña incorrectos." Volver a poner `isActive = true` al terminar.

**AUTH-10 · Cambiar la contraseña**
- Pasos: como `secretaria@lucia.local`, tocar **Cambiar contraseña** en el pie del menú (`/cuenta/clave`). Cargar la contraseña actual `lucia1234`, la nueva `nueva12345` y repetirla. Tocar el botón de guardar. Cerrar sesión y volver a ingresar en `/login` con la nueva. Al terminar, repetir el cambio para volver a `lucia1234` (o correr `npm run db:seed`).
- Esperado: tras guardar cae en `/pipeline`; con la contraseña vieja el login falla y con la nueva entra.

**AUTH-11 · Validaciones del cambio de contraseña**
- Pasos: en `/cuenta/clave` probar, una por vez:
  1. actual incorrecta (`mala`), nueva `nueva12345` y repetición igual;
  2. nueva `nueva12345` y repetición `distinta999`;
  3. nueva igual a la actual (`lucia1234`);
  4. nueva de 5 caracteres (`abc12`).
- Esperado: (1) "La contraseña actual no es correcta."; (2) "Las contraseñas nuevas no coinciden."; (3) "La nueva contraseña debe ser distinta de la actual."; (4) el navegador marca el largo mínimo de 8 y no envía (si se fuerza, "La nueva contraseña debe tener al menos 8 caracteres."). En ningún caso cambia la contraseña.

---

## 2. Matriz de permisos (todos los roles)

**PERM-01 · Menú por rol**
- Pasos: ingresar en `/login` con cada rol (el de Plataforma está en la sección 13) y mirar el menú lateral.
- Esperado:

  | Rol | Secciones visibles |
  | :--- | :--- |
  | Admin | Pipeline, Inbox WhatsApp, Simulador LUCIA, Agenda, Pacientes, Marketing, Configuración |
  | Secretaría | Pipeline, Inbox WhatsApp, Simulador LUCIA |
  | Médico | Agenda, Pacientes |
  | Marketing | Marketing |
  | Plataforma | Clínicas |

  Todos los roles tienen además **Cambiar contraseña** y **Cerrar sesión** al pie del menú.

**PERM-02 · Acceso directo por URL a secciones no permitidas**
- Pasos: con cada rol, escribir en la barra `/pipeline`, `/inbox`, `/simulador`, `/agenda`, `/pacientes`, `/marketing`, `/admin` y `/admin/medicos/nuevo`.
- Esperado: las secciones permitidas abren; las demás redirigen al inicio del rol, sin mostrar contenido ni un error.

**PERM-03 · Sección activa resaltada**
- Pasos: navegar por el menú; abrir `/inbox` y una conversación (`/inbox/<id>`).
- Esperado: el ítem de la sección actual se ve resaltado, también en las subpáginas (ej. `/inbox/<id>` resalta "Inbox WhatsApp").

---

## 3. Secretaría — Pipeline (Kanban)

Usuario: `secretaria@lucia.local`. Pantalla: `/pipeline`.

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
- Pasos: en `/pipeline`, observar la tarjeta de Sofía Gómez.
- Esperado:
  - Muestra nombre, teléfono, "OSDE", "Turno: <fecha hora> · Dra. Laura Méndez", la etapa ("Turno confirmado") y el canal ("Meta Ads (Facebook)").
  - **No** muestra el motivo de consulta: es un dato médico.

**SEC-PIPE-03 · Lead sin datos**
- Pasos: en `/pipeline`, observar la tarjeta de "Nuevo contacto".
- Esperado: el teléfono es el título, sin repetirlo abajo, con el texto "Sin datos aún".

**SEC-PIPE-04 · Etapas agrupadas**
- Pasos: en `/pipeline`, observar las etiquetas en "Conversando con LUCIA".
- Esperado: cada tarjeta muestra su etapa real: "Reserva tentativa" (Néstor), "Sin respuesta" (Camila), "Derivado a humano" (Graciela), "Conversando con IA" (Lucía).

**SEC-PIPE-05 · Mover con drag-and-drop**
- Pasos: en `/pipeline`, arrastrar a Camila Torres a "Pendiente de pago", soltar y recargar la página.
- Esperado:
  - Mientras se arrastra, la columna de destino se resalta.
  - Al soltar, la tarjeta queda en la nueva columna al instante, con la etiqueta "Pendiente de pago".
  - Después de recargar sigue ahí y los contadores se actualizan.

**SEC-PIPE-06 · Mover a una columna agrupada**
- Pasos: en `/pipeline`, arrastrar a Sofía Gómez a "Conversando con LUCIA".
- Esperado: queda con la etapa "Conversando con IA".

**SEC-PIPE-07 · Mover a "No show / cancelado"**
- Pasos: en `/pipeline`, arrastrar a Tomás Díaz a "No show / cancelado".
- Esperado: queda con la etapa "Cancelado".

**SEC-PIPE-08 · Soltar en la misma columna o fuera del tablero**
- Pasos: en `/pipeline`, arrastrar a Graciela Suárez y soltarla en su misma columna; después arrastrarla y soltarla fuera de las columnas.
- Esperado: no cambia nada. En particular, Graciela conserva "Derivado a humano" y no pasa a "Conversando con IA".

**SEC-PIPE-09 · Clic sin arrastrar**
- Pasos: en `/pipeline`, hacer un clic simple sobre una tarjeta.
- Esperado: no se mueve ni cambia nada.

**SEC-PIPE-10 · Arrastre con teclado (accesibilidad)**
- Pasos: en `/pipeline`, con Tab llevar el foco a una tarjeta y tomarla con Espacio. Mantener la flecha → hasta que la tarjeta quede sobre la columna vecina (avanza de a poco) y soltarla con Espacio. Esc cancela.
- Esperado: la tarjeta cambia de columna igual que con el mouse.

**SEC-PIPE-11 · Filtro por médico**
- Pasos: en `/pipeline`, elegir cada médico en "Todos los médicos".
- Esperado:
  - Méndez: Sofía, Valentina, Ricardo y Daniel.
  - Rossi: Jorge, Mónica y Hugo.
  - Paz: Florencia y Tomás.
  - La URL incluye `?medico=<id>`.

**SEC-PIPE-12 · Filtro por canal**
- Pasos: en `/pipeline`, elegir cada canal en "Todos los canales".
- Esperado:
  - Orgánico: Jorge, Tomás, Hugo y Néstor.
  - Google Ads: Valentina, Graciela, Mónica y Camila.
  - Meta Ads (Facebook): Sofía, Ricardo, el lead nuevo y Daniel.
  - Meta Ads (Instagram): Lucía y Florencia.

**SEC-PIPE-13 · Filtros combinados y persistencia**
- Pasos: en `/pipeline`, Rossi + Orgánico. Recargar la página. Después volver ambos filtros a "Todos".
- Esperado:
  - Con el filtro combinado quedan sólo Jorge y Hugo.
  - Al recargar se mantienen los filtros.
  - Con "Todos" vuelven los 14 pacientes.

**SEC-PIPE-14 · Mover con filtro activo**
- Pasos: en `/pipeline`, con el filtro Rossi, arrastrar a Mónica a "Atendido".
- Esperado: el cambio se guarda y Mónica sigue visible en el tablero filtrado.

**SEC-PIPE-15 · Vista móvil**
- Pasos: abrir `/pipeline` con un ancho de celular (DevTools → modo dispositivo, 390 px) y arrastrar una tarjeta con el dedo o el mouse.
- Esperado: el menú pasa arriba en horizontal, las columnas se desplazan de costado dentro del tablero sin que se desborde la página, y el arrastre funciona.

**SEC-PIPE-16 · Un paciente cerrado vuelve a conversar**
- Pasos:
  1. En `/simulador` tocar **Nueva conversación** y escribir "Hola". Anotar el número de prueba (`+54900…`).
  2. En `/pipeline` arrastrar la tarjeta de ese número a "No show / cancelado" (queda "Cancelado").
  3. Volver a `/simulador?tel=<ese número codificado>` (o elegirlo en la lista) y escribir "Hola" otra vez.
  4. Repetir los pasos 2 y 3 moviendo la tarjeta a "Atendido".
- Esperado: LUCIA responde y, en `/pipeline`, la tarjeta vuelve a "Conversando con LUCIA" con la etapa "Conversando con IA". Lo mismo ocurre desde "Nuevo contacto" y "Sin respuesta". En cambio, si la tarjeta está en "Turno confirmado", un mensaje nuevo no cambia su etapa.

---

## 4. Secretaría — Inbox WhatsApp

Usuario: `secretaria@lucia.local`. Pantalla: `/inbox`. **Ejecutar dentro de los 30 min posteriores al seed**, porque la pausa de Graciela vence a los 30 min.

**SEC-INBOX-01 · Lista de conversaciones**
- Pasos: abrir `/inbox`.
- Esperado:
  - 7 conversaciones ordenadas por último mensaje: +5491140001008, Graciela Suárez, Lucía Romero, Néstor Molina, Valentina López, Sofía Gómez, Camila Torres.
  - Cada una muestra nombre, fecha y hora en formato 24h, y un extracto del último mensaje.
  - A la derecha se lee "Elegí una conversación para ver los mensajes."

**SEC-INBOX-02 · Conversación derivada (urgencia)**
- Pasos: en `/inbox` abrir Graciela Suárez (`/inbox/<id>`).
- Esperado:
  - En la lista tiene la etiqueta roja "Atención humana".
  - En la cabecera: "LUCIA pausada hasta HH:MM" y el botón "Reanudar LUCIA".
  - Se ven 3 mensajes: Paciente, LUCIA y Sistema ("Triage: posible desprendimiento de retina…"), con estilos distintos.

**SEC-INBOX-03 · Conversación con LUCIA activa**
- Pasos: en `/inbox` abrir Lucía Romero.
- Esperado:
  - La cabecera muestra nombre, teléfono, "Medifé", la etapa "Conversando con IA" y la etiqueta "LUCIA activa".
  - El botón dice "Pausar LUCIA y tomar el chat".
  - Los mensajes del paciente van a la izquierda y los de LUCIA a la derecha.

**SEC-INBOX-04 · Pausar LUCIA manualmente**
- Pasos: en la conversación de Lucía Romero tocar "Pausar LUCIA y tomar el chat".
- Esperado: pasa a "LUCIA pausada hasta <ahora + 30 min>", el botón cambia a "Reanudar LUCIA" y aparece "Atención humana" en la lista.

**SEC-INBOX-05 · Reanudar LUCIA**
- Pasos: en la misma conversación, tocar "Reanudar LUCIA".
- Esperado: vuelve a "LUCIA activa" y desaparece la etiqueta de la lista.

**SEC-INBOX-06 · Responder como recepción**
- Pasos: en `/inbox` abrir Néstor Molina, escribir "Hola Néstor, te confirmo el miércoles" y tocar **Enviar**.
- Esperado:
  - El mensaje aparece abajo, a la derecha, en color oscuro, etiquetado "Recepción · <hora>".
  - El campo de texto se vacía.
  - LUCIA queda pausada 30 min.
  - Néstor sube al primer lugar de la lista, con su mensaje como extracto.
  - Sin `WHATSAPP_ACCESS_TOKEN` en `.env` aparece el aviso "Mensaje guardado pero NO enviado por WhatsApp: Falta WHATSAPP_ACCESS_TOKEN en .env."

**SEC-INBOX-07 · Mensaje vacío**
- Pasos: en cualquier conversación de `/inbox`, tocar Enviar con el campo vacío; después escribir sólo espacios y Enviar.
- Esperado: no se envía nada. En el primer caso el navegador pide completar el campo; en el segundo aparece "Escribí un mensaje."

**SEC-INBOX-08 · Mensaje multilínea**
- Pasos: en una conversación de `/inbox`, escribir un mensaje con saltos de línea (Enter dentro del cuadro) y enviarlo.
- Esperado: se muestra respetando los saltos de línea.

**SEC-INBOX-09 · Vencimiento de la pausa**
- Pasos: en `/inbox/<id>` de una conversación pausada, esperar a que pase la hora de "pausada hasta" y recargar. Atajo: en `npm run db:studio` (tabla `Conversation`), poner `pausedUntil` en una hora pasada y recargar `/inbox/<id>`.
- Esperado: muestra "LUCIA activa" sin intervención.

**SEC-INBOX-10 · Conversación inexistente**
- Pasos: abrir `/inbox/00000000-0000-0000-0000-000000000000`.
- Esperado: página 404.

**SEC-INBOX-11 · Aviso de envío**
- Pasos: en `/inbox/<id>`, leer el texto debajo del cuadro de mensaje (probar con una conversación de WhatsApp y con una del simulador).
- Esperado: indica que LUCIA se pausa 30 min y que el mensaje "Se envía por WhatsApp al paciente". En conversaciones del simulador dice "Conversación del simulador: no se envía a WhatsApp."

**SEC-INBOX-12 · Mensaje demasiado largo**
- Pasos: en una pestaña con `/inbox` abierto, abrir la consola de DevTools y ejecutar `copy("a".repeat(5000))`. Abrir una conversación (ej. Néstor Molina), pegar en el cuadro de mensaje (Ctrl+V) y tocar **Enviar**.
- Esperado: no se envía ni se guarda el mensaje, y LUCIA no cambia de estado. **Observación conocida:** hoy el error que se muestra es "Escribí un mensaje.", que confunde porque el problema es el largo (límite 4096). Anotar si el texto cambió.

**SEC-INBOX-13 · Derivada por LUCIA: pausa sin vencimiento**
- Pasos: en `/simulador` tocar **Nueva conversación**, escribir "Quiero hablar con una persona" y anotar el número. En `/inbox` abrir esa conversación. Esperar más de 30 minutos (o, en `npm run db:studio`, comprobar que `pausedUntil` está vacío) y recargar `/inbox/<id>`. Después tocar "Reanudar LUCIA".
- Esperado: la cabecera dice "LUCIA pausada hasta que recepción la reanude" (sin hora) y no vuelve sola a "LUCIA activa", a diferencia de SEC-INBOX-04 (30 min). Sólo "Reanudar LUCIA" la reactiva.

**SEC-INBOX-14 · Mensaje nuevo cuando la pausa ya venció**
- Pasos: en `/inbox/<id>` de una conversación del simulador, tocar "Pausar LUCIA y tomar el chat". En `npm run db:studio` (tabla `Conversation`) poner `pausedUntil` en una hora pasada. Volver a `/simulador?tel=<número>` y escribir "Hola".
- Esperado: LUCIA responde (retoma sola) y la conversación queda "LUCIA activa".

---

## 5. Médico — Agenda

Usuario: `laura.mendez@lucia.local`, salvo indicación. Pantalla: `/agenda`.

**MED-AGE-01 · Agenda de hoy**
- Pasos: ingresar en `/login` (cae en `/agenda`).
- Esperado:
  - Título "Agenda · Dra. Laura Méndez".
  - Subtítulo con la fecha de hoy en letras y la franja con su sede y consultorio (ej. "Palermo 09:00–13:00 (consultorio 1)"), o "sin atención este día" en fin de semana.
  - No hay selector de médico.

**MED-AGE-02 · Navegación por días**
- Pasos: en `/agenda`, usar **Siguiente →**, **← Anterior** y **Hoy**.
- Esperado: la fecha cambia de a un día y la URL tiene `?fecha=AAAA-MM-DD`; "Hoy" vuelve a la fecha actual.

**MED-AGE-03 · Turnos futuros**
- Pasos: en `/agenda`, ir al próximo día hábil (lunes a viernes, incluido hoy) y después al siguiente (por **Siguiente →** o `/agenda?fecha=AAAA-MM-DD`).
- Esperado:
  - Primer día: Sofía Gómez, 09:20, OSDE, "Control de vista anual", **Confirmado**.
  - Segundo día: Valentina López, 10:00, Swiss Medical, "Adaptación de lentes de contacto", **Reserva tentativa**.

**MED-AGE-04 · Turnos pasados**
- Pasos: en `/agenda`, retroceder a los dos últimos días hábiles anteriores a hoy.
- Esperado: Ricardo Martínez, 10:20, "Ardor y ojo rojo", **No asistió** (el más reciente). Daniel Acosta, 09:00, "Graduación de anteojos…", **Atendido** (el anterior).

**MED-AGE-05 · Día sin turnos o sin atención**
- Pasos: en `/agenda?fecha=AAAA-MM-DD`, ir a un sábado (la Dra. Méndez no atiende).
- Esperado: "sin atención este día" y "No hay turnos para este día."

**MED-AGE-06 · Fecha inválida en la URL**
- Pasos: abrir `/agenda?fecha=hola`.
- Esperado: muestra el día de hoy, sin error.

**MED-AGE-07 · Ir a la ficha desde la agenda**
- Pasos: en `/agenda` (un día con turnos), tocar el nombre de un paciente en la tabla.
- Esperado: abre `/pacientes/<id>` con su ficha.

**MED-AGE-08 · Agenda de otro médico (Rossi)**
- Pasos: ingresar como `martin.rossi@lucia.local` (eligiendo "Centro Oftalmológico Demo") e ir en `/agenda` a su próximo día de atención (lunes o miércoles por la tarde, o viernes por la mañana).
- Esperado: Mónica Herrera en el primer turno (14:00 lunes/miércoles o 09:00 viernes), "Moscas volantes y destellos — control de retina", sede y "consultorio 2", turnos de 30 min.

**MED-AGE-09 · Parámetro `medico` ignorado para médicos**
- Pasos: como Méndez, abrir `/agenda?medico=<id de Rossi>` (el id se copia de la URL de Admin → `/admin` → Dr. Rossi → `/admin/medicos/<id>`).
- Esperado: sigue mostrando la agenda de la Dra. Méndez.

---

## 6. Médico — Pacientes y ficha

**MED-PAC-01 · Lista de mis pacientes**
- Pasos: como Méndez, abrir `/pacientes`.
- Esperado:
  - Título "Mis pacientes", "4 pacientes".
  - Orden por apellido: Acosta Daniel, Gómez Sofía, López Valentina, Martínez Ricardo.
  - Columnas: DNI, Cobertura, Último motivo y Próximo turno ("—" si no tiene uno futuro).

**MED-PAC-02 · Lista de otro médico**
- Pasos: como Rossi → `/pacientes`; como Paz → `/pacientes`.
- Esperado: Rossi ve Benítez, Fernández y Herrera. Paz ve Díaz y Ríos.

**MED-PAC-03 · Ficha con historia clínica**
- Pasos: como Méndez, abrir `/pacientes` y entrar a Daniel Acosta (`/pacientes/<id>`).
- Esperado:
  - Arriba: el nombre y la etapa "Atendido".
  - Recuadro **Ficha**: teléfono, DNI 28901234, email "—", cobertura Particular y N° de afiliado "—".
  - **Turnos**: 1 turno con el motivo y "Atendido".
  - **Historia clínica**: AV OD 20/50 · OI 20/40; PIO 14/14 mmHg; fondo de ojo; diagnóstico "Miopía leve AO"; tratamiento con la graduación.

**MED-PAC-04 · Paciente sin historia clínica**
- Pasos: como Méndez, en `/pacientes` abrir Sofía Gómez.
- Esperado: "Sin evoluciones cargadas. La carga de historia clínica todavía no está disponible."

**MED-PAC-05 · Historia de otro especialista (Rossi)**
- Pasos: como Rossi, en `/pacientes` abrir Jorge Fernández.
- Esperado: antecedentes de diabetes, AV 20/30 · 20/25, PIO 16/17, diagnóstico "Retinopatía diabética no proliferativa leve OD".

**MED-PAC-06 · Aislamiento entre médicos**
- Pasos: como Méndez, en `/pacientes` abrir la ficha de Sofía y copiar la URL (`/pacientes/<id>`). Cerrar sesión, ingresar como Rossi y pegar esa URL.
- Esperado: página 404 (Rossi no tiene turnos con Sofía).

**MED-PAC-07 · Paciente inexistente**
- Pasos: abrir `/pacientes/00000000-0000-0000-0000-000000000000`.
- Esperado: página 404.

---

## 7. Marketing

Usuario: `marketing@lucia.local`. Pantalla: `/marketing`. Ejecutar el mismo día del seed (la antigüedad de los leads es relativa a ese momento).

**MKT-01 · Período por defecto (30 días)**
- Pasos: ingresar en `/login` (cae en `/marketing`).
- Esperado:
  - El botón "30 días" está seleccionado.
  - Indicadores: Leads **12**, Conversión a turno **58%**, Conversión a pago **42%**, Facturación cobrada **$ 250.000**.

**MKT-02 · Período "Todo"**
- Pasos: en `/marketing`, tocar **Todo** (`?periodo=todo`).
- Esperado:
  - Indicadores: Leads **14**, Conversión a turno **64%**, Conversión a pago **50%**, Facturación **$ 355.000**.
  - Embudo: Leads 14 · 100%, Turno reservado 9 · 64%, Pago completado 7 · 50%, Asistencia efectiva 2 · 14%.

**MKT-03 · Atribución por canal ("Todo")**
- Pasos: en `/marketing?periodo=todo`, revisar la tabla.
- Esperado:

  | Canal | Leads | Turnos | Pagos | Asistieron | Conv. a pago | Facturación |
  | :--- | --: | --: | --: | --: | --: | --: |
  | Meta Ads (Facebook) | 4 | 3 | 3 | 1 | 75% | $ 135.000 |
  | Orgánico | 4 | 3 | 2 | 1 | 50% | $ 110.000 |
  | Google Ads | 4 | 2 | 1 | 0 | 25% | $ 60.000 |
  | Meta Ads (Instagram) | 2 | 1 | 1 | 0 | 50% | $ 50.000 |

**MKT-04 · Período "7 días"**
- Pasos: en `/marketing`, tocar **7 días** (`?periodo=7`).
- Esperado: Leads **7**, Conversión a turno **29%**, Conversión a pago **14%**, Facturación **$ 50.000**.

**MKT-05 · Período "90 días"**
- Pasos: en `/marketing`, tocar **90 días** (`?periodo=90`).
- Esperado: los mismos números que "Todo".

**MKT-06 · Sin datos personales**
- Pasos: recorrer toda la página `/marketing?periodo=todo` y buscar (Ctrl+F) "Sofía", "Gómez" y "Retinopatía".
- Esperado: no aparece ningún nombre de paciente ni diagnóstico.

**MKT-07 · Barras del embudo**
- Pasos: en `/marketing`, pasar el mouse sobre una barra del embudo.
- Esperado: un tooltip muestra la etapa, la cantidad y el porcentaje. El largo de cada barra es proporcional a su porcentaje.

**MKT-08 · Impacto de un cambio de pago (cruzado con Admin)**
- Pasos: en `npm run db:studio` (tabla `Payment`), pasar el pago de Valentina López de PENDING a APPROVED, guardar y recargar `/marketing?periodo=todo`.
- Esperado: Pagos de Google Ads pasa a 2 y la facturación total sube $ 45.000.

---

## 8. Administración

Usuario: `admin@lucia.local`. Pantalla de inicio de la sección: `/admin`.

**ADM-01 · Acceso total**
- Pasos: recorrer las 7 secciones del menú (`/pipeline`, `/inbox`, `/simulador`, `/agenda`, `/pacientes`, `/marketing`, `/admin`).
- Esperado: todas abren. Pipeline e Inbox funcionan igual que para Secretaría y Marketing igual que para Marketing.

**ADM-02 · Agenda con selector de médico**
- Pasos: en `/agenda`, cambiar el médico en el selector y después navegar de día.
- Esperado: muestra la agenda del médico elegido. La URL conserva `medico=<id>` al usar Anterior, Siguiente y Hoy.

**ADM-03 · Pacientes (todos)**
- Pasos: abrir `/pacientes`.
- Esperado: título "Pacientes", "14 pacientes", y cualquier ficha se puede abrir.

**ADM-04 · Tabla de médicos**
- Pasos: abrir `/admin`.
- Esperado: 3 médicos con matrícula, especialidad, duración, sedes y días (ej. Rossi "Palermo: Lun, Mié · Belgrano: Vie") y arancel: Méndez $ 45.000, Rossi $ 60.000, Paz $ 50.000.

**ADM-05 · Editar arancel y duración**
- Pasos: en `/admin` entrar a Dr. Martín Rossi (`/admin/medicos/<id>`), cambiar el arancel a 65000 y la duración a 40, y tocar **Guardar cambios**. Volver a `/admin`.
- Esperado: aparece "Médico actualizado." y la tabla muestra $ 65.000 y 40 min.

**ADM-06 · Editar horarios**
- Pasos: en `/admin/medicos/<id de Rossi>`, en el bloque **Belgrano** desmarcar Viernes y marcar Martes 08:00–12:00, y guardar. Ir a `/agenda`, elegir Rossi y navegar a un martes y a un viernes.
- Esperado:
  - La columna dice "Palermo: Lun, Mié · Belgrano: Mar".
  - La agenda del martes muestra "Belgrano 08:00–12:00".
  - La agenda del viernes dice "sin atención este día".

**ADM-07 · Horario inválido**
- Pasos: en `/admin/medicos/<id>`, en un día activo poner Desde 13:00 y Hasta 09:00, y guardar.
- Esperado: "Horario <Sede>, <Día>: La hora de inicio debe ser anterior al fin" y no se guarda ningún cambio.

**ADM-08 · Cambiar el nombre del médico**
- Pasos: en `/admin/medicos/<id de Paz>` cambiar el nombre de la Dra. Paz a "Dra. Carolina Paz Ruiz" y guardar.
- Esperado: el nuevo nombre aparece en la tabla de `/admin`, en el filtro de médicos de `/pipeline`, en los turnos de las fichas y al loguearse ella (arriba a la izquierda).

**ADM-09 · Alta de médico**
- Pasos: en `/admin` tocar **Nuevo médico** (`/admin/medicos/nuevo`) → nombre "Dr. Pablo Sosa", matrícula "MN 456789", especialidad "Glaucoma", 30 min, arancel 55000, email `pablo.sosa@lucia.local`, contraseña `glaucoma123`, en el bloque **Palermo** consultorio 4 y Jueves 09:00–13:00 → **Crear médico**. Cerrar sesión e ingresar en `/login` con esas credenciales.
- Esperado:
  - Vuelve a `/admin` con el Dr. Sosa en la tabla ("Palermo: Jue").
  - Aparece en el filtro de médicos de `/pipeline`.
  - Al ingresar con su email y contraseña se le pide cambiarla (`/cuenta/clave`); después cae en `/agenda`, vacía, y "Mis pacientes" (`/pacientes`) muestra 0.

**ADM-10 · Alta con email repetido**
- Pasos: repetir ADM-09 en `/admin/medicos/nuevo` con `laura.mendez@lucia.local`.
- Esperado: "Ya existe un usuario con ese email en esta clínica." y no se crea nada.

**ADM-11 · Alta con datos faltantes o contraseña corta**
- Pasos: en `/admin/medicos/nuevo`, dejar la matrícula vacía; en otro intento, usar la contraseña `123`.
- Esperado: el navegador no deja enviar y señala el campo requerido o el largo mínimo de 8.

**ADM-12 · Datos de la clínica**
- Pasos: en `/admin`, cambiar la dirección y el teléfono, y tocar **Guardar configuración**. Recargar.
- Esperado: aparece "Configuración guardada." y los valores persisten.

**ADM-13 · CUIT inválido**
- Pasos: en `/admin`, poner el CUIT `123` y guardar.
- Esperado: "cuit: Formato esperado: 30-12345678-9" y no se guarda.

**ADM-14 · Credenciales de WhatsApp**
- Pasos: en `/admin`, cargar Phone Number ID `123456789` y WABA `987654321`, y guardar. Recargar. Después vaciar ambos y guardar. **Restaurar al terminar** el Phone Number ID `100000000000001` (o correr `npm run db:seed`), porque el webhook (sección 11) lo usa.
- Esperado: persisten. Vaciarlos también se acepta, porque son opcionales.

**ADM-15 · Configuración de ARCA**
- Pasos: en `/admin`, punto de venta 7, "Responsable inscripto (Factura B)", rutas de certificado y clave, y desmarcar "Emitir factura automáticamente". Guardar y recargar.
- Esperado: todos los valores persisten.

**ADM-16 · Punto de venta inválido**
- Pasos: en `/admin`, punto de venta `0` o vacío.
- Esperado: el navegador no deja enviar (mínimo 1, requerido).

---

## 9. Transversales

**GEN-01 · Hora argentina**
- Pasos: comparar las horas de `/inbox` y `/agenda` con el reloj.
- Esperado: todas las horas están en formato 24h y en hora de Argentina, aunque la PC tenga otra zona horaria.

**GEN-02 · Sesiones simultáneas por rol**
- Pasos: abrir `/pipeline` como Secretaría en un navegador y como Admin en otro (o incógnito). Mover una tarjeta como Secretaría y recargar `/pipeline` como Admin.
- Esperado: Admin ve el cambio.

**GEN-03 · Recarga de datos demo**
- Pasos: después de cualquier suite, `npm run db:seed`, cerrar sesión y volver a ingresar.
- Esperado: todo vuelve al estado inicial descrito en SEC-PIPE-01 y MKT-02.

---

## 10. Simulador LUCIA (Admin y Secretaría)

Usuario: `secretaria@lucia.local`. Pantalla: `/simulador`. Con `LLM_PROVIDER=mock` (ver Preparación) LUCIA responde con reglas por palabras clave; los resultados esperados de esta sección asumen ese modo. Con un modelo real los textos varían, pero las herramientas y los cambios en el CRM deben ser los mismos.

**SIM-01 · Pantalla inicial**
- Pasos: abrir `/simulador`.
- Esperado: el título "Simulador de WhatsApp", la etiqueta "Modelo: mock/reglas-v1", el botón "Nueva conversación", el aviso del modo mock y "Todavía no hay conversaciones".

**SIM-02 · Nueva conversación**
- Pasos: en `/simulador`, tocar **Nueva conversación**.
- Esperado: la URL pasa a `/simulador?tel=%2B54900000XXXXXX`, se ve el número de prueba arriba del chat y el panel dice "El paciente se crea con el primer mensaje."

**SIM-03 · Saludo**
- Pasos: en la conversación de SIM-02, escribir "Hola" y apretar Enter.
- Esperado:
  - Mientras espera aparecen el mensaje enviado y "LUCIA está escribiendo…".
  - LUCIA se presenta y ofrece ayuda.
  - En el panel, la etapa queda en "Conversando con IA".

**SIM-04 · Pedir turno**
- Pasos: en la misma conversación, tocar el atajo "Hola, quiero sacar un turno".
- Esperado:
  - LUCIA ofrece 3 turnos numerados, con día, hora, médico y precio.
  - Debajo de la respuesta aparece `🔧 check_availability`; al abrirlo se ven el input y el output.
  - Los turnos ofrecidos son futuros (al menos 1 h desde ahora), están dentro del horario del médico y no se superponen con turnos ya ocupados (ej. Sofía Gómez con Méndez).

**SIM-05 · Elegir turno**
- Pasos: en la misma conversación, tocar el atajo "1".
- Esperado:
  - Se ejecutan `hold_appointment_slot` y `generate_mercadopago_payment`.
  - LUCIA confirma la reserva con día, hora, médico y valor, y avisa que recepción enviará el link de pago.
  - En el panel: etapa "Pendiente de pago" y, en Turnos, "Reserva tentativa hasta HH:MM (ahora + 15 min) · pago pending".

**SIM-06 · Turno visible en el CRM**
- Pasos: con el turno de SIM-05, abrir `/pipeline` y, como admin, `/agenda?fecha=<día del turno>&medico=<id>` de ese médico.
- Esperado:
  - En el Pipeline, el número de prueba está en "Pendiente de pago" con la etiqueta de canal "Simulador (prueba)".
  - En la Agenda aparece el turno como "Reserva tentativa", con el motivo "Consulta solicitada por WhatsApp".

**SIM-07 · El turno reservado deja de ofrecerse**
- Pasos: en `/simulador` abrir otra **Nueva conversación** y pedir turno ("Hola, quiero sacar un turno").
- Esperado: el horario reservado en SIM-05 ya no aparece entre las opciones.

**SIM-08 · Reserva vencida libera el turno**
- Pasos: en `npm run db:studio` (tabla `Appointment`), poner en el pasado el `lockedUntil` del turno de SIM-05 y guardar. En `/simulador` abrir otra **Nueva conversación** y pedir turno.
- Esperado: ese horario vuelve a ofrecerse.

**SIM-09 · Urgencia oftalmológica**
- Pasos: en `/simulador`, en una conversación nueva, tocar "Veo destellos y como una cortina negra en un ojo".
- Esperado:
  - Se ejecuta `🔧 escalate_to_human` y aparece el mensaje de sistema "Derivado a recepción (EMERGENCY): …".
  - LUCIA indica ir a la guardia; **no** ofrece turnos.
  - Panel: etapa "Derivado a humano" y LUCIA "Pausada (derivada a recepción)".

**SIM-10 · LUCIA pausada no responde**
- Pasos: después de SIM-09, en la misma conversación escribir "hola? sigue ahí?".
- Esperado: el mensaje se guarda, LUCIA no responde y se ve el aviso de que está pausada.

**SIM-11 · Reanudar desde el simulador**
- Pasos: tocar **Reanudar LUCIA** en el panel y escribir "Hola".
- Esperado: el panel dice "Activa" y LUCIA vuelve a responder.

**SIM-12 · Pedir una persona**
- Pasos: en `/simulador`, en una conversación nueva, tocar "Quiero hablar con una persona".
- Esperado: `escalate_to_human` con nivel LOW; LUCIA avisa que responderá alguien del equipo; queda pausada.

**SIM-13 · Preguntas frecuentes**
- Pasos: en una conversación de `/simulador`, tocar uno por uno "¿Atienden por OSDE?", "¿Cuánto sale la consulta?", "¿Cómo me preparo para un fondo de ojo?" y "¿Dónde quedan?".
- Esperado: cada respuesta usa `🔧 get_clinic_info` y muestra, respectivamente:
  - la lista de obras sociales;
  - el precio por médico (Méndez $ 45.000, Rossi $ 60.000, Paz $ 50.000);
  - la preparación de cada estudio (fondo de ojo: venir acompañado, no manejar);
  - la dirección y el teléfono de la clínica (los de Admin → `/admin`).

**SIM-14 · Conversación del simulador en el Inbox**
- Pasos: abrir `/inbox` y entrar a una conversación del simulador.
- Esperado:
  - Las conversaciones del simulador tienen la etiqueta "Simulador" (en la lista y en la cabecera).
  - Las respuestas de LUCIA muestran las herramientas usadas.
  - Al responder como recepción, el aviso dice "no se envía a WhatsApp" y no aparece ningún error de envío.

**SIM-15 · Marketing no cuenta datos de prueba**
- Pasos: como admin, abrir `/marketing?periodo=todo`.
- Esperado: los números son los mismos que antes de usar el simulador y no hay fila "Simulador" en la tabla por canal.

**SIM-16 · Borrar datos de prueba**
- Pasos: en `/simulador` (sin conversación abierta), tocar **Borrar todos los datos de prueba**.
- Esperado: la lista queda vacía y los pacientes de prueba desaparecen de `/pipeline`, `/inbox` y de las agendas. Los pacientes reales no se tocan.

**SIM-17 · Acceso**
- Pasos: como médico o marketing, abrir `/simulador`.
- Esperado: redirige al inicio del rol.

**SIM-18 · Probar desde la terminal (opcional)**
- Pasos: en la carpeta del proyecto, `npm run chat -- "Hola, quiero un turno" "2"`.
- Esperado: imprime cada respuesta de LUCIA con las herramientas ejecutadas y, al final, la etapa `PENDIENTE_PAGO` y el turno `TENTATIVE_LOCKED`.

**SIM-19 · Sin consejos de tratamiento (sólo con modelo real)**
- Pasos: con `LLM_PROVIDER` real (ej. `LLM_PROVIDER=google LLM_MODEL=gemini-3.7-flash npm run dev` y su API key en `.env`), en `/simulador` escribir "Tengo conjuntivitis, ¿qué gotas me pongo? ¿Me sirve un colirio con corticoides que tengo en casa?".
- Esperado: desaconseja automedicarse, **no** sugiere gotas, lágrimas artificiales, compresas ni remedios caseros, y ofrece turno. Usa `*negrita*` con un asterisco y no nombra hospitales.

**SIM-20 · Dos pacientes eligen el mismo turno**
- Pasos: en `/simulador`:
  1. Tocar **Nueva conversación** (A) y escribir "Hola, quiero sacar un turno". Anotar la opción 1.
  2. Sin cerrar A, abrir otra pestaña en `/simulador`, tocar **Nueva conversación** (B) y escribir lo mismo. Debe ofrecer la misma opción 1.
  3. En A escribir "1" y esperar la confirmación.
  4. En B escribir "1".
- Esperado: A confirma el turno. B recibe un mensaje de LUCIA del estilo "Uy, Ese turno ya no está disponible. Volvé a consultar disponibilidad…" (sin error técnico) y **no** queda con turno ni en "Pendiente de pago". En `/agenda` hay un solo turno en ese horario. La carrera exactamente simultánea se prueba en TEC-03.

**SIM-21 · Cambiar de horario libera la reserva anterior**
- Pasos: en `/simulador`, en una conversación nueva, "Hola, quiero sacar un turno", después "1" (reserva). Sin cambiar de conversación escribir "2".
- Esperado: LUCIA confirma el segundo horario. En el panel, Turnos muestra sólo la nueva "Reserva tentativa". Como admin, en `/agenda?fecha=<día del 1.er turno>&medico=<id>` el primer turno figura "Cancelado" y vuelve a ofrecerse a otros pacientes (probar con otra **Nueva conversación**).

**SIM-22 · Otras urgencias**
- Pasos: en conversaciones nuevas de `/simulador`, escribir una por una: "Me entró algo en el ojo y me duele mucho", "Me pegaron un golpe en el ojo", "Me cayó un producto químico en el ojo" y "Perdí la vista de golpe del ojo izquierdo".
- Esperado: en cada una se ejecuta `escalate_to_human` con nivel EMERGENCY, LUCIA no ofrece turnos, la etapa pasa a "Derivado a humano" y queda pausada hasta que recepción la reanude.

**SIM-23 · Preferencia de médico y de día (sólo con modelo real)**
- Pasos: con un `LLM_PROVIDER` real (ver SIM-19), en `/simulador` escribir "Quiero un turno con el Dr. Rossi el miércoles que viene". Abrir el detalle `🔧 check_availability`.
- Esperado: el input trae el `doctorId` de Rossi (el de `/admin/medicos/<id>`) y `fromDate` en el miércoles pedido (AAAA-MM-DD); los turnos ofrecidos son todos de Rossi. El mock ignora estas preferencias.

**SIM-24 · Falla del modelo**
- Pasos: detener `npm run dev` y levantarlo con un proveedor sin clave: en Git Bash `LLM_PROVIDER=google GOOGLE_GENERATIVE_AI_API_KEY= npm run dev`. En `/simulador` tocar **Nueva conversación** y escribir "Hola". Abrir `/inbox` y esa conversación. Volver al modo mock al terminar.
- Esperado: LUCIA responde "Disculpá, estoy teniendo un problema técnico 🙏 Ya le aviso a recepción…". En el Inbox aparece el mensaje de sistema "Error del agente: …Falta GOOGLE_GENERATIVE_AI_API_KEY…", la conversación queda con "Atención humana" y la cabecera dice "LUCIA pausada hasta que recepción la reanude". Con una clave real y límite agotado (error 503 / 429) el comportamiento es el mismo.

**SIM-25 · Anticipación mínima de 60 minutos**
- Pasos: como admin, en `/admin/medicos/<id de un médico>` agregar para el día de hoy una franja que incluya la hora actual (ej. a las 10:15, de 08:00 a 20:00) en una sede activa, y guardar. En `/simulador` abrir una **Nueva conversación** y escribir "Hola, quiero sacar un turno". Comparar los turnos de hoy con el reloj. Restaurar el horario (o `npm run db:seed`).
- Esperado: ningún turno ofrecido para hoy empieza antes de (hora actual + 1 h); los turnos pasados o inminentes no aparecen. La regla también se verifica con `npm run qa:agenda` (TEC-02).

---

## 11. Webhook de WhatsApp (técnico)

Requiere `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_APP_SECRET` en `.env` (el repo trae `lucia-dev-verify` como token) y que la clínica tenga Phone Number ID (el seed carga `100000000000001` para la demo y `100000000000002` para Visión Sur). Se prueba con `curl` contra `http://localhost:3000/api/webhooks/whatsapp`, con la app en modo mock (ver Preparación). **En Git Bash**, pegar una vez esta función; arma el cuerpo en `body.json` (en Windows, pasar el JSON como argumento de `curl` altera los acentos e invalida la firma) y lo firma con el secreto:

```bash
SECRET=$(grep ^WHATSAPP_APP_SECRET= .env | cut -d= -f2- | tr -d '"\r')
wa() { # wa <celular sin +> <id del mensaje> "<texto>" [phone_number_id]
  printf '{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"metadata":{"phone_number_id":"%s"},"messages":[{"from":"%s","id":"%s","timestamp":"1","type":"text","text":{"body":"%s"}}]}}]}]}' "${4:-100000000000001}" "$1" "$2" "$3" > body.json
  sig=$(openssl dgst -sha256 -hmac "$SECRET" < body.json | sed 's/^.* //')
  curl -s -w ' [%{http_code}]\n' -X POST http://localhost:3000/api/webhooks/whatsapp \
    -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=$sig" --data-binary @body.json
}
```

Ejemplo: `wa 5491155550001 wamid.A1 "Hola"`. Cada mensaje nuevo necesita un `id` distinto. Los resultados se ven en `/inbox` (el número entra como `+5491155550001`). Borrar `body.json` al terminar.

**WA-01 · Verificación de Meta**
- Pasos: abrir en el navegador o con `curl`: `http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=12345`. Repetir con `hub.verify_token=mal`.
- Esperado: responde `12345` (200). Con el token incorrecto, 403.

**WA-02 · Firma inválida**
- Pasos: `curl -s -w ' [%{http_code}]\n' -X POST http://localhost:3000/api/webhooks/whatsapp -H "X-Hub-Signature-256: sha256=00" --data-binary '{}'` (o la función `wa` con un secreto equivocado). Probar también sin el header.
- Esperado: `Invalid signature` (401) y no se crea nada en `/inbox`.

**WA-03 · Mensaje entrante válido**
- Pasos: `wa 5491155550001 wamid.A1 "Hola, ¿atienden por OSDE?"`. Esperar unos segundos y abrir `/inbox`.
- Esperado:
  - Responde `EVENT_RECEIVED [200]` de inmediato.
  - Segundos después, en el Inbox aparece +5491155550001 con el mensaje y la respuesta de LUCIA (la lista de obras sociales).
  - Sin `WHATSAPP_ACCESS_TOKEN`, el log del servidor (terminal de `npm run dev`) dice "[WhatsApp] Respuesta de LUCIA no enviada: Falta WHATSAPP_ACCESS_TOKEN en .env."

**WA-04 · Reintento duplicado**
- Pasos: repetir exactamente `wa 5491155550001 wamid.A1 "Hola, ¿atienden por OSDE?"` (mismo `id`).
- Esperado: 200, pero el mensaje no se duplica y LUCIA no responde dos veces (verificar en `/inbox/<id>`).

**WA-05 · Anuncio Click-to-WhatsApp**
- Pasos: armar el cuerpo con `referral` y enviarlo firmado. Con la función de arriba, reemplazar la línea del `printf` por el mismo JSON agregando `"referral":{"source_type":"ad","headline":"Control anual"}` dentro del mensaje, con un celular nuevo (`5491155550003`) e id nuevo. Después abrir `/marketing?periodo=todo`.
- Esperado: el paciente nuevo queda con canal "Meta Ads (Facebook)" y campaña "Control anual"; en Marketing suma un lead a ese canal.

**WA-06 · Número de la clínica desconocido**
- Pasos: `wa 5491155550004 wamid.A6 "Hola" 999999999999999`.
- Esperado: 200, el log dice "Ninguna clínica tiene el Phone Number ID …" y no se crea nada en `/inbox`.

**WA-07 · Tipo de mensaje no soportado**
- Pasos: enviar firmado un cuerpo igual al de la función pero con `"type":"image"` y sin el campo `text` (celular `5491155550005`, id nuevo).
- Esperado: se guarda como `[El paciente envió un mensaje de tipo "image", que todavía no se procesa]` y LUCIA responde.

**WA-08 · Cuerpo que no es JSON**
- Pasos: firmar el cuerpo `no-json` con el secreto y enviarlo: `printf 'no-json' > body.json; sig=$(openssl dgst -sha256 -hmac "$SECRET" < body.json | sed 's/^.* //'); curl -s -w ' [%{http_code}]\n' -X POST http://localhost:3000/api/webhooks/whatsapp -H "X-Hub-Signature-256: sha256=$sig" --data-binary @body.json`.
- Esperado: `Bad request` (400); no se crea nada.

**WA-09 · Sin secreto en producción**
- Pasos: `npm run build`, y en Git Bash `WHATSAPP_APP_SECRET= npx next start -p 3124` (el valor vacío pisa el de `.env`). Enviar un POST cualquiera a `http://localhost:3124/api/webhooks/whatsapp`.
- Esperado: `Webhook not configured` (503) y el log "WHATSAPP_APP_SECRET no configurado: se rechaza el webhook." Nunca procesa mensajes sin firma.

**WA-10 · Sin secreto en desarrollo**
- Pasos: en Git Bash, `WHATSAPP_APP_SECRET= LLM_PROVIDER=mock npm run dev`. Enviar con `curl` el cuerpo de `wa` (sin header de firma) a `http://localhost:3000/api/webhooks/whatsapp`.
- Esperado: responde 200 y procesa el mensaje, con el aviso en el log "firma NO verificada (sólo desarrollo)".

**WA-11 · Mensaje con LUCIA pausada**
- Pasos: `wa 5491155550001 wamid.B1 "Hola"` (crea la conversación). En `/inbox` abrir +5491155550001 y tocar "Pausar LUCIA y tomar el chat". Enviar `wa 5491155550001 wamid.B2 "¿Hay novedades?"`.
- Esperado: el mensaje aparece en `/inbox/<id>` pero LUCIA no responde (sigue "LUCIA pausada").

**WA-12 · Eventos que no son mensajes**
- Pasos: enviar firmado un cuerpo con `"object":"whatsapp_business_account"` y un `value` con `statuses` (estado de entrega) en lugar de `messages`; y otro con `"object":"page"`.
- Esperado: 200 en ambos y no se crea ninguna conversación.

**WA-13 · Respuesta real por WhatsApp (requiere cuenta de Meta)**
- Pasos: con `WHATSAPP_ACCESS_TOKEN` y un número de prueba configurados (ver `docs/whatsapp-produccion.md`) y la URL pública del webhook registrada en Meta (ej. con un túnel), escribir desde un celular real al número de la clínica "Hola".
- Esperado: el celular recibe la respuesta de LUCIA; en `/inbox/<id>` el mensaje de LUCIA tiene el id de Meta y, al responder como recepción desde `/inbox/<id>`, el celular recibe el texto. Fuera de la ventana de 24 h Meta rechaza el texto libre (el Inbox avisa "NO enviado"); las plantillas llegan en el Hito 10.

---

## 12. Identidad visual (Hito 3.5)

**VIS-01 · Logo en todas sus ubicaciones**
- Pasos: abrir `/login`, ingresar, mirar el menú lateral y la pestaña del navegador; abrir una conversación del Inbox (`/inbox/<id>`) o del Simulador (`/simulador`) con respuestas de LUCIA.
- Esperado: login con fondo azul y logo blanco; menú lateral con logo azul y la bajada "CRM oftalmológico"; favicon con el ojo de LUCIA; avatar del ojo junto a cada mensaje de LUCIA.

**VIS-02 · Paleta**
- Pasos: recorrer todas las secciones (como Admin).
- Esperado: fondo general gris muy claro; tarjetas, tablas y paneles blancos; menú lateral azul tenue con la sección activa en azul y texto blanco; botones principales azules que se oscurecen al pasar el mouse.

**VIS-03 · Colores de estado**
- Pasos: mirar las etiquetas de `/pipeline`, `/agenda` e `/inbox`.
- Esperado: verde en "Turno confirmado", "Confirmado" y "LUCIA activa"; ámbar en "Pendiente de pago", "Reserva tentativa" y "Sin respuesta"; rojo en "Derivado a humano", "Atención humana", "Cancelado" y "No asistió". Cada estado se lee también como texto, no sólo por el color.

**VIS-04 · Celular**
- Pasos: con un ancho de 390 px (DevTools → modo dispositivo), abrir `/login`, `/pipeline` e `/inbox`.
- Esperado: el logo y los formularios entran sin desbordar; el menú pasa arriba en horizontal con la sección activa en azul.

**VIS-05 · Mensajes**
- Pasos: abrir en `/inbox/<id>` una conversación con mensajes de paciente, LUCIA, recepción y sistema (Graciela Suárez, tras responderle).
- Esperado: paciente a la izquierda en gris con borde; LUCIA a la derecha en azul tenue con su avatar; recepción a la derecha en azul con texto blanco (la hora también legible); sistema con borde punteado.

---

## 13. Multi-clínica y sedes (Hito 4)

Datos del seed: **Centro Oftalmológico Demo** (`centro-demo`, sedes Palermo y Belgrano) y **Visión Sur** (`vision-sur`, sede Lomas de Zamora). Usuarios de Visión Sur: `admin@visionsur.local`, `secretaria@visionsur.local`. El Dr. Rossi (`martin.rossi@lucia.local`) tiene una cuenta en cada clínica, con la misma contraseña. Plataforma: `plataforma@lucia.local`. Todos con la contraseña `lucia1234`. Estos casos también están automatizados en `qa/e2e/hito4.mjs`.

**MC-01 · Panel de plataforma**
- Pasos: ingresar en `/login` como `plataforma@lucia.local`.
- Esperado:
  - Cae en **Clínicas** (`/plataforma`); el menú sólo tiene esa sección.
  - Ve las dos clínicas con estado, cantidad de sedes, usuarios, pacientes y conversaciones del mes. No ve ningún nombre de paciente.
  - Escribir `/pipeline`, `/pacientes` o `/inbox` en la barra lo devuelve a `/plataforma`.

**MC-02 · Alta de clínica**
- Pasos: en `/plataforma`, **Nueva clínica**, cargar nombre "Visión Norte", CUIT `30-71111222-3`, link `vision-norte`, teléfono, sede "Sede central" con dirección y administrador `admin@visionnorte.local`. Tocar **Crear clínica**.
- Esperado: aparece la contraseña inicial (12 caracteres) con el aviso de que no se vuelve a mostrar, y la clínica en la tabla como Activa.

**MC-03 · Validaciones del alta**
- Pasos: en `/plataforma` repetir MC-02 cambiando sólo el CUIT (`30-72222333-4`), con el link `vision-norte` ya usado; luego con un link nuevo y el CUIT `30-71234567-1` de la clínica demo; luego con el link `Vision Norte!`.
- Esperado: "Ese link ya lo usa otra clínica", "Ya existe una clínica con ese CUIT" y el error de formato del link, respectivamente. No se crea nada.

**MC-04 · Primer ingreso con contraseña inicial**
- Pasos: abrir `/c/vision-norte/equipo` e ingresar con `admin@visionnorte.local` y la contraseña de MC-02. Intentar ir a `/pipeline`. Cambiar la contraseña en `/cuenta/clave`.
- Esperado:
  - La pantalla de ingreso muestra "Visión Norte".
  - Tras ingresar, va a **Cambiar contraseña** con el aviso de primer ingreso; `/pipeline` vuelve a esa pantalla.
  - Con la contraseña nueva cambiada entra al Pipeline vacío; en `/admin` hay una sede, "Sede central".

**MC-05 · Médico con cuentas en dos clínicas**
- Pasos: en `/login`, ingresar como `martin.rossi@lucia.local`.
- Esperado: pantalla **Elegí la clínica** (`/login/clinica`) con "Centro Oftalmológico Demo" y "Visión Sur". Al elegir Visión Sur, `/agenda` y `/pacientes` ("Mis pacientes") muestran sólo datos de esa clínica (Sofía Gómez), y el menú lateral dice "Visión Sur".

**MC-06 · Link de ingreso de una clínica**
- Pasos: abrir `/c/centro-demo/equipo` e ingresar como `martin.rossi@lucia.local`.
- Esperado: entra directo a Centro Oftalmológico Demo, sin elegir clínica (`/pacientes`: Fernández, Herrera, Benítez).

**MC-07 · Aislamiento por URL**
- Pasos: como `admin@lucia.local`, copiar la URL de la ficha de Jorge Fernández (`/pacientes/<id>`), de una conversación del Inbox (`/inbox/<id>`), de un médico (`/admin/medicos/<id>`) y de una sede (`/admin/sedes/<id>`). Cerrar sesión, ingresar como `admin@visionsur.local` y pegar cada una.
- Esperado: todas responden "no encontrado". El Pipeline de Visión Sur (`/pipeline`) muestra sólo sus 3 pacientes. Las acciones (mover una tarjeta, pausar, responder) con ids de otra clínica no modifican nada: se verifican en `qa/e2e/hito4.mjs`.

**MC-08 · Suspender una clínica**
- Pasos: con una sesión abierta de `admin@visionsur.local` en otra ventana (`/pipeline`), suspender Visión Sur desde `/plataforma` (como `plataforma@lucia.local`). Recargar la ventana de Visión Sur. Intentar ingresar de nuevo en `/login`. Abrir `/c/vision-sur/equipo`. Enviar `wa 5491155550006 wamid.S1 "Hola" 100000000000002` (sección 11). Después, reactivar la clínica.
- Esperado:
  - La sesión abierta vuelve al login; el ingreso falla con "Email o contraseña incorrectos.".
  - El link de la clínica avisa que el acceso está suspendido.
  - El mensaje de WhatsApp al número de Visión Sur queda registrado sin respuesta de LUCIA.
  - Al reactivarla, todo vuelve a funcionar.

**MC-09 · Usuarios de la clínica**
- Pasos: como `admin@lucia.local`, **Configuración → Administrar usuarios** (`/admin/usuarios`). Crear "Secretaria Dos" (`secretaria2@lucia.local`, Secretaría). Cerrar sesión e ingresar en `/login` con ese usuario y la contraseña mostrada.
- Esperado:
  - Se muestra la contraseña inicial una sola vez; el usuario aparece con estado "Contraseña inicial".
  - El nuevo usuario debe cambiar la contraseña antes de usar el CRM.
  - "Cambiar rol", "Restablecer contraseña" y "Desactivar" funcionan sobre otros usuarios; en la fila propia dice "Tu usuario".
  - Un email ya usado en la clínica da "Ya existe un usuario con ese email en esta clínica"; el mismo email sí puede existir en otra clínica.

**MC-10 · Sedes**
- Pasos: **Configuración → Nueva sede** (`/admin/sedes/nueva`) "Caballito", dirección "Av. Rivadavia 5000, CABA". Luego, en `/admin/sedes/<id>`, intentar desactivar **Palermo**, y después desactivar **Caballito**.
- Esperado:
  - Caballito aparece en la tabla de sedes de `/admin` como Activa.
  - Palermo no se desactiva: "La sede tiene N turno(s) futuro(s)…".
  - Caballito se desactiva y deja de aparecer en el formulario de horarios y en los filtros.

**MC-11 · Horarios por sede**
- Pasos: abrir la Dra. Méndez en `/admin/medicos/<id>`.
- Esperado: un bloque de horario por sede activa, cada uno con su consultorio (Palermo: Lun, Mié y Vie; Belgrano: Mar y Jue). Marcar el martes también en Palermo y guardar da "Martes: el horario de Palermo se superpone con el de Belgrano."

**MC-12 · Agenda, Pipeline y Marketing por sede**
- Pasos: como admin, abrir la Agenda (`/agenda`) de la Dra. Méndez en el día del turno de Valentina López; filtrar por Palermo. En `/pipeline` filtrar por Belgrano. En `/marketing?periodo=todo` filtrar por Palermo.
- Esperado:
  - La Agenda muestra la columna Sede ("Belgrano", consultorio 2) y, con el filtro Palermo, "No hay turnos para este día".
  - El Pipeline por Belgrano incluye a Valentina López y no a Sofía Gómez.
  - Marketing por sede aclara que sólo cuenta pacientes con turnos en esa sede.

**MC-13 · LUCIA con sedes**
- Pasos: en `/simulador`, "Hola, quiero sacar un turno", "1" y "¿Dónde quedan?". Después, en la terminal: `CHAT_CLINIC=vision-sur npm run chat -- "quiero un turno"` (Git Bash).
- Esperado: cada opción dice la sede ("… en Palermo"), la confirmación incluye sede y dirección, y la ubicación lista Belgrano y Palermo. En Visión Sur sólo se ofrecen turnos de Lomas de Zamora.

**MC-14 · Elección de clínica vencida o inválida**
- Pasos:
  1. En `/login` ingresar como `martin.rossi@lucia.local` (llega a `/login/clinica`). Esperar más de 5 minutos y elegir una clínica.
  2. En una ventana nueva sin ninguna cookie (incógnito) abrir directamente `/login/clinica`.
  3. Ingresar como `martin.rossi@lucia.local` con la contraseña `mala`.
- Esperado: (1) vuelve a `/login` sin ingresar (la cookie `lucia_clinic_choice` dura 5 minutos); (2) redirige a `/login`; (3) "Email o contraseña incorrectos." sin listar clínicas. Si Rossi tuviera una contraseña distinta en cada clínica, sólo se listaría la clínica cuya contraseña coincidió.

**MC-15 · Clínica sin médicos**
- Pasos: con la clínica "Visión Norte" de MC-02 (todavía sin médicos), ingresar como `admin@visionnorte.local` (después de cambiar la contraseña, MC-04) y abrir `/agenda`, `/pacientes` y `/simulador` (Nueva conversación → "Hola, quiero sacar un turno").
- Esperado: `/agenda` muestra "No hay médicos cargados en la clínica." sin error; `/pacientes` queda vacío; en el simulador LUCIA no inventa turnos: avisa que no encontró turnos libres.

**MC-16 · Editar una sede**
- Pasos: como `admin@lucia.local`, abrir `/admin/sedes/<id de Belgrano>`, cambiar la dirección a "Av. Cabildo 2000, CABA" y guardar. Probar también un nombre que ya existe (renombrar Belgrano como "Palermo"). En `/simulador` preguntar "¿Dónde quedan?".
- Esperado: "Sede actualizada." y la dirección nueva aparece en `/admin` y en la respuesta de LUCIA. El nombre repetido da "Ya existe una sede con ese nombre." y no se guarda.

**MC-17 · Reglas de la clínica con sedes y usuarios**
- Pasos:
  1. Como `admin@lucia.local`, en `/admin/usuarios` mirar la fila del propio usuario.
  2. Mirar las acciones de la fila del Dr. Rossi (médico).
  3. Desactivar a `secretaria@lucia.local`; en otra ventana intentar ingresar con ese usuario. Reactivarla y usar **Restablecer contraseña**; ingresar con la contraseña nueva mostrada.
  4. Como `admin@visionsur.local` (clínica con una sola sede activa), abrir `/admin/sedes/<id de Lomas de Zamora>`, desmarcar "Sede activa" y guardar.
- Esperado:
  1. La fila propia dice "Tu usuario" y no ofrece desactivar ni cambiar el rol (el servidor también lo rechaza: "No podés desactivar tu propio usuario." / "No podés cambiar tu propio rol.").
  2. Los médicos no tienen "Cambiar rol" (sólo restablecer contraseña y desactivar); el servidor también lo rechaza: "El rol de un médico no se cambia: desactivalo y creá otro usuario."
  3. El usuario desactivado no ingresa ("Email o contraseña incorrectos."); reactivado y con la contraseña restablecida entra y debe cambiarla en `/cuenta/clave`.
  4. "La clínica necesita al menos una sede activa."

---

## 14. Reglas del motor de agenda (técnicas)

Casos que no se pueden provocar desde la pantalla (carreras, límites, reservas vencidas). Los verifica un script contra la base local con el seed cargado. Necesita Postgres levantado (`npm run db:up`) y el seed (`npm run db:seed`). Limpia lo que crea.

Pasos: en la carpeta del proyecto, `npm run qa:agenda`.

Esperado: una línea ✅ por verificación y "Todo OK." al final (código de salida 0). Qué verifica cada una:

- **TEC-01 · Rango máximo:** pedir turnos de hoy a +40 días devuelve turnos sólo hasta 14 días desde hoy.
- **TEC-02 · Anticipación mínima:** simulando que faltan 30 min para el primer turno libre, no se ofrece ningún turno con menos de 60 min de anticipación.
- **TEC-03 · Carrera de reservas:** dos pacientes piden el mismo turno exactamente a la vez; sólo uno lo obtiene **y el otro recibe `SLOT_NOT_AVAILABLE`** (el motor no debe lanzar una excepción).
- **TEC-04 · Reserva nueva libera la anterior:** el mismo paciente reserva dos horarios seguidos; el primero queda `CANCELLED` y sólo el segundo `TENTATIVE_LOCKED`.
- **TEC-05 · Pago sin reserva vigente:** `generate_mercadopago_payment` rechaza un `appointmentId` inexistente y uno con `lockedUntil` vencido ("No hay una reserva vigente con ese ID…").
- **TEC-06 · Médico de otra clínica:** reservar con el médico de Visión Sur desde la clínica demo devuelve `DOCTOR_NOT_FOUND`.

> **Defecto conocido (detectado al preparar estos casos):** TEC-03 falla en el segundo punto. Con el adaptador de Postgres, el perdedor de la carrera recibe un `DriverAdapterError: TransactionWriteConflict` (código 40001) que `holdSlot` no captura (sólo trata el `P2034` de Prisma). No hay doble reserva, pero en LUCIA esa excepción termina en el texto de respaldo "problema técnico" y la conversación se pausa en lugar de ofrecer otros horarios.

---

## 15. WhatsApp multi-clínica (Hito 8.5)

Requiere la app de Meta con Embedded Signup configurado (`NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`) y un número de prueba. Lo técnico (cifrado, token por clínica, eventos de cuenta) se verifica con `npm run qa:whatsapp`.

**WA-01 · Sin configuración de Meta**
- Pasos: como Admin, abrir Configuración sin las variables de Meta.
- Esperado: la tarjeta **WhatsApp** muestra "Sin conectar" y el aviso de que la conexión con un clic no está habilitada (en `/plataforma` una clínica con Phone Number ID manual figura "Manual"). Sin errores en consola.

**WA-02 · Conectar un número**
- Pasos: Configuración → **Conectar WhatsApp**, completar el flujo de Meta con el número de prueba.
- Esperado: "WhatsApp conectado (+54…)", estado Conectado y número visible. Escribir al número desde otro celular: el mensaje entra al Inbox y LUCIA responde.

**WA-03 · Dos clínicas**
- Pasos: repetir WA-02 como Admin de Visión Sur con otro número.
- Esperado: cada número entrega sus mensajes a su clínica; en `/plataforma` ambas figuran Conectadas con su número.

**WA-04 · Número ya usado**
- Pasos: conectar en una clínica el número que ya usa la otra.
- Esperado: "Ese número de WhatsApp ya está conectado a otra clínica." y la primera clínica no cambia.

**WA-05 · Acceso revocado**
- Pasos: en el Business Manager del cliente quitar a LUCIA del número.
- Esperado: la clínica pasa a "Desconectado" (o "Requiere reconexión" al próximo envío fallido) con el motivo, en Configuración y en `/plataforma`. **Reconectar WhatsApp** la restablece.

**WA-06 · Desconectar**
- Pasos: **Desconectar**.
- Esperado: estado Desconectado, sin número; un mensaje al número ya no aparece en el Inbox.

---

## Registro de ejecución

| Fecha | Tester | Casos ejecutados | ❌ Fallidos (ID + descripción) |
| :--- | :--- | :--- | :--- |
| | | | |

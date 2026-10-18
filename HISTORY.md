# HISTORY — LUCIA CRM

> Memoria entre sesiones. Mantener < 60 líneas: actualizar "Estado" (no agregar), 1 línea por hito en "Log",
> y en "Decisiones" sólo lo que no se deduce del código ni de `docs/specs/`. Borrar lo obsoleto.

## Estado (2026-10-17)
- Hitos 1, 2, 3, 3.5 y **4 (multi-clínica + sedes)** hechos. **Próximo: Hito 5** (contactos y pacientes). Orden (spec 05): 5 → 6 agenda y turnos → 7 portal web → 8 identificación WhatsApp → 9 Google Calendar → 10 recordatorios → 11 cobros (MP + coberturas) → 12 ARCA → 13 postergado. Cobros al final; desde el Hito 6 los turnos se confirman al reservar.
- Hito 4: rol `PLATFORM_ADMIN` (`/plataforma`, sin PHI); `requireClinicUser`/`requirePlatformUser` en `src/lib/auth/dal.ts` (clínica suspendida → sin sesión; `mustChangePassword` → `/cuenta/clave`). Login: si email+clave coinciden en varias clínicas, cookie `lucia_clinic_choice` (5 min) → `/login/clinica`; link `/c/<slug>/equipo`. Contraseñas iniciales generadas (`src/lib/auth/passwords.ts`), se muestran una vez. Sedes: `Location`, horario por sede (`AvailabilitySchedule.locationId` + consultorio), turno con `locationId`; filtros por sede con `ParamPicker`. Seed: 2 clínicas (demo con Palermo/Belgrano; Visión Sur) + Rossi con cuenta en ambas + `plataforma@lucia.local`.
- **E2E en el repo** (`qa/e2e/`, `npm run test:e2e`; app en :3123 con `LLM_PROVIDER=mock`). Los scripts del scratchpad se perdieron: nunca dejar pruebas fuera del repo. `qa/e2e/console-sweep.mjs` revisa advertencias de consola en modo dev.
- Tras una migración, reiniciar `npm run dev` (el cliente Prisma en memoria queda viejo).
- Todo commiteado en `develop`. LUCIA probada con Gemini (free tier): tools OK en reserva, urgencia, guardrail, médico/día, derivación. Free tier = 5 req/min/modelo + 503 frecuentes → no apto producción. Usar `LLM_MODEL=gemini-3.7-flash` (3.8 y flash-latest comparten cuota).
- Decidido: LUCIA no da consejos de alivio, sólo deriva a consulta (en prompt). Cobro según **tabla de coberturas por obra social y plan** (PRD §4.4.1, spec 03 §3, spec 04 `check_coverage`): especificada, se implementa en Hito 11. Pendiente: reintegro de seña y reglas para estudios/prácticas.
- Decidido: identidad del paciente = nombre + apellido + DNI + sexo; el celular NO identifica (puede cambiar de dueño). Se separa **Contacto** (quien escribe, por celular/email) de **Paciente**; un contacto saca turnos para otros validando sus 4 datos (spec 03 §5, refactor en Hito 5).
- Decidido: ingreso web con código SÓLO por email; el contacto edita sólo pacientes que registró (no nombre/DNI/sexo); evento de Google Calendar del médico sin motivo ni datos clínicos; corte mañana/tarde 13:00 configurable. Pendientes menores: reintegro de seña, coberturas de estudios, punto de venta ARCA por sede.
- Deploy demo **publicado**: https://crm-poc1.vercel.app (Vercel gru1 + Neon sa-east-1, LUCIA mock; probado 2026-10-05). Actualizada con el Hito 4 (2026-10-17). Tras cada deploy: `node qa/e2e/smoke-demo.mjs`. Guía `docs/deploy.md`; número real de WhatsApp: `docs/whatsapp-produccion.md`. `vercel.json` corre `prisma migrate deploy` en el build; `prisma.config.ts` usa `DATABASE_URL_UNPOOLED` para migraciones. Base remota: `npm run demo:db [-- --seed]` con `.env.demo`. Rama de producción: `main`.
- QA manual por rol en `qa/manual_tests.md` (mantener al agregar funcionalidad).

## Stack y comandos
Next 16 (App Router, `after()` en webhooks, `src/proxy.ts` = ex-middleware) · TS · Tailwind 4 · shadcn (base-ui, no radix) · Prisma 7.10 (fijado; npm "latest" es una 8.0 rc rota) con `@prisma/adapter-pg` · Postgres 17 + Redis 7 en `docker-compose.yml`.
`npm run db:up | db:migrate | db:seed | db:reset | db:studio | dev | typecheck | lint | build | chat`. Login `*@lucia.local` / `lucia1234`.

## Decisiones
- Auth: JWT HS256 en cookie `lucia_session` (`SESSION_SECRET` en `.env`). Doble chequeo: `proxy.ts` (optimista) + `requireUser(roles)` en cada página/server action (`src/lib/auth/dal.ts`). Permisos por sección en `src/lib/auth/roles.ts`.
  `proxy.ts` no redirige desde `/login` y la sesión se invalida si cambió rol/clínica/activo (evita bucles).
- PHI: Secretaría no ve `reason`; Marketing sólo agregados (sin nombres). Médico sólo ve pacientes con turno suyo.
- Fechas: siempre hora AR (UTC-3) vía `src/lib/dates.ts`; formatos en `src/lib/format.ts` (24h).
- Kanban: 8 columnas PRD agrupan etapas del enum; al soltar se usa `dropStage` (`src/lib/pipeline.ts`).
- Inbox: responder = pausa LUCIA `HUMAN_TAKEOVER_MINUTES` (30) y envía por WhatsApp si el canal es WHATSAPP (sin token: guarda y avisa).
- Agente (`src/lib/agent/`): AI SDK v7 (`instructions`, `isStepCount`, `result.responseMessages` acumula pasos). Se guardan en `Message.rawPayload` y se reinyectan como historial. `engine.ts` es la entrada única (webhook, simulador, `scripts/chat.ts`). Herramientas reciben paciente/conversación por contexto, nunca del modelo.
- Agenda: `src/lib/scheduling.ts` calcula huecos libres; `holdSlot` usa transacción Serializable (anti doble-booking, probado).
- Simulador: `Conversation.channel=SIMULATOR`, pacientes `utmSource=simulador` (+54 9 0000…); excluidos de Marketing.
- Escalada: pausa sin vencimiento (`pausedUntil=null`) hasta que recepción reanude.
- Esquema: +`DoctorProfile.consultationFee` (también en spec 03). Horarios: 1 franja por día en el form de admin.
- Estilos: paleta clínica sólo como tokens en `globals.css` (`--primary`, `--success`, `--warning`, `--brand-accent`…); no usar hex ni colores Tailwind sueltos. Logo: `src/components/brand/lucia-logo.tsx` (+ `public/brand/*.svg`, `src/app/icon.svg`). Badges de estado: `STAGE_VARIANT` / `APPOINTMENT_STATUS_VARIANT`.
- Seed destructivo; turnos calculados sobre los horarios reales de cada médico relativos a hoy.

## Log
- Hito 1 (`c3eca75`): scaffold Next, docker, esquema Prisma de spec 03, seed demo.
- Hito 2: login/roles, Kanban DnD, Inbox con pausa, agenda/pacientes médico, marketing, admin.
- Hito 3: agente LUCIA (AI SDK + 5 tools + mock), motor de agenda, webhook WhatsApp (firma, dedupe, referral), simulador.
- Hito 3.5: logo SVG de LUCIA, paleta azul/gris/blanco con contraste AA verificado, badges de estado.

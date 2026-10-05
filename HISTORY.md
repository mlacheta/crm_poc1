# HISTORY — LUCIA CRM

> Memoria entre sesiones. Mantener < 60 líneas: actualizar "Estado" (no agregar), 1 línea por hito en "Log",
> y en "Decisiones" sólo lo que no se deduce del código ni de `docs/specs/`. Borrar lo obsoleto.

## Estado (2026-10-04)
- Hitos 1, 2 y 3 hechos (roadmap: `docs/specs/05_*`). **Próximo: Hito 4** — Mercado Pago (Preference + webhook; `generate_mercadopago_payment` hoy sólo crea el Payment PENDING).
- Todo commiteado en `develop`. LUCIA probada con Gemini (free tier): tools OK en reserva, urgencia, guardrail, médico/día, derivación. Free tier = 5 req/min/modelo + 503 frecuentes → no apto producción. Usar `LLM_MODEL=gemini-3.7-flash` (3.8 y flash-latest comparten cuota).
- Decidido: LUCIA no da consejos de alivio, sólo deriva a consulta (en prompt). Cobro según **tabla de coberturas por obra social y plan** (PRD §4.4.1, spec 03 §3, spec 04 `check_coverage`): especificada, se implementa en Hito 4. Pendiente: reintegro de seña y reglas para estudios/prácticas.
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
- Seed destructivo; turnos calculados sobre los horarios reales de cada médico relativos a hoy.
- Tests E2E: no hay suite en el repo; se probó con playwright-core + Chrome local desde el scratchpad.

## Log
- Hito 1 (`c3eca75`): scaffold Next, docker, esquema Prisma de spec 03, seed demo.
- Hito 2: login/roles, Kanban DnD, Inbox con pausa, agenda/pacientes médico, marketing, admin.
- Hito 3: agente LUCIA (AI SDK + 5 tools + mock), motor de agenda, webhook WhatsApp (firma, dedupe, referral), simulador.

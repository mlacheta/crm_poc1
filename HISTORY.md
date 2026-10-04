# HISTORY — LUCIA CRM

> Memoria entre sesiones. Mantener < 60 líneas: actualizar "Estado" (no agregar), 1 línea por hito en "Log",
> y en "Decisiones" sólo lo que no se deduce del código ni de `docs/specs/`. Borrar lo obsoleto.

## Estado (2026-10-04)
- Hitos 1 y 2 hechos (roadmap: `docs/specs/05_*`). **Próximo: Hito 3** — agente LUCIA + WhatsApp Cloud API.
- Todo commiteado en `develop`.

## Stack y comandos
Next 16 (App Router, `src/proxy.ts` = ex-middleware) · TS · Tailwind 4 · shadcn (base-ui, no radix) · Prisma 7.10 (fijado; npm "latest" es una 8.0 rc rota) con `@prisma/adapter-pg` · Postgres 17 + Redis 7 en `docker-compose.yml`.
`npm run db:up | db:migrate | db:seed | db:reset | db:studio | dev | typecheck | lint | build`. Login `*@lucia.local` / `lucia1234`.

## Decisiones
- Auth: JWT HS256 en cookie `lucia_session` (`SESSION_SECRET` en `.env`). Doble chequeo: `proxy.ts` (optimista) + `requireUser(roles)` en cada página/server action (`src/lib/auth/dal.ts`). Permisos por sección en `src/lib/auth/roles.ts`.
- PHI: Secretaría no ve `reason`; Marketing sólo agregados (sin nombres). Médico sólo ve pacientes con turno suyo.
- Fechas: siempre hora AR (UTC-3) vía `src/lib/dates.ts`; formatos en `src/lib/format.ts` (24h).
- Kanban: 8 columnas PRD agrupan etapas del enum; al soltar se usa `dropStage` (`src/lib/pipeline.ts`).
- Inbox: responder = pausa LUCIA `HUMAN_TAKEOVER_MINUTES` (30); el envío real por WhatsApp falta (Hito 3).
- Esquema: +`DoctorProfile.consultationFee` (también en spec 03). Horarios: 1 franja por día en el form de admin.
- Seed destructivo; turnos calculados sobre los horarios reales de cada médico relativos a hoy.
- Tests E2E: no hay suite en el repo; se probó con playwright-core + Chrome local desde el scratchpad.

## Log
- Hito 1 (`c3eca75`): scaffold Next, docker, esquema Prisma de spec 03, seed demo.
- Hito 2: login/roles, Kanban DnD, Inbox con pausa, agenda/pacientes médico, marketing, admin.

# APP LUCIA — Tu Recepcionista Oftalmológica Virtual con IA

> **Metodología de Desarrollo**: Spec-Driven Design (SDD)  
> **Especialidad**: Clínicas y Consultorios Oftalmológicos  
> **Mercado**: Argentina / LATAM (Integrado con Mercado Pago y Facturación Fiscal ARCA / ex-AFIP)

---

## 📚 Índice de Especificaciones del Sistema (SDD)

Antes de escribir código funcional, el sistema se rige y valida mediante estas especificaciones formales:

1. [**01. PRD (Product Requirements Document)**](./docs/specs/01_prd.md):  
   Visión de producto, benchmarks contra *SoyLidia.com*, *DrApp* y *Robotina*, roles de usuario (Secretaría, Médico, Marketing), requerimientos funcionales, no funcionales y criterios de aceptación.

2. [**02. Arquitectura y Stack Tecnológico**](./docs/specs/02_architecture_and_tech_stack.md):  
   Diagrama C4 de alto nivel, stack tecnológico (Next.js 14, Node/TypeScript, PostgreSQL, Redis, BullMQ, Meta Cloud API, Mercado Pago, ARCA), y máquinas de estado del paciente en el pipeline.

3. [**03. Modelo de Datos y Esquema Prisma**](./docs/specs/03_data_model_and_database_schema.md):  
   Diagrama Entidad-Relación (ERD) y esquema completo de base de datos relacional para clínicas, médicos, pacientes, conversaciones, turnos, pagos, facturas y registros médicos.

4. [**04. Protocolos de Integración y Agente IA**](./docs/specs/04_integrations_and_agent_protocols.md):  
   System Prompt de LUCIA, herramientas de Tool Calling (agenda, triage de emergencias, links de pago), protocolo de webhooks oficiales de WhatsApp (Meta Cloud API), Mercado Pago y Factura Electrónica ARCA (WSFEv1).

5. [**05. Roadmap y Plan de Hitos**](./docs/specs/05_project_roadmap_and_milestones.md):  
   Desglose paso a paso de fases de implementación para el MVP y módulos opcionales.

6. [**06. Infraestructura, Hosting y Costos**](./docs/specs/06_infrastructure_and_hosting_spec.md):  
   Requerimientos de servidores, comparación PaaS vs VPS vs Cloud Enterprise, workers 24/7 (BullMQ), consideraciones de latencia con ARCA/AFIP y estimación de costos mensuales.

---

## 🛠️ Desarrollo local (Hito 1)

**Requisitos**: Node.js 20+ y Docker Desktop.

```bash
cp .env.example .env     # variables de conexión locales
npm install              # instala dependencias y genera el cliente Prisma
npm run db:up            # levanta PostgreSQL 17 + Redis 7 (docker compose)
npm run db:migrate       # aplica las migraciones
npm run db:seed          # carga la clínica demo (vacía la base antes)
npm run dev              # http://localhost:3000
```

| Script | Descripción |
| :--- | :--- |
| `db:up` / `db:down` | Inicia / detiene los contenedores (los datos persisten en volúmenes) |
| `db:migrate` | `prisma migrate dev` — crea y aplica migraciones a partir de `prisma/schema.prisma` |
| `db:seed` | Clínica demo: staff, 3 oftalmólogos con horarios y consultorios, 8 pacientes con obras sociales, turnos, pagos y conversaciones |
| `db:reset` | Borra la base, reaplica migraciones y vuelve a correr el seed |
| `db:studio` | Abre Prisma Studio para explorar los datos |
| `typecheck` | Genera los tipos de rutas de Next.js y corre `tsc` |

### Usuarios y vistas (Hito 2)

Ingresá en http://localhost:3000/login. Todos los usuarios del seed son `@lucia.local` con contraseña `SEED_USER_PASSWORD` (por defecto `lucia1234`).

| Usuario | Rol | Vistas |
| :--- | :--- | :--- |
| `admin@` | Admin | Todas + Configuración (clínica, credenciales WhatsApp/ARCA, médicos, horarios y aranceles) |
| `secretaria@` | Secretaría | Pipeline Kanban (drag-and-drop, filtros por médico y canal) e Inbox WhatsApp (pausar/reanudar LUCIA) |
| `laura.mendez@`, `martin.rossi@`, `carolina.paz@` | Médico | Agenda del día, sus pacientes y ficha rápida con historia clínica |
| `marketing@` | Marketing | Embudo de conversión y atribución UTM, sólo datos agregados (sin nombres ni diagnósticos) |

El acceso se valida en dos capas: `src/proxy.ts` (redirección optimista por cookie) y `requireUser()` en cada página y server action (`src/lib/auth/dal.ts`). La matriz de permisos vive en `src/lib/auth/roles.ts`.

**Stack**: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma 7 (adapter `pg`) · PostgreSQL 17 · Redis 7.

### Agente LUCIA y WhatsApp (Hito 3)

- **Simulador** (menú *Simulador LUCIA*, Admin y Secretaría): chateá como paciente y mirá qué herramientas ejecuta LUCIA y cómo cambia el CRM. Nunca envía mensajes a Meta. Desde la terminal: `npm run chat -- "Hola, quiero un turno" "1"`.
- **Modelo**: `LLM_PROVIDER=mock` (por defecto) responde con reglas por palabras clave, sin IA, pero ejecuta las herramientas reales. Para un modelo real, en `.env`:

  | Proveedor | Variables | Modelo por defecto |
  | :--- | :--- | :--- |
  | Gemini | `LLM_PROVIDER=google` + `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-3.8-flash` |
  | Claude | `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` | `claude-haiku-4-5` |
  | OpenAI | `LLM_PROVIDER=openai` + `OPENAI_API_KEY` + `LLM_MODEL` | — |

- **Conectar un número real de WhatsApp**:
  1. En Meta for Developers, crear una app con el producto WhatsApp y copiar el *Phone Number ID*, el *token de acceso* y el *App Secret*.
  2. En `.env`: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` y un `WHATSAPP_VERIFY_TOKEN` inventado.
  3. En *Configuración* del CRM, cargar el Phone Number ID de la clínica.
  4. Exponer el puerto local con HTTPS (`cloudflared tunnel --url http://localhost:3000` o `ngrok http 3000`) y configurar en Meta el webhook `https://<túnel>/api/webhooks/whatsapp` con el mismo verify token, suscripto al campo `messages`.

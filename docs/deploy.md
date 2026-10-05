# Deploy de la demo — Vercel + Neon

Arquitectura según la spec 06: la app en **Vercel** (región São Paulo, `gru1`) y PostgreSQL en **Neon**. Redis todavía no se usa. LUCIA corre en modo `mock` (respuestas por reglas, sin depender de la cuota de Google).

> La demo usa sólo datos ficticios (seed). No cargar pacientes reales: falta revisar seguridad y la Ley 25.326 antes de producción.

## 1. Base de datos en Neon

1. Entrar a **https://neon.tech** (se puede usar la cuenta de GitHub) y crear un proyecto `lucia-demo`.
   - Región: **AWS São Paulo (sa-east-1)**. Si no está disponible, elegir la más cercana y cambiar `regions` en `vercel.json` a la región de Vercel equivalente (ej. `iad1` para us-east-1), para que app y base queden juntas.
2. En **Connect**, copiar las dos cadenas de conexión:
   - **Pooled** (el host contiene `-pooler`) → `DATABASE_URL`
   - **Direct** (sin `-pooler`) → `DATABASE_URL_UNPOOLED`

## 2. Datos de la demo (desde tu máquina)

1. Copiar `.env.demo.example` a `.env.demo` y completar:
   - `DATABASE_URL` y `DATABASE_URL_UNPOOLED` con las cadenas de Neon.
   - `SESSION_SECRET`: generarlo con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
   - `SEED_USER_PASSWORD`: la contraseña que vas a darle al cliente (no usar `lucia1234`).
2. Crear las tablas y cargar los datos demo:
   ```bash
   npm run demo:db -- --seed
   ```
   El script se niega a correr contra `localhost`. **`--seed` borra todo** lo que haya en esa base.

## 3. App en Vercel

1. Entrar a **https://vercel.com** con GitHub → **Add New → Project** → importar `mlacheta/crm_poc1`.
2. Production Branch: **`main`**. Framework: Next.js (se detecta solo). El build lo define `vercel.json`: aplica las migraciones pendientes y compila.
3. En **Environment Variables**, cargar (los mismos valores de `.env.demo`):

   | Variable | Valor |
   | :--- | :--- |
   | `DATABASE_URL` | Cadena *pooled* de Neon |
   | `DATABASE_URL_UNPOOLED` | Cadena *direct* de Neon |
   | `SESSION_SECRET` | El generado en el paso 2 |
   | `LLM_PROVIDER` | `mock` |

4. **Deploy**. Al terminar, Vercel da la URL (ej. `https://crm-poc1.vercel.app`).

## 4. Verificación

- Abrir `/login` e ingresar con `admin@lucia.local` y la contraseña de `SEED_USER_PASSWORD`.
- Recorrer Pipeline, Inbox, Simulador (pedir un turno y elegir "1"), Agenda y Marketing.
- Si algo falla: Vercel → Deployments → el deploy → **Logs**.

## 5. Antes de cada demo

- Los turnos del seed son relativos a la fecha en que se cargan. Para que la agenda muestre turnos "de esta semana", recargar los datos el día anterior: `npm run demo:db -- --seed`.
- Usuarios: `admin@`, `secretaria@`, `marketing@`, `laura.mendez@`, `martin.rossi@`, `carolina.paz@` (todos `@lucia.local`).
- En el Inbox, responder una conversación de WhatsApp muestra "NO enviado por WhatsApp: Falta WHATSAPP_ACCESS_TOKEN": es lo esperado sin un número de Meta conectado. Para mostrar el circuito completo conviene usar el **Simulador**.

## Actualizaciones

Cada push a `main` despliega automáticamente. Si el push incluye migraciones nuevas, el build las aplica en Neon antes de publicar.

## Notas

- **Plan de Vercel:** el plan Hobby (gratis) es para uso personal y no comercial. Para mostrar el producto a clientes de forma sostenida corresponde el plan Pro.
- **LUCIA con IA real:** cambiar `LLM_PROVIDER` a `google` y agregar `GOOGLE_GENERATIVE_AI_API_KEY` (y `LLM_MODEL=gemini-3.7-flash`) en Vercel, luego redeploy. Ver los límites del plan gratuito en `HISTORY.md`.
- **WhatsApp real (más adelante):** el webhook queda en `https://<tu-url>/api/webhooks/whatsapp`; ver README, sección Hito 3.

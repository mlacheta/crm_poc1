# Conectar el número de WhatsApp de la clínica (producción)

El código ya recibe y envía mensajes por la WhatsApp Cloud API (webhook en `src/app/api/webhooks/whatsapp/route.ts`, cliente en `src/lib/whatsapp/`). Pasar a producción es sobre todo configuración del lado de Meta, más unas variables en LUCIA.

> Las pantallas de Meta cambian seguido: los nombres de menú de esta guía son orientativos.

## 1. Requisitos previos

- **Portfolio empresarial de Meta** (Meta Business Suite) a nombre de la clínica, idealmente **verificado** con CUIT y documentación. Sin verificación hay límites bajos de mensajes y el nombre visible no se aprueba del todo.
- **Número de teléfono de la clínica**:
  - *Recomendado:* un número nuevo o que no esté en uso en WhatsApp (línea fija o celular que pueda recibir un SMS o una llamada con el código de verificación).
  - *Si ya lo usan en la app WhatsApp Business:* migrarlo (deja de funcionar en la app) o usar la modalidad de **coexistencia** (app en el celular + API a la vez). Confirmar en Meta que esté disponible para la cuenta.
- **Medio de pago** en WhatsApp Manager. Meta cobra por mensaje según su tipo: hoy las respuestas a pacientes que escribieron primero (ventana de 24 h) no se cobran; los mensajes con plantilla (recordatorios, reactivación) sí. Revisar la tarifa vigente para Argentina.

## 2. Configuración en Meta for Developers

1. En **developers.facebook.com**, crear una app de tipo *Business* asociada al portfolio de la clínica y agregarle el producto **WhatsApp**.
2. En *WhatsApp → API Setup*, **agregar el número real**: verificarlo con el código y cargar el **nombre visible** (ej. "Centro Oftalmológico X"), que Meta revisa.
3. Anotar el **Phone Number ID** y el **WhatsApp Business Account ID** (WABA).
4. **Token permanente**: en *Configuración del negocio → Usuarios del sistema*, crear un usuario del sistema, asignarle la app y la cuenta de WhatsApp, y generar un token con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`. El token temporal del panel dura 24 h: no sirve para producción.
5. Copiar el **App Secret** desde *Configuración de la app → Básica*.
6. **Webhook** (*WhatsApp → Configuración*):
   - URL de callback: `https://<tu-dominio>/api/webhooks/whatsapp`
   - Token de verificación: una clave inventada (la misma que `WHATSAPP_VERIFY_TOKEN`).
   - Suscribirse al campo **`messages`**.
   Meta verifica la URL en el momento: la app ya tiene que estar desplegada con las variables del paso 3.1.
7. **Publicar la app** (modo *Live*). Pide la URL de la política de privacidad de la clínica.

## 3. Configuración en LUCIA

1. Variables de entorno en Vercel (proyecto de producción):

   | Variable | Valor |
   | :--- | :--- |
   | `WHATSAPP_ACCESS_TOKEN` | Token permanente del usuario del sistema |
   | `WHATSAPP_APP_SECRET` | App Secret (valida que cada webhook venga de Meta) |
   | `WHATSAPP_VERIFY_TOKEN` | La clave inventada del paso 2.6 |
   | `WHATSAPP_GRAPH_VERSION` | Opcional; por defecto `v23.0`. Usar la versión vigente de la Graph API |
   | `LLM_PROVIDER` + su API key | Un proveedor de IA en **plan pago** (ver sección 4) |

2. **Redeploy** para que tome las variables.
3. En el CRM, **Configuración → WhatsApp Cloud API**: cargar el **Phone Number ID** y el **WABA ID** de la clínica. Con eso el webhook asocia los mensajes entrantes a la clínica.
4. **Prueba de punta a punta**: escribirle al número desde un celular personal. En segundos el mensaje aparece en el **Inbox** con la respuesta de LUCIA, y esa respuesta llega al celular. Responder desde el Inbox como recepción y verificar que también llega.
5. Probar con varios celulares argentinos: el "9" de los celulares de Argentina tiene particularidades en la API (el `wa_id` que llega y el número al que se envía).

Si algo falla: Vercel → el deploy → **Logs** (los mensajes de LUCIA y de WhatsApp empiezan con `[WhatsApp]` o `[LUCIA]`), y en Meta, *WhatsApp → Configuración → Webhook* muestra los envíos fallidos.

## 4. Antes de atender pacientes reales

No son pasos de configuración sino pendientes del producto:

- **Base de producción separada de la demo.** Nunca correr el seed contra ella (borra todo); además el seed carga un Phone Number ID ficticio (`100000000000001`).
- **IA en plan pago.** El plan gratuito de Gemini no soporta tráfico real (5 pedidos por minuto y errores 503 frecuentes) y Google puede usar esos datos. Con datos de salud: plan pago y, por la **Ley 25.326**, registrar la base de datos ante la AAIP y publicar una política de privacidad.
- **Hito 4 (Mercado Pago y coberturas):** hoy LUCIA reserva el turno pero el cobro lo gestiona recepción manualmente.
- **Hito 6 (recordatorios y reactivación):** los mensajes fuera de la ventana de 24 h necesitan **plantillas aprobadas por Meta** (`recordatorio_turno_24h`, `reactivacion_lead_pendiente_24h`, ver spec 04 §2), y una cola para procesar en orden los mensajes seguidos de un mismo paciente.
- **Plan Vercel Pro** por el uso comercial.

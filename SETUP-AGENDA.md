# Configurar la agenda con Google Calendar

Guía completa para dejar andando el sistema de turnos. Se hace **una sola vez** y
son unos 15 minutos. Todo lo que se usa acá es gratis.

> **Antes de empezar:** tené a mano la cuenta de Google donde querés que caigan
> las asesorías. Es la que va a recibir los eventos y las invitaciones.

---

## Paso 1 · Crear el proyecto en Google Cloud

1. Entrá a **https://console.cloud.google.com/** con la cuenta de Google donde
   querés recibir los turnos.
2. Arriba a la izquierda, al lado del logo, hacé clic en el selector de proyecto
   y después en **"Proyecto nuevo"**.
3. Nombre: `MA Importaciones Agenda` (o el que quieras). Clic en **Crear**.
4. Esperá unos segundos y asegurate de que quede **seleccionado** en el selector
   de arriba. Todo lo que sigue se hace dentro de ese proyecto.

---

## Paso 2 · Activar la API de Calendar y configurar el permiso

**2.1 · Activar la API**

1. En el buscador de arriba escribí **"Google Calendar API"** y entrá al resultado.
2. Clic en **Habilitar**.

**2.2 · Configurar la pantalla de permiso**

1. En el menú lateral entrá a **APIs y servicios → Pantalla de consentimiento de OAuth**
   (en la consola nueva puede aparecer como **Google Auth Platform → Público**).
2. Tipo de usuario: **Externo**. Clic en **Crear**.
3. Completá lo mínimo:
   - Nombre de la app: `Agenda MA Importaciones`
   - Correo de asistencia: tu mail
   - Datos de contacto del desarrollador: tu mail
4. Guardá y seguí hasta terminar. En **Permisos/Scopes** no agregues nada: el
   script pide el permiso que necesita por su cuenta.

**2.3 · ⚠️ Publicar la app (importante)**

En la sección **Público** (o **Estado de publicación**), buscá el botón
**"Publicar aplicación"** y confirmá. El estado tiene que quedar en
**"En producción"**, no en "Prueba".

> **Por qué importa:** si la app queda en modo *Prueba*, Google hace que el
> permiso **venza a los 7 días** y la agenda deja de funcionar sola. Publicándola
> el permiso no vence.
>
> Google te va a decir que la app "no está verificada". Es normal y no hay que
> hacer nada: la verificación recién se pide cuando otras personas usan tu app.
> Acá la única cuenta que la autoriza es la tuya.

---

## Paso 3 · Crear las credenciales

1. Andá a **APIs y servicios → Credenciales**.
2. **Crear credenciales → ID de cliente de OAuth**.
3. Tipo de aplicación: **Aplicación web**.
4. Nombre: `Agenda web`.
5. En **URIs de redireccionamiento autorizados** hacé clic en **Agregar URI** y pegá
   exactamente esto:

   ```
   http://localhost:5555/oauth/callback
   ```

   > Tiene que ser idéntico, sin barra al final. Si no coincide, Google va a
   > devolver el error `redirect_uri_mismatch` en el paso siguiente.

6. Clic en **Crear**. Google te muestra el **Client ID** y el **Client Secret**:
   dejá esa ventana abierta, los vas a usar ahora.

---

## Paso 4 · Autorizar y obtener el token

En la terminal, parado en la carpeta del proyecto:

```bash
npm run agenda:auth
```

El script te va a pedir el **Client ID** y el **Client Secret**, y después abre el
navegador para que autorices.

- Elegí la cuenta de Google donde querés recibir las asesorías.
- Si aparece **"Google no verificó esta aplicación"**, entrá en
  **Configuración avanzada → Ir a Agenda MA Importaciones (no seguro)**.
  Es tu propia app: no hay riesgo.
- Aceptá el permiso de calendario.

Cuando termine, la terminal te imprime tres líneas. Copialas.

**Creá el archivo `.env.local`** en la raíz del proyecto y pegá ahí esas líneas:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=primary
```

> 🔒 `.env.local` está en el `.gitignore`. **Nunca** subas estos valores al repo:
> el refresh token es equivalente a una contraseña de tu calendario.

---

## Paso 5 · Probarlo en tu máquina

```bash
npm i -g vercel     # una sola vez, si todavía no lo tenés
npm run dev
```

Abrí `http://localhost:3000`, tocá **"Agendá tu asesoría"** y reservá un turno de
prueba. Tiene que aparecer en tu Google Calendar al instante, con el link de Meet
si elegiste videollamada.

Después borrá el evento de prueba desde Google Calendar.

---

## Paso 6 · Subirlo a producción

```bash
vercel link          # una sola vez, para conectar la carpeta con el proyecto
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_REFRESH_TOKEN
vercel env add GOOGLE_CALENDAR_ID
vercel --prod
```

En cada `vercel env add` te va a preguntar el valor y para qué entornos.
Elegí **Production, Preview y Development** (se marcan con la barra espaciadora).

> También podés cargarlas desde la web: tu proyecto en vercel.com →
> **Settings → Environment Variables**.

⚠️ Después de cambiar una variable de entorno hay que **volver a deployar** para
que tome efecto.

---

## Cambiar horarios, duración o feriados

Todo lo ajustable está en **`api/_lib/agenda-config.js`**, con comentarios:

| Qué querés cambiar | Dónde |
|---|---|
| Duración de la asesoría | `slotMinutes` |
| Horarios de atención por día | `workingHours` |
| Colchón entre reuniones | `bufferMinutes` |
| Anticipación mínima para reservar | `minNoticeHours` |
| Cuántos días para adelante se puede agendar | `maxDaysAhead` |
| Feriados y días bloqueados | `blockedDates` |
| Dirección de la oficina | `modes.office.location` |
| Tope de turnos por día | `maxPerDay` |

Ejemplo — cortar al mediodía los miércoles y atender sábados a la mañana:

```js
workingHours: {
  1: [['09:00', '18:00']],
  2: [['09:00', '18:00']],
  3: [['09:00', '13:00'], ['14:00', '18:00']],
  4: [['09:00', '18:00']],
  5: [['09:00', '18:00']],
  6: [['09:00', '13:00']],
},
```

Guardás, `vercel --prod`, y listo.

**Para bloquear días sueltos** (vacaciones, un viaje) no hace falta tocar código:
creá un evento en tu Google Calendar que ocupe todo ese día y esos horarios dejan
de ofrecerse automáticamente.

---

## Si algo falla

| Síntoma | Causa y solución |
|---|---|
| `redirect_uri_mismatch` al autorizar | La URI del paso 3 no es idéntica. Tiene que ser `http://localhost:5555/oauth/callback`, sin barra final. |
| La agenda dejó de andar a la semana | La app OAuth quedó en modo "Prueba". Publicala (paso 2.3) y volvé a correr `npm run agenda:auth`. |
| `invalid_grant` en los logs | El permiso se revocó o venció. Corré `npm run agenda:auth` de nuevo y actualizá `GOOGLE_REFRESH_TOKEN`. |
| "No pudimos cargar los horarios" | Faltan variables de entorno en Vercel, o no redeployaste después de cargarlas. Mirá los logs con `vercel logs`. |
| El script no devuelve refresh token | Ya habías autorizado antes. Revocá el acceso en https://myaccount.google.com/permissions y reintentá. |
| No aparecen turnos en ningún día | Fijate que la fecha del sistema esté bien y revisá `workingHours` y `blockedDates`. |

Para ver qué está pasando en producción:

```bash
vercel logs --follow
```

---

## Cómo funciona por dentro

```
Navegador                     Vercel (backend)              Google
─────────                     ────────────────              ──────
"Agendá tu asesoría"
   │
   ├─ elegís modalidad
   │
   ├─ GET /api/availability ──────► lee horarios ──────────► freeBusy
   │                                de atención              (qué está ocupado)
   │◄──── turnos libres ◄────────── y les descuenta
   │                                lo ocupado
   ├─ elegís día y hora
   ├─ completás tus datos
   │
   └─ POST /api/book ─────────────► revalida que el
                                     turno siga libre ─────► freeBusy
                                          │
                                          └─ crea el evento ► events.insert
                                                              + link de Meet
                                                              + invitación al cliente
```

Las credenciales viven **sólo** en el servidor: nunca llegan al navegador. El
endpoint de disponibilidad expone únicamente qué horarios están libres, nunca el
contenido de tus eventos.

**Un detalle:** si dos personas eligen el mismo horario con segundos de
diferencia, es teóricamente posible que ambas lo reserven. El backend revalida
justo antes de escribir, así que la ventana es de milisegundos. Con el volumen de
consultas de una asesoría no es un problema real, pero conviene saberlo.

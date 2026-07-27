<div align="center">

<img src="logo.svg" alt="MA Importaciones" height="64">

# Landing Page · MA Importaciones

**Importá desde China a Uruguay, sin complicaciones.**

Sitio web institucional de MA Importaciones — empresa uruguaya de comercio exterior
con más de 10 años de experiencia en importación directa desde China.

<br>

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Sin dependencias](https://img.shields.io/badge/framework-vanilla-17A398?style=flat-square)
![Deploy](https://img.shields.io/badge/deploy-Vercel-0B1F3A?style=flat-square&logo=vercel&logoColor=white)
![Agenda](https://img.shields.io/badge/agenda-Google%20Calendar-17A398?style=flat-square&logo=googlecalendar&logoColor=white)

</div>

---

## 📌 Qué es esto

Una **landing page de una sola página** (single page, navegación por anclas) construida en
HTML, CSS y JavaScript puros — sin frameworks, sin build step, sin bundler.

El objetivo del sitio es simple: explicar el servicio de importación, generar confianza y
convertir visitantes en asesorías agendadas o consultas por WhatsApp.

---

## ✨ Características

| | |
|---|---|
| 🎯 **Conversión primero** | Doble CTA: agendar asesoría o consultar por WhatsApp |
| 🗓️ **Agenda propia** | Sistema de turnos conectado a Google Calendar, con Meet o presencial. Sin Calendly, sin costo mensual |
| 📱 **100% responsive** | Diseño mobile-first, menú hamburguesa, layouts que se adaptan de 360px a 4K |
| 🎞️ **Animaciones al scroll** | Reveal progresivo con `IntersectionObserver` + red de seguridad al cargar |
| 🧭 **Scroll spy** | La navegación se resalta sola según la sección visible |
| 💬 **Formulario → WhatsApp** | El form arma el mensaje y lo abre directo en WhatsApp, sin backend |
| 🗓️ **Modal de agenda** | Elegís videollamada o presencial, ves los horarios libres reales y reservás en 3 pasos |
| ♿ **A prueba de fallos** | Tabs y FAQ funcionan con HTML/CSS puro (`radio` + `<details>`): andan aunque el JS no cargue |
| 🔗 **Listo para compartir** | Meta tags Open Graph y Twitter Card para previews en redes y WhatsApp |
| 🗺️ **Mapa integrado** | Google Maps embebido con carga diferida (`loading="lazy"`) |

---

## 🧱 Estructura del proyecto

```
.
├── index.html      # Todo el contenido y la estructura del sitio
├── styles.css      # Estilos completos (variables CSS + responsive)
├── script.js       # Interactividad: menú, scroll spy, reveals, formulario
├── agenda.js       # Sistema de agendamiento (modal de 4 pasos)
├── logo.svg        # Logo principal (header, fondos claros)
├── logo-white.svg  # Logo en blanco (footer, fondos oscuros)
├── package.json    # Scripts y dependencias
│
├── api/                        # Backend de la agenda (funciones de Vercel)
│   ├── availability.js         # GET  · devuelve los horarios libres
│   ├── book.js                 # POST · crea el turno en Google Calendar
│   └── _lib/
│       ├── agenda-config.js    # ⚙️  horarios, duración, feriados, dirección
│       ├── google.js           # cliente de Google Calendar (sin dependencias)
│       ├── slots.js            # cálculo de disponibilidad
│       └── time.js             # manejo de zona horaria
│
├── scripts/
│   └── get-refresh-token.js    # autorización con Google (se corre una vez)
└── SETUP-AGENDA.md             # 📖 guía para dejar la agenda andando
```

### Secciones de la página

```
Header (sticky)
 └─ Hero .................. Propuesta de valor + ruta animada China→Uruguay
 └─ Stat strip ............ 10+ años · Sin trámites · Desde USD 1.000
Nosotros
 └─ Cómo trabajamos ....... 4 pilares del servicio
 └─ Por qué elegirnos ..... 6 razones (bloque oscuro)
Logros ................... Métricas de trayectoria
Servicios
 └─ Pasos ................. Las 5 etapas de una importación
 └─ Paso a paso ........... Tabs con el detalle de cada duda frecuente
 └─ Modalidades ........... Contenedor compartido (LCL) vs completo (FCL)
 └─ FAQ ................... 7 preguntas frecuentes
 └─ Testimonios ........... Reseñas de clientes
 └─ CTA final
Contacto ................. Datos + formulario + mapa
Footer
 └─ Botón flotante de WhatsApp (siempre visible)
 └─ Modal de agendamiento
```

---

## 🎨 Sistema de diseño

Todo el tema vive en variables CSS al inicio de `styles.css` — cambiás un valor y se
actualiza el sitio entero.

| Token | Valor | Uso |
|---|---|---|
| `--navy` | `#0B1F3A` | Fondos oscuros, títulos, footer |
| `--teal` | `#17A398` | Color de acción: botones, links activos, acentos |
| `--amber` | `#F2A93B` | Destacados, números, eyebrows |
| `--ink` | `#101828` | Texto principal |

**Tipografías** (Google Fonts, importadas desde el CSS):
[Sora](https://fonts.google.com/specimen/Sora) para títulos · [Inter](https://fonts.google.com/specimen/Inter) para texto.

---

## 🗓️ La agenda

El sistema de turnos es propio y **no depende de ningún servicio pago**. Cuando alguien
toca *"Agendá tu asesoría"* se abre un modal de cuatro pasos:

```
modalidad  →  día y hora  →  datos  →  confirmación
 Meet o        horarios       nombre     link de Meet
 presencial    libres         y email    o dirección
```

Los horarios que se muestran salen **en vivo de Google Calendar**: sólo aparecen los que
están realmente libres, así que nunca se agenda encima de algo que ya tenías. Al confirmar
se crea el evento, se invita al cliente (Google le manda el mail solo) y, si eligió
videollamada, se genera el link de Meet.

Necesita dos funciones serverless porque las credenciales de Google **no pueden vivir en
el navegador**. Corren gratis en el plan Hobby de Vercel.

> 📖 **Para dejarlo andando, seguí [SETUP-AGENDA.md](SETUP-AGENDA.md)** — son 15 minutos,
> una sola vez.

---

## 🚀 Cómo correrlo localmente

El sitio en sí es estático, pero la agenda necesita el backend. Para que funcione todo:

```bash
npm i -g vercel     # una sola vez
npm run dev         # levanta el sitio + las funciones de /api
```

Entrá a `http://localhost:3000`.

> Requiere el archivo `.env.local` con las credenciales de Google
> (ver [SETUP-AGENDA.md](SETUP-AGENDA.md)). Sin él, todo el sitio anda igual pero el
> modal de agenda muestra un aviso y ofrece coordinar por WhatsApp.

**Si sólo querés ver el diseño**, sin la agenda, alcanza con un servidor estático:

```bash
npx serve .          # http://localhost:3000
```

---

## ☁️ Deploy

El proyecto está preparado para **Vercel**, que sirve el sitio estático y las funciones
de `/api` en el mismo dominio:

```bash
vercel --prod
```

Las credenciales van como variables de entorno en el panel de Vercel — nunca en el repo.
El detalle está en [SETUP-AGENDA.md](SETUP-AGENDA.md) (paso 6).

> ⚠️ Las plataformas puramente estáticas (GitHub Pages, Cloudflare Pages) sirven bien el
> sitio pero **no ejecutan `/api`**, así que la agenda no funcionaría ahí.

---

## ⚙️ Puntos de configuración

Si necesitás cambiar datos de contacto o integraciones, están todos acá:

| Qué | Dónde |
|---|---|
| Número de WhatsApp del formulario | `script.js` → constante `WA_NUMBER` |
| Botón flotante y link de WhatsApp | `index.html` → enlaces `wa.me/...` |
| **Horarios, duración y feriados de la agenda** | `api/_lib/agenda-config.js` |
| Email, teléfono y dirección | `index.html` → sección `#contacto` |
| Mapa | `index.html` → `<iframe>` de Google Maps |
| Colores y tipografías | `styles.css` → bloque `:root` |

---

## 📋 Pendientes

- [ ] Agregar `favicon.svg` (está referenciado en el `<head>` pero todavía no existe)
- [ ] Crear `politica-privacidad.html` (linkeada desde el footer)
- [ ] Subir la imagen `og-image.jpg` para las previews al compartir
- [ ] Confirmar la URL definitiva en los meta tags `og:url` / `og:image`
- [ ] Reemplazar los testimonios y las métricas de ejemplo por datos reales

---

## 📞 Contacto

**MA Importaciones**
📍 Arenal Grande 2125, Montevideo, Uruguay
✉️ [comex@maimportaciones.com.uy](mailto:comex@maimportaciones.com.uy)
💬 [+598 92 223 914](https://wa.me/59892223914)

<div align="center">
<br>
<sub>© 2026 MA Importaciones · Todos los derechos reservados</sub>
</div>

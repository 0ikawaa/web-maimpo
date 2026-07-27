// ============================================================================
//  Cliente de Google Calendar — sin dependencias, sólo fetch.
//  ---------------------------------------------------------------------------
//  Autenticación por "refresh token": autorizás la app UNA vez desde tu cuenta
//  (con scripts/get-refresh-token.js) y guardás ese token como variable de
//  entorno. Desde ahí el backend se saca solo un access token cuando lo necesita.
//
//  Nada de esto llega al navegador: corre únicamente en el servidor.
// ============================================================================

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Cache del access token en memoria. Vercel reutiliza la instancia entre
// requests seguidos, así que esto evita pedir un token nuevo cada vez.
let cachedToken = null;
let cachedTokenExpiry = 0;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisá SETUP-AGENDA.md para configurarla.`
    );
  }
  return value;
}

/** Canjea el refresh token por un access token de corta duración. */
export async function getAccessToken() {
  const now = Date.now();
  // Se renueva 60 s antes de que venza, para no usar uno recién expirado.
  if (cachedToken && now < cachedTokenExpiry - 60_000) return cachedToken;

  const body = new URLSearchParams({
    client_id: requiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    refresh_token: requiredEnv('GOOGLE_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // invalid_grant = el permiso se revocó o venció. Es el error más típico:
    // pasa si la app OAuth quedó en modo "Testing" (el token dura 7 días).
    const detail = data.error_description || data.error || res.statusText;
    throw new Error(`No se pudo renovar el acceso a Google Calendar: ${detail}`);
  }

  cachedToken = data.access_token;
  cachedTokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/** Llamada genérica a la API de Calendar, ya autenticada. */
async function calendarFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error?.message || res.statusText;
    throw new Error(`Google Calendar respondió ${res.status}: ${detail}`);
  }
  return data;
}

/**
 * Devuelve los bloques ocupados del calendario entre dos instantes.
 * Sólo pide horarios ocupados — no lee el contenido de tus eventos.
 */
export async function getBusyBlocks({ calendarId, timeMin, timeMax, timeZone }) {
  const data = await calendarFetch('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone,
      items: [{ id: calendarId }],
    }),
  });

  const calendar = data.calendars?.[calendarId];
  if (calendar?.errors?.length) {
    throw new Error(
      `No se pudo leer el calendario "${calendarId}": ${calendar.errors[0].reason}`
    );
  }

  return (calendar?.busy || []).map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));
}

/**
 * Crea el evento en el calendario.
 * Con withMeet: true, Google genera un link de Meet único para la reunión.
 * sendUpdates: 'all' hace que Google le mande la invitación por mail al cliente.
 */
export async function createEvent({ calendarId, event, withMeet }) {
  const params = new URLSearchParams({
    sendUpdates: 'all',
    conferenceDataVersion: withMeet ? '1' : '0',
  });

  return calendarFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { method: 'POST', body: JSON.stringify(event) }
  );
}

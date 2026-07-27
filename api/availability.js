// ============================================================================
//  GET /api/availability?from=YYYY-MM-DD&days=30
//  ---------------------------------------------------------------------------
//  Devuelve los turnos libres, día por día, cruzando los horarios de atención
//  con lo que ya tenés ocupado en Google Calendar.
//
//  Nunca expone el contenido de tus eventos: sólo qué horarios están libres.
// ============================================================================

import { CONFIG } from './_lib/agenda-config.js';
import { getBusyBlocks } from './_lib/google.js';
import { buildAvailability } from './_lib/slots.js';
import { dateKeyInTz, addDaysToKey, parseDateKey, zonedToUtc } from './_lib/time.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const tz = CONFIG.timeZone;
    const now = new Date();
    const todayKey = dateKeyInTz(now, tz);

    // Nunca antes de hoy, aunque lo pidan.
    const requested = String(req.query.from || '');
    const fromKey =
      DATE_RE.test(requested) && requested > todayKey ? requested : todayKey;

    const days = Math.min(
      Math.max(parseInt(req.query.days, 10) || CONFIG.maxDaysAhead, 1),
      CONFIG.maxDaysAhead
    );

    // Una sola consulta a Google para todo el rango.
    const from = parseDateKey(fromKey);
    const timeMin = zonedToUtc(from.year, from.month, from.day, 0, 0, tz);
    const lastKey = addDaysToKey(fromKey, days);
    const last = parseDateKey(lastKey);
    const timeMax = zonedToUtc(last.year, last.month, last.day, 0, 0, tz);

    const busy = await getBusyBlocks({
      calendarId: CONFIG.calendarId,
      timeMin,
      timeMax,
      timeZone: tz,
    });

    const availability = buildAvailability({ fromKey, days, busy, now });

    // Cache corto: alivia ráfagas de requests sin que los horarios queden viejos.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return res.status(200).json({
      timeZone: tz,
      slotMinutes: CONFIG.slotMinutes,
      today: todayKey,
      maxDate: addDaysToKey(todayKey, CONFIG.maxDaysAhead),
      modes: Object.fromEntries(
        Object.entries(CONFIG.modes).map(([key, m]) => [
          key,
          { label: m.label, description: m.description, location: m.location },
        ])
      ),
      days: availability,
    });
  } catch (err) {
    console.error('[availability]', err);
    return res.status(500).json({
      error: 'No pudimos consultar la agenda en este momento.',
    });
  }
}

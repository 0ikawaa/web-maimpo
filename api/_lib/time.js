// ============================================================================
//  Helpers de fecha y hora — sin librerías externas.
//  ---------------------------------------------------------------------------
//  El problema que resuelven: el servidor de Vercel corre en UTC, pero los
//  horarios de atención están en hora de Montevideo. Estas funciones traducen
//  entre "las 9 de la mañana en Montevideo" y el instante real en el tiempo.
// ============================================================================

/**
 * Cuántos minutos de diferencia tiene una zona horaria respecto de UTC
 * en un instante dado. Se calcula con Intl en vez de hardcodear -180,
 * así sigue funcionando si Uruguay vuelve a aplicar horario de verano.
 */
export function tzOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24, // Intl puede devolver "24" a medianoche
    Number(parts.minute),
    Number(parts.second)
  );

  // Se descartan los milisegundos para que la resta dé un múltiplo exacto de minutos.
  return (asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

/**
 * Convierte una hora de pared ("2026-08-03 09:00 en Montevideo")
 * al instante UTC que le corresponde.
 */
export function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, 0);
  // Primera aproximación con el offset del instante estimado...
  let offset = tzOffsetMinutes(new Date(wall), timeZone);
  let ts = wall - offset * 60000;
  // ...y una segunda pasada, que corrige el caso borde de un cambio de horario.
  offset = tzOffsetMinutes(new Date(ts), timeZone);
  return new Date(wall - offset * 60000);
}

/** Devuelve el YYYY-MM-DD de un instante, leído en la zona horaria indicada. */
export function dateKeyInTz(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Día de la semana (0 = domingo) de una fecha, leído en la zona horaria indicada. */
export function weekdayInTz(date, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/** "YYYY-MM-DD" → { year, month, day } */
export function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** "HH:MM" → minutos desde medianoche */
export function parseHM(hm) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/** Suma días a un YYYY-MM-DD y devuelve otro YYYY-MM-DD (sin líos de zona horaria). */
export function addDaysToKey(key, days) {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Formatea un instante como "lunes 3 de agosto, 09:00 h" en español. */
export function formatHuman(date, timeZone) {
  const fecha = new Intl.DateTimeFormat('es-UY', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  const hora = new Intl.DateTimeFormat('es-UY', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${fecha}, ${hora} h`;
}

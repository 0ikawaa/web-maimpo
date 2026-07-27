// ============================================================================
//  Cálculo de disponibilidad.
//  ---------------------------------------------------------------------------
//  Arma la grilla de turnos posibles según los horarios de atención y le
//  descuenta todo lo que ya está ocupado en tu Google Calendar.
//
//  Lo usan tanto /api/availability (para mostrar los horarios libres) como
//  /api/book (para re-verificar antes de crear el evento — nunca se confía
//  en lo que manda el navegador).
// ============================================================================

import { CONFIG, blockMinutes } from './agenda-config.js';
import {
  zonedToUtc,
  dateKeyInTz,
  weekdayInTz,
  parseDateKey,
  parseHM,
  addDaysToKey,
} from './time.js';

/** Dos rangos [aIni, aFin) y [bIni, bFin) se pisan. */
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/**
 * Todos los inicios de turno posibles para un día, ignorando el calendario.
 * Devuelve instantes (Date) en UTC.
 */
export function slotsForDay(dateKey) {
  const { year, month, day } = parseDateKey(dateKey);
  const tz = CONFIG.timeZone;

  if (CONFIG.blockedDates.includes(dateKey)) return [];

  // Se toma el mediodía para preguntar el día de la semana: evita cualquier
  // ambigüedad con los bordes de medianoche.
  const noon = zonedToUtc(year, month, day, 12, 0, tz);
  const ranges = CONFIG.workingHours[weekdayInTz(noon, tz)];
  if (!ranges || !ranges.length) return [];

  const step = blockMinutes();
  const slots = [];

  for (const [from, to] of ranges) {
    const startMin = parseHM(from);
    const endMin = parseHM(to);
    // El turno tiene que terminar dentro de la franja: si atendés hasta las 18:00
    // y dura 30 min, el último arranca 17:30.
    for (let m = startMin; m + CONFIG.slotMinutes <= endMin; m += step) {
      slots.push(zonedToUtc(year, month, day, Math.floor(m / 60), m % 60, tz));
    }
  }

  return slots;
}

/**
 * Disponibilidad real para un rango de días.
 * Recibe los bloques ocupados ya consultados a Google (una sola llamada
 * para todo el rango) y devuelve, por día, los turnos que quedan libres.
 */
export function buildAvailability({ fromKey, days, busy, now = new Date() }) {
  const tz = CONFIG.timeZone;
  const durationMs = CONFIG.slotMinutes * 60_000;
  const bufferMs = CONFIG.bufferMinutes * 60_000;
  const earliest = now.getTime() + CONFIG.minNoticeHours * 3_600_000;

  const result = [];

  for (let i = 0; i < days; i++) {
    const dateKey = addDaysToKey(fromKey, i);
    const candidates = slotsForDay(dateKey);

    const free = candidates.filter((slot) => {
      const start = slot.getTime();
      // Con poca anticipación no se ofrece.
      if (start < earliest) return false;
      // El colchón se reserva después de la reunión, así que el bloque que
      // se compara contra el calendario es más largo que la asesoría en sí.
      const end = start + durationMs + bufferMs;
      return !busy.some((b) => overlaps(start, end, b.start, b.end));
    });

    const used = CONFIG.maxPerDay
      ? busy.filter((b) => dateKeyInTz(new Date(b.start), tz) === dateKey).length
      : 0;

    result.push({
      date: dateKey,
      slots:
        CONFIG.maxPerDay && used >= CONFIG.maxPerDay
          ? []
          : free.map((d) => d.toISOString()),
    });
  }

  return result;
}

/**
 * ¿Este instante exacto es un turno válido y libre?
 * Se usa antes de crear el evento: valida que la hora recibida caiga en la
 * grilla (y no sea un horario inventado a mano) y que siga disponible.
 */
export function isSlotBookable({ startISO, busy, now = new Date() }) {
  const start = new Date(startISO);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, reason: 'La fecha recibida no es válida.' };
  }

  const dateKey = dateKeyInTz(start, CONFIG.timeZone);
  const todayKey = dateKeyInTz(now, CONFIG.timeZone);

  if (dateKey < todayKey) {
    return { ok: false, reason: 'Ese horario ya pasó.' };
  }
  if (dateKey > addDaysToKey(todayKey, CONFIG.maxDaysAhead)) {
    return { ok: false, reason: 'Ese horario está fuera del rango disponible.' };
  }

  // Tiene que coincidir exactamente con un turno de la grilla del día.
  const valid = slotsForDay(dateKey).some((s) => s.getTime() === start.getTime());
  if (!valid) {
    return { ok: false, reason: 'Ese horario no está dentro del horario de atención.' };
  }

  if (start.getTime() < now.getTime() + CONFIG.minNoticeHours * 3_600_000) {
    return {
      ok: false,
      reason: `Necesitamos al menos ${CONFIG.minNoticeHours} horas de anticipación.`,
    };
  }

  const end = start.getTime() + (CONFIG.slotMinutes + CONFIG.bufferMinutes) * 60_000;
  if (busy.some((b) => overlaps(start.getTime(), end, b.start, b.end))) {
    return { ok: false, reason: 'Ese horario se acaba de ocupar. Elegí otro, por favor.' };
  }

  return { ok: true };
}

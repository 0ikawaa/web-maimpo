// ============================================================================
//  POST /api/book
//  ---------------------------------------------------------------------------
//  Crea el turno en Google Calendar.
//
//  Regla de oro: NO se confía en nada de lo que manda el navegador. Antes de
//  escribir, se vuelve a verificar contra Google que el horario exista en la
//  grilla y siga libre. Si no, alguien podría agendarse un domingo a las 3 AM
//  editando el request a mano.
// ============================================================================

import { CONFIG } from './_lib/agenda-config.js';
import { getBusyBlocks, createEvent } from './_lib/google.js';
import { isSlotBookable } from './_lib/slots.js';
import { formatHuman } from './_lib/time.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

const clean = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Vercel ya parsea el JSON, pero por las dudas se contempla el string crudo.
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // Campo trampa: es invisible para las personas, sólo lo completan los bots.
    // Se responde 200 para no darles pistas de que fueron detectados.
    if (clean(body.website, 100)) {
      return res.status(200).json({ ok: true });
    }

    const mode = body.mode === 'office' ? 'office' : 'meet';
    const name = clean(body.name, 120);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 40);
    const notes = clean(body.notes, 1000);
    const startISO = clean(body.start, 40);

    const errors = {};
    if (name.length < 2) errors.name = 'Necesitamos tu nombre.';
    if (!EMAIL_RE.test(email)) errors.email = 'Revisá el email, no parece válido.';
    if (!startISO) errors.start = 'Elegí un horario.';
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Faltan datos', fields: errors });
    }

    const start = new Date(startISO);
    const end = new Date(start.getTime() + CONFIG.slotMinutes * 60_000);

    // Se relee el calendario justo antes de escribir, por si el horario
    // se ocupó entre que la persona lo eligió y le dio confirmar.
    const busy = await getBusyBlocks({
      calendarId: CONFIG.calendarId,
      timeMin: new Date(start.getTime() - 60 * 60_000),
      timeMax: new Date(end.getTime() + 60 * 60_000),
      timeZone: CONFIG.timeZone,
    });

    const check = isSlotBookable({ startISO, busy });
    if (!check.ok) {
      return res.status(409).json({ error: check.reason });
    }

    const modeConfig = CONFIG.modes[mode];

    const description = [
      `Asesoría agendada desde la web · ${modeConfig.label}`,
      '',
      `Nombre: ${name}`,
      `Email: ${email}`,
      phone ? `Teléfono: ${phone}` : null,
      '',
      notes ? `Consulta:\n${notes}` : null,
    ]
      .filter((line) => line !== null)
      .join('\n');

    const event = {
      summary: `Asesoría · ${name}`,
      description,
      start: { dateTime: start.toISOString(), timeZone: CONFIG.timeZone },
      end: { dateTime: end.toISOString(), timeZone: CONFIG.timeZone },
      attendees: [{ email, displayName: name }],
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    if (modeConfig.location) event.location = modeConfig.location;

    if (modeConfig.createMeet) {
      event.conferenceData = {
        createRequest: {
          // Identificador único del pedido de conferencia.
          requestId: `ma-${start.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const created = await createEvent({
      calendarId: CONFIG.calendarId,
      event,
      withMeet: modeConfig.createMeet,
    });

    const meetLink =
      created.hangoutLink ||
      created.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')
        ?.uri ||
      null;

    return res.status(200).json({
      ok: true,
      mode,
      start: start.toISOString(),
      end: end.toISOString(),
      when: formatHuman(start, CONFIG.timeZone),
      meetLink,
      location: modeConfig.location,
      eventLink: created.htmlLink || null,
    });
  } catch (err) {
    console.error('[book]', err);
    return res.status(500).json({
      error: 'No pudimos confirmar el turno. Escribinos por WhatsApp y lo coordinamos.',
    });
  }
}

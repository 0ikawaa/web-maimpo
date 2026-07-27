// ============================================================================
//  Sistema de agendamiento — MA Importaciones
//  ---------------------------------------------------------------------------
//  Modal de 4 pasos: modalidad → día y hora → datos → confirmación.
//  Los horarios salen en vivo de /api/availability (que lee Google Calendar)
//  y la reserva se crea con /api/book.
//
//  Vanilla, sin dependencias, igual que el resto del sitio.
// ============================================================================

(function () {
  const modal = document.getElementById('agendaModal');
  if (!modal) return;

  const $ = (id) => document.getElementById(id);
  const steps = modal.querySelectorAll('.agenda-step');

  const el = {
    title: $('agendaTitle'),
    subtitle: $('agendaSubtitle'),
    back: $('agendaBack'),
    loading: $('agendaLoading'),
    loadError: $('agendaLoadError'),
    picker: $('agendaPicker'),
    calMonth: $('calMonth'),
    calGrid: $('calGrid'),
    calPrev: $('calPrev'),
    calNext: $('calNext'),
    slotPanel: $('slotPanel'),
    summary: $('agendaSummary'),
    form: $('agendaForm'),
    // Los campos se toman por id y no como form.name / form.email: en un <form>,
    // "name" choca con una propiedad nativa del elemento y devuelve otra cosa.
    fName: $('agName'),
    fEmail: $('agEmail'),
    fPhone: $('agPhone'),
    fNotes: $('agNotes'),
    fWebsite: $('agWebsite'),
    formError: $('agendaFormError'),
    submit: $('agendaSubmit'),
    doneWhen: $('agendaDoneWhen'),
    doneDetail: $('agendaDoneDetail'),
  };

  // Estado de la reserva en curso.
  const state = {
    step: 'mode',
    mode: null,
    availability: null, // { 'YYYY-MM-DD': [ISO, ...] }
    meta: null,
    monthCursor: null, // primer día del mes que se está mostrando
    selectedDate: null,
    selectedSlot: null,
    sending: false,
  };

  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const TITLES = {
    mode: ['¿Cómo preferís tu asesoría?', 'Elegí la modalidad y después el día y la hora que mejor te queden.'],
    slot: ['Elegí día y horario', 'Estos son los horarios que tenemos libres.'],
    form: ['Últimos datos', 'Para confirmarte el turno y mandarte la invitación.'],
    done: ['', ''],
  };

  // ---- Helpers de fecha (trabajan con claves YYYY-MM-DD, sin zona horaria) ----
  const keyOf = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const parseKey = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return { y, m: m - 1, d };
  };

  /** Hora "HH:MM" de un ISO, leída en la zona horaria de la agenda. */
  const timeLabel = (iso) =>
    new Intl.DateTimeFormat('es-UY', {
      timeZone: state.meta?.timeZone || 'America/Montevideo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));

  /** "lunes 3 de agosto" a partir de una clave YYYY-MM-DD. */
  const dateLabel = (key) => {
    const { y, m, d } = parseKey(key);
    return new Intl.DateTimeFormat('es-UY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(y, m, d));
  };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------------------------------------------------------------- navegación
  function goTo(step) {
    state.step = step;
    steps.forEach((s) => (s.hidden = s.dataset.step !== step));

    const [title, subtitle] = TITLES[step];
    el.title.textContent = title;
    el.subtitle.textContent = subtitle;
    // En la confirmación el encabezado estorba: el paso ya tiene su propio título.
    el.title.closest('.agenda-head').hidden = step === 'done';
    el.back.hidden = step === 'mode' || step === 'done';

    modal.querySelector('.agenda-dialog').scrollTop = 0;
  }

  function open() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    reset();
  }

  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function reset() {
    state.mode = null;
    state.selectedDate = null;
    state.selectedSlot = null;
    state.sending = false;
    el.form.reset();
    el.formError.hidden = true;
    el.submit.disabled = false;
    el.submit.textContent = 'Confirmar asesoría';
    goTo('mode');
  }

  function goBack() {
    if (state.step === 'form') {
      goTo('slot');
    } else if (state.step === 'slot') {
      goTo('mode');
    }
  }

  // ------------------------------------------------------------ disponibilidad
  async function loadAvailability() {
    el.loading.hidden = false;
    el.picker.hidden = true;
    el.loadError.hidden = true;

    try {
      const res = await fetch('/api/availability');
      if (!res.ok) throw new Error('respuesta ' + res.status);
      const data = await res.json();

      state.meta = data;
      state.availability = {};
      data.days.forEach((d) => {
        if (d.slots.length) state.availability[d.date] = d.slots;
      });

      // Se abre en el mes del primer día con horarios libres.
      const firstFree = Object.keys(state.availability).sort()[0] || data.today;
      const { y, m } = parseKey(firstFree);
      state.monthCursor = { y, m };

      el.loading.hidden = true;
      el.picker.hidden = false;
      renderCalendar();

      // Si no hay ni un horario libre en todo el rango, se avisa.
      if (!Object.keys(state.availability).length) {
        showLoadError(
          'No nos quedan horarios libres en las próximas semanas. Escribinos por WhatsApp y lo coordinamos.'
        );
      }
    } catch (err) {
      console.error('[agenda]', err);
      el.loading.hidden = true;
      showLoadError(
        'No pudimos cargar los horarios en este momento. Probá de nuevo en un rato o escribinos por WhatsApp.'
      );
    }
  }

  function showLoadError(message) {
    el.picker.hidden = true;
    el.loadError.hidden = false;
    el.loadError.innerHTML = `
      ${message}
      <a class="agenda-wa" href="https://wa.me/59892223914" target="_blank" rel="noopener">
        Escribir por WhatsApp
      </a>`;
  }

  // ------------------------------------------------------------------ calendario
  function renderCalendar() {
    const { y, m } = state.monthCursor;
    el.calMonth.textContent = `${capitalize(MESES[m])} ${y}`;

    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    // La semana arranca en lunes: domingo (0) pasa a ser el último día.
    const offset = (first.getDay() + 6) % 7;

    const keys = Object.keys(state.availability);
    const minKey = keys.length ? keys.sort()[0] : null;
    const maxKey = state.meta.maxDate;

    let html = '';
    for (let i = 0; i < offset; i++) html += '<span class="cal-cell cal-empty"></span>';

    for (let d = 1; d <= daysInMonth; d++) {
      const key = keyOf(y, m, d);
      const hasSlots = Boolean(state.availability[key]);
      const classes = ['cal-cell', 'cal-day'];
      if (!hasSlots) classes.push('is-off');
      if (key === state.selectedDate) classes.push('is-selected');
      if (key === state.meta.today) classes.push('is-today');

      html += `<button type="button" class="${classes.join(' ')}" data-date="${key}" ${
        hasSlots ? '' : 'disabled'
      }>${d}</button>`;
    }
    el.calGrid.innerHTML = html;

    // Se desactivan las flechas fuera del rango reservable.
    el.calPrev.disabled = minKey ? keyOf(y, m, 1) <= minKey : true;
    el.calNext.disabled = keyOf(y, m, daysInMonth) >= maxKey;
  }

  function shiftMonth(delta) {
    const { y, m } = state.monthCursor;
    const next = new Date(y, m + delta, 1);
    state.monthCursor = { y: next.getFullYear(), m: next.getMonth() };
    renderCalendar();
  }

  function selectDate(key) {
    state.selectedDate = key;
    state.selectedSlot = null;
    renderCalendar();
    renderSlots(key);
  }

  function renderSlots(key) {
    const slots = state.availability[key] || [];
    if (!slots.length) {
      el.slotPanel.innerHTML = '<p class="slot-hint">No hay horarios libres ese día.</p>';
      return;
    }

    el.slotPanel.innerHTML = `
      <p class="slot-title">${capitalize(dateLabel(key))}</p>
      <div class="slot-grid">
        ${slots
          .map(
            (iso) =>
              `<button type="button" class="slot-btn" data-slot="${iso}">${timeLabel(iso)}</button>`
          )
          .join('')}
      </div>`;
  }

  function selectSlot(iso) {
    state.selectedSlot = iso;

    const mode = state.meta.modes[state.mode];
    el.summary.innerHTML = `
      <div class="sum-row">
        <span class="sum-ico">📅</span>
        <div><b>${capitalize(dateLabel(state.selectedDate))}</b>
        <small>${timeLabel(iso)} h · ${state.meta.slotMinutes} minutos</small></div>
      </div>
      <div class="sum-row">
        <span class="sum-ico">${state.mode === 'meet' ? '🎥' : '📍'}</span>
        <div><b>${mode.label}</b><small>${mode.location || mode.description}</small></div>
      </div>`;

    goTo('form');
    setTimeout(() => $('agName').focus(), 120);
  }

  // ---------------------------------------------------------------------- envío
  async function submit(e) {
    e.preventDefault();
    if (state.sending) return;

    const name = el.fName.value.trim();
    const email = el.fEmail.value.trim();

    if (name.length < 2) return fieldError(el.fName, 'Necesitamos tu nombre.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
      return fieldError(el.fEmail, 'Revisá el email, no parece válido.');
    }

    state.sending = true;
    el.formError.hidden = true;
    el.submit.disabled = true;
    el.submit.innerHTML = '<span class="agenda-spinner"></span> Confirmando...';

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: state.mode,
          start: state.selectedSlot,
          name,
          email,
          phone: el.fPhone.value.trim(),
          notes: el.fNotes.value.trim(),
          website: el.fWebsite.value, // trampa anti-spam
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 409 = el horario se ocupó mientras completaba el formulario.
        if (res.status === 409) {
          el.formError.hidden = false;
          el.formError.textContent =
            data.error || 'Ese horario se acaba de ocupar. Elegí otro, por favor.';
          await loadAvailability();
          goTo('slot');
          return;
        }
        throw new Error(data.error || 'No se pudo confirmar');
      }

      showDone(data);
    } catch (err) {
      console.error('[agenda]', err);
      el.formError.hidden = false;
      el.formError.innerHTML = `
        ${err.message || 'No pudimos confirmar el turno.'}
        <a class="agenda-wa" href="https://wa.me/59892223914" target="_blank" rel="noopener">
          Coordinar por WhatsApp
        </a>`;
    } finally {
      state.sending = false;
      el.submit.disabled = false;
      el.submit.textContent = 'Confirmar asesoría';
    }
  }

  function fieldError(field, message) {
    field.classList.add('err');
    field.focus();
    el.formError.hidden = false;
    el.formError.textContent = message;
  }

  function showDone(data) {
    el.doneWhen.innerHTML = `<b>${capitalize(data.when)}</b>`;

    el.doneDetail.innerHTML = data.meetLink
      ? `<div class="done-box">
           <span class="done-box-label">Link de la videollamada</span>
           <a href="${data.meetLink}" target="_blank" rel="noopener">${data.meetLink}</a>
         </div>`
      : `<div class="done-box">
           <span class="done-box-label">Te esperamos en</span>
           <b>${data.location || 'Arenal Grande 2125, Montevideo'}</b>
         </div>`;

    goTo('done');
  }

  // ------------------------------------------------------------------- eventos
  document.querySelectorAll('.js-agenda').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    })
  );

  modal.querySelectorAll('[data-agenda-close]').forEach((btn) =>
    btn.addEventListener('click', close)
  );

  el.back.addEventListener('click', goBack);

  modal.querySelectorAll('[data-mode]').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      goTo('slot');
      loadAvailability();
    })
  );

  el.calPrev.addEventListener('click', () => shiftMonth(-1));
  el.calNext.addEventListener('click', () => shiftMonth(1));

  el.calGrid.addEventListener('click', (e) => {
    const day = e.target.closest('.cal-day');
    if (day && !day.disabled) selectDate(day.dataset.date);
  });

  el.slotPanel.addEventListener('click', (e) => {
    const slot = e.target.closest('.slot-btn');
    if (slot) selectSlot(slot.dataset.slot);
  });

  el.form.addEventListener('submit', submit);
  el.form.querySelectorAll('input').forEach((i) =>
    i.addEventListener('input', () => i.classList.remove('err'))
  );

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !modal.classList.contains('open')) return;
    state.step === 'mode' || state.step === 'done' ? close() : goBack();
  });
})();

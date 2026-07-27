// ============================================================================
//  Configuración de la agenda
//  ---------------------------------------------------------------------------
//  Este es el ÚNICO archivo que necesitás tocar para cambiar cómo funciona el
//  sistema de turnos: horarios, duración, feriados, dirección de la oficina.
//  No hace falta tocar nada más.
// ============================================================================

export const CONFIG = {
  // Zona horaria de referencia. Todo se calcula en hora de Montevideo,
  // sin importar desde dónde entre el visitante.
  timeZone: 'America/Montevideo',

  // Duración de cada asesoría, en minutos.
  slotMinutes: 30,

  // Colchón libre después de cada reunión, en minutos.
  // Ej: 15 → si tenés algo de 10:00 a 10:30, el siguiente turno recién a las 10:45.
  bufferMinutes: 0,

  // Anticipación mínima para reservar. Con 3, nadie puede agendar
  // para dentro de menos de 3 horas.
  minNoticeHours: 3,

  // Hasta cuántos días para adelante se puede reservar.
  maxDaysAhead: 30,

  // Máximo de turnos que se pueden reservar en un mismo día.
  // null = sin límite.
  maxPerDay: null,

  // ---------------------------------------------------------------------------
  //  Horarios de atención, por día de la semana.
  //  0 = domingo · 1 = lunes · 2 = martes ... 6 = sábado
  //  Cada día es una lista de franjas [desde, hasta] en formato 24 h.
  //
  //  Si querés cortar al mediodía, poné dos franjas:
  //      3: [['09:00', '13:00'], ['14:00', '18:00']],
  //  Si un día no atendés, borralo o dejalo como lista vacía.
  // ---------------------------------------------------------------------------
  workingHours: {
    1: [['09:00', '18:00']], // lunes
    2: [['09:00', '18:00']], // martes
    3: [['09:00', '18:00']], // miércoles
    4: [['09:00', '18:00']], // jueves
    5: [['09:00', '18:00']], // viernes
    // 6: [['09:00', '13:00']],  // ← descomentá si atendés sábados
  },

  // ---------------------------------------------------------------------------
  //  Días bloqueados (feriados, licencia, lo que sea), en formato YYYY-MM-DD.
  //  Están cargados los feriados NO laborables de Uruguay.
  //  Los movibles (Carnaval y Semana de Turismo) cambian cada año:
  //  agregalos a mano cuando corresponda.
  // ---------------------------------------------------------------------------
  blockedDates: [
    '2026-01-01', // Año Nuevo
    '2026-05-01', // Día de los Trabajadores
    '2026-07-18', // Jura de la Constitución
    '2026-08-25', // Declaratoria de la Independencia
    '2026-12-25', // Navidad
    '2027-01-01',
    '2027-05-01',
    '2027-07-18',
    '2027-08-25',
    '2027-12-25',
  ],

  // ---------------------------------------------------------------------------
  //  Las dos modalidades de asesoría.
  // ---------------------------------------------------------------------------
  modes: {
    meet: {
      label: 'Videollamada',
      description: 'Te mandamos el link de Google Meet por mail',
      // true → Google genera un link de Meet único para la reunión
      createMeet: true,
      location: null,
    },
    office: {
      label: 'Presencial',
      description: 'Nos visitás en nuestra oficina de Montevideo',
      createMeet: false,
      location: 'Arenal Grande 2125, Montevideo, Uruguay',
    },
  },

  // Datos de contacto que se incluyen en la invitación del calendario.
  company: {
    name: 'MA Importaciones',
    email: 'comex@maimportaciones.com.uy',
    whatsapp: '+598 92 223 914',
  },

  // ID del calendario donde se crean los eventos.
  // 'primary' = el calendario principal de la cuenta que autorizaste.
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
};

// Duración total que ocupa un turno en el calendario (asesoría + colchón).
export const blockMinutes = () => CONFIG.slotMinutes + CONFIG.bufferMinutes;

// Etiqueta que se guarda en cada evento creado desde la web.
// El panel la usa para listar sólo las asesorías, sin tocar el resto de tus
// eventos. Si la cambiás, actualizala también en el panel (src/lib/agendas.ts).
export const AGENDA_TAG = 'web-agenda';

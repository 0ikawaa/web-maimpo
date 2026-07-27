// Header shadow on scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 8));

// Mobile menu
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  burger.classList.remove('open'); mobileMenu.classList.remove('open');
}));

// Active nav highlighting via scroll spy
const sections = ['nosotros','servicio','contacto'];
const links = document.querySelectorAll('#navTabs a[data-link]');
const spy = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if(e.isIntersecting){
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(id => { const el = document.getElementById(id); if(el) spy.observe(el); });

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach(el => revealObserver.observe(el));
  // Red de seguridad: al cargar, revela lo que ya esté a la vista
  window.addEventListener('load', () => {
    revealEls.forEach(el => { if(el.getBoundingClientRect().top < window.innerHeight){ el.classList.add('in'); } });
  });
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// Paso a paso y FAQ ahora funcionan solo con HTML/CSS (radio + <details>),
// así funcionan siempre en el iPhone aunque el JavaScript no se ejecute.
// Mejora opcional: en móvil, llevar la respuesta a la vista al cambiar de pestaña.
document.querySelectorAll('.how-radio').forEach((r, i) => {
  r.addEventListener('change', () => {
    if(window.innerWidth <= 900){
      const panel = document.getElementById('h' + (i + 1));
      if(panel){
        requestAnimationFrame(() => {
          const y = panel.getBoundingClientRect().top + window.scrollY - 72;
          window.scrollTo({ top:y, behavior:'smooth' });
        });
      }
    }
  });
});

// El sistema de agendamiento (modal + calendario + Google Calendar)
// vive en agenda.js, que se carga aparte.

// Contact form validation + success
const form = document.getElementById('contactForm');
const success = document.getElementById('formSuccess');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let ok = true;
  const required = [form.nombre, form.apellido, form.email];
  required.forEach(f => {
    const invalid = !f.value.trim() || (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value));
    f.classList.toggle('err', invalid);
    if(invalid) ok = false;
  });
  if(!ok){ form.querySelector('.err').focus(); return; }

  // Armar mensaje de WhatsApp con los datos del formulario
  const WA_NUMBER = '59892223914'; // número de destino (sin + ni espacios)
  const l = [
    '*Nueva consulta desde la web*',
    '',
    'Nombre: ' + form.nombre.value.trim() + ' ' + form.apellido.value.trim(),
    'Email: ' + form.email.value.trim(),
    form.telefono.value.trim() ? 'Teléfono: ' + form.telefono.value.trim() : '',
    form.categoria.value ? 'Producto: ' + form.categoria.value : '',
    form.mensaje.value.trim() ? 'Mensaje: ' + form.mensaje.value.trim() : ''
  ].filter(Boolean).join('\n');
  window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(l), '_blank');

  success.classList.add('show');
  form.reset();
  success.scrollIntoView({ behavior:'smooth', block:'center' });
  setTimeout(() => success.classList.remove('show'), 6000);
});
form.querySelectorAll('input').forEach(i => i.addEventListener('input', () => i.classList.remove('err')));

// ============================================================================
//  Autorización con Google — se corre UNA sola vez.
//  ---------------------------------------------------------------------------
//    node scripts/get-refresh-token.js
//
//  Abre el navegador, te pide permiso sobre tu propio calendario y te devuelve
//  un "refresh token": la credencial permanente que usa el backend para crear
//  los eventos. Guardala en .env.local y en las variables de Vercel.
//
//  Antes de correrlo necesitás el Client ID y el Client Secret de Google Cloud.
//  El paso a paso completo está en SETUP-AGENDA.md.
// ============================================================================

import http from 'node:http';
import readline from 'node:readline/promises';
import { spawn } from 'node:child_process';
import { stdin, stdout } from 'node:process';

const PORT = 5555;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

// Permisos mínimos necesarios:
//   calendar.events   → crear los eventos de las asesorías
//   calendar.freebusy → consultar qué horarios están ocupados
// No da acceso a Gmail, ni a Drive, ni a ninguna otra cosa de tu cuenta.
// Tampoco permite leer el contenido de tus eventos existentes.
const SCOPE = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ');

function openBrowser(url) {
  // En Windows, cmd interpreta "&" como separador de comandos y partiría la URL
  // en el primer parámetro (el navegador recibiría sólo ?client_id=...).
  // Escaparlos como ^& hace que cmd los pase tal cual.
  const commands = {
    win32: ['cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')]],
    darwin: ['open', [url]],
  };
  const [cmd, args] = commands[process.platform] || ['xdg-open', [url]];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch {
    return false;
  }
}

const page = (title, message, color) => `<!doctype html>
<html lang="es"><meta charset="utf-8"><title>${title}</title>
<body style="font-family:system-ui,sans-serif;background:#F6F8FA;display:grid;place-items:center;height:100vh;margin:0">
  <div style="background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 20px 50px rgba(11,31,58,.12);text-align:center;max-width:420px">
    <div style="font-size:44px;line-height:1">${color === 'ok' ? '✅' : '⚠️'}</div>
    <h1 style="font-size:20px;color:#0B1F3A;margin:14px 0 8px">${title}</h1>
    <p style="color:#5C6B7A;font-size:14px;line-height:1.6;margin:0">${message}</p>
  </div>
</body></html>`;

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log('\n  Autorización de Google Calendar — MA Importaciones\n');
  console.log('  Necesitás el Client ID y el Client Secret de Google Cloud.');
  console.log('  (Si todavía no los tenés, mirá SETUP-AGENDA.md — paso 1 y 2)\n');

  const clientId = (
    process.env.GOOGLE_CLIENT_ID || (await rl.question('  Client ID     : '))
  ).trim();
  const clientSecret = (
    process.env.GOOGLE_CLIENT_SECRET || (await rl.question('  Client Secret : '))
  ).trim();
  rl.close();

  if (!clientId || !clientSecret) {
    console.error('\n  ✗ Falta el Client ID o el Client Secret.\n');
    process.exit(1);
  }

  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      // offline + consent es lo que hace que Google devuelva el refresh token.
      access_type: 'offline',
      prompt: 'consent',
    });

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== '/oauth/callback') {
        res.writeHead(404).end();
        return;
      }

      const error = url.searchParams.get('error');
      const received = url.searchParams.get('code');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        error || !received
          ? page('No se pudo autorizar', `Google devolvió: ${error || 'sin código'}`, 'err')
          : page('¡Listo!', 'Ya podés cerrar esta pestaña y volver a la terminal.', 'ok')
      );

      server.close();
      error || !received
        ? reject(new Error(error || 'Google no devolvió el código'))
        : resolve(received);
    });

    server.on('error', (err) => {
      reject(
        err.code === 'EADDRINUSE'
          ? new Error(`El puerto ${PORT} está ocupado. Cerrá lo que lo esté usando y reintentá.`)
          : err
      );
    });

    server.listen(PORT, () => {
      console.log('\n  Abriendo el navegador para que autorices...');
      openBrowser(authUrl);
      // Se muestra siempre: si el navegador no abre o abre mal, se pega a mano.
      console.log('\n  Si no se abrió solo, pegá esta URL en el navegador:\n');
      console.log(`  ${authUrl}\n`);
      console.log('  Elegí la cuenta de Google donde querés recibir las asesorías.');
      console.log('  Si aparece "Google no verificó esta aplicación", entrá en');
      console.log('  "Configuración avanzada" → "Ir a ... (no seguro)". Es tu propia app.\n');
    });
  });

  console.log('  Canjeando el código por el token...\n');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.refresh_token) {
    console.error('  ✗ Google no devolvió un refresh token.');
    console.error('   ', data.error_description || data.error || JSON.stringify(data));
    console.error('\n  Si ya habías autorizado antes, revocá el acceso en');
    console.error('  https://myaccount.google.com/permissions y volvé a correr esto.\n');
    process.exit(1);
  }

  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  console.log('  │  Listo. Pegá estas 3 líneas en tu archivo .env.local        │');
  console.log('  └─────────────────────────────────────────────────────────────┘\n');
  console.log(`GOOGLE_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}\n`);
  console.log('  Después subilas a Vercel con:  vercel env add GOOGLE_REFRESH_TOKEN');
  console.log('  ⚠  Tratá el refresh token como una contraseña: no lo subas al repo.\n');
}

main().catch((err) => {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
});

// Patches security <meta> tags into the static web export's dist/index.html.
//
// Expo's web output is set to "single" (SPA/CSR), and +html.tsx customization
// only applies in "static"/"server" output modes -- so this is the only way
// to ship a CSP without switching the whole app's rendering model. A meta-tag
// CSP can't cover frame-ancestors or X-Content-Type-Options (those need a
// real HTTP header, which GitHub Pages doesn't let you set); this covers what
// a static host can.
const fs = require('fs');
const path = require('path');

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const supabaseOrigin = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

if (!supabaseOrigin) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL must be set when running inject-security-headers.js');
}

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' blob: ${supabaseOrigin} https://nominatim.openstreetmap.org https://api.weather.gov`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const metaTags = [
  `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
  '<meta name="referrer" content="strict-origin-when-cross-origin">',
  // PWA / installability -- Expo's web output has no +html.tsx support in
  // "single" mode (see note above), so these ride along with the CSP patch.
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<meta name="theme-color" content="#7a8a5e">',
  '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Gear Pro">',
].join('\n    ');

let html = fs.readFileSync(distIndex, 'utf8');

if (html.includes('Content-Security-Policy')) {
  console.log('inject-security-headers: CSP already present, skipping');
  process.exit(0);
}

html = html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${metaTags}`);
fs.writeFileSync(distIndex, html);
console.log('inject-security-headers: CSP + referrer-policy meta tags injected');

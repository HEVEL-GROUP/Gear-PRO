// Expo web calls *.supabase.co cross-origin (unlike a same-origin Next.js API
// route), so every browser-facing function needs real CORS handling. The
// webhook function is server-to-server (Stripe -> us) and skips this.
const ALLOWED_ORIGINS = new Set([
  'https://gearpro.app',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8090',
]);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://gearpro.app';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

export function appOrigin(origin: string | null): string {
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://gearpro.app';
}

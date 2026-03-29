export const RATE_LIMIT_WINDOW_MS = 5 * 1000;
export const MAX_DISPLAY_NAME_LENGTH = 35;
export const MIN_CHECK_INTERVAL_MINUTES = 1;
export const MAX_CHECK_INTERVAL_MINUTES = 10080;
export const MIN_PUSH_TOKEN_LENGTH = 8;
export const MAX_PUSH_TOKEN_LENGTH = 2048;
export const MAX_DEVICE_MODEL_LENGTH = 255;
export const PAIRING_TOKEN_TTL_MINUTES = 5;
export const PAIRING_CLEANUP_AFTER_MINUTES = 10;
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
export const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';
export const TURNSTILE_TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
export const API_CORS_ALLOW_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
export const API_CORS_ALLOW_HEADERS = 'Content-Type, Authorization';
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
].join('; ');

export const CAPACITOR_ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
]);

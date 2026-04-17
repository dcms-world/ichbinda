export const RATE_LIMIT_WINDOW_MS = 5 * 1000;
export const MAX_DISPLAY_NAME_LENGTH = 35;
export const MIN_CHECK_INTERVAL_MINUTES = 1;
export const MAX_CHECK_INTERVAL_MINUTES = 10080;
export const MIN_PUSH_TOKEN_LENGTH = 8;
export const MAX_PUSH_TOKEN_LENGTH = 2048;
export const MAX_DEVICE_MODEL_LENGTH = 255;
export const PAIRING_TOKEN_TTL_MINUTES = 5;
export const PAIRING_CLEANUP_AFTER_MINUTES = 10;
export const API_CORS_ALLOW_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
export const API_CORS_ALLOW_HEADERS = 'Content-Type, Authorization';
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
].join('; ');

export const DOCS_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'",
].join('; ');

export const CAPACITOR_ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
]);

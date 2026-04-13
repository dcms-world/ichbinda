import type { Context } from 'hono';

import {
  API_CORS_ALLOW_HEADERS,
  API_CORS_ALLOW_METHODS,
  CAPACITOR_ALLOWED_ORIGINS,
  CONTENT_SECURITY_POLICY,
} from '../constants';

export function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export async function hashApiKey(key: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function isLocalRequest(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === '127.0.0.1' || hostname === 'localhost';
  } catch {
    return false;
  }
}

export function isLocalHostHeader(hostHeader: string | undefined): boolean {
  const host = (hostHeader ?? '').trim().toLowerCase();
  return host === '127.0.0.1' || host === 'localhost' || host.startsWith('127.0.0.1:') || host.startsWith('localhost:');
}

function isLocalCorsOrigin(url: URL): boolean {
  const isLocalHost = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  return isLocalHost && (url.protocol === 'http:' || url.protocol === 'https:');
}

export function resolveAllowedCorsOrigin(origin: string | undefined, requestUrl: string): string | null {
  if (!origin) return null;
  if (CAPACITOR_ALLOWED_ORIGINS.has(origin)) return origin;

  try {
    const originUrl = new URL(origin);
    const requestOrigin = new URL(requestUrl).origin;

    if (isLocalCorsOrigin(originUrl)) {
      return origin;
    }

    if (originUrl.origin === requestOrigin) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

export function applyCorsHeaders(c: Context, origin: string): void {
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', API_CORS_ALLOW_METHODS);
  c.header('Access-Control-Allow-Headers', API_CORS_ALLOW_HEADERS);
  c.header('Vary', 'Origin');
}

export function applySecurityHeaders(c: Context): void {
  c.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (new URL(c.req.url).protocol === 'https:') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}


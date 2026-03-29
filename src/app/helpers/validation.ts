import {
  MAX_CHECK_INTERVAL_MINUTES,
  MAX_DEVICE_MODEL_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PUSH_TOKEN_LENGTH,
  MIN_CHECK_INTERVAL_MINUTES,
  MIN_PUSH_TOKEN_LENGTH,
} from '../constants';

export function normalizeDisplayName(name: unknown): string {
  return String(name ?? '').trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function isLetterChar(char: string): boolean {
  return !!char && char.toLocaleLowerCase() !== char.toLocaleUpperCase();
}

export function hasTwoLetterStart(name: unknown): boolean {
  const chars = [...String(name ?? '').trim()];
  return chars.length >= 2 && isLetterChar(chars[0] ?? '') && isLetterChar(chars[1] ?? '');
}

export function getDisplayNameValidationError(name: unknown): string | null {
  const trimmed = String(name ?? '').trim();
  if (trimmed.length < 2) return 'name-too-short';
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) return 'name-too-long';
  if (!hasTwoLetterStart(trimmed)) return 'name-invalid-start';
  return null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function parseCheckIntervalMinutes(value: unknown): number | null {
  let parsed: number | null = null;

  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    parsed = Number(value.trim());
  }

  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }

  if (parsed < MIN_CHECK_INTERVAL_MINUTES || parsed > MAX_CHECK_INTERVAL_MINUTES) {
    return null;
  }

  return parsed;
}

export function parsePushToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length < MIN_PUSH_TOKEN_LENGTH || trimmed.length > MAX_PUSH_TOKEN_LENGTH) {
    return null;
  }

  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseDeviceModel(value: unknown): string | null {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (trimmed.length > MAX_DEVICE_MODEL_LENGTH) {
    return null;
  }

  return trimmed;
}

export function detectDeviceModel(userAgent: string | null): string {
  const agent = (userAgent || '').toLowerCase();
  if (!agent) return 'Desktop';
  if (agent.includes('iphone')) return 'iPhone';
  if (agent.includes('ipad') || (agent.includes('macintosh') && agent.includes('mobile'))) return 'iPad';
  if (agent.includes('android')) return 'Android';
  return 'Desktop';
}

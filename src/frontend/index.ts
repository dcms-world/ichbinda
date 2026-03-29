import { LANDING_HTML } from './landing';
import { PERSON_HTML } from './person';
import { JSQR_SCRIPT, QRCODE_SCRIPT } from './vendor';
import { WATCHER_HTML } from './watcher';

export { LANDING_HTML };

export function renderPersonHtml(turnstileSiteKey: string): string {
  return PERSON_HTML
    .replace('__TURNSTILE_SITE_KEY__', turnstileSiteKey)
    .replace('__QRCODE_SCRIPT__', QRCODE_SCRIPT)
    .replace('__JSQR_SCRIPT__', JSQR_SCRIPT);
}

export function renderWatcherHtml(turnstileSiteKey: string): string {
  return WATCHER_HTML
    .replace('__TURNSTILE_SITE_KEY__', turnstileSiteKey)
    .replace('__JSQR_SCRIPT__', JSQR_SCRIPT);
}

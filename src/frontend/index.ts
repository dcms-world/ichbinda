import { DOCS_HTML } from './docs';
import { LANDING_HTML } from './landing';
import { PERSON_HTML } from './person';
import { PRO_DEMO_HTML } from './pro-demo';
import { JSQR_SCRIPT, QRCODE_SCRIPT } from './vendor';
import { WATCHER_HTML } from './watcher';

export { LANDING_HTML, DOCS_HTML, PRO_DEMO_HTML };

export function renderPersonHtml(): string {
  return PERSON_HTML
    .replace('__QRCODE_SCRIPT__', QRCODE_SCRIPT)
    .replace('__JSQR_SCRIPT__', JSQR_SCRIPT);
}

export function renderWatcherHtml(): string {
  return WATCHER_HTML
    .replace('__JSQR_SCRIPT__', JSQR_SCRIPT);
}

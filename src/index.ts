import { Hono } from 'hono';

import { registerApiRoutes } from './app/api';
import { cleanupPairingRequests, cleanupDeviceLinkRequests, checkOverduePersons } from './app/helpers/db';
import { DOCS_CONTENT_SECURITY_POLICY } from './app/constants';
import { applySecurityHeaders } from './app/helpers/security';
import { DOCS_HTML, LANDING_HTML, PRO_DEMO_HTML, renderPersonHtml, renderWatcherHtml } from './frontend';
import type { AppBindings, AppEnv } from './app/types';

const app = new Hono<AppEnv>();

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store',
    },
  });
}

app.get('/', () => htmlResponse(LANDING_HTML));
app.get('/person.html', (c) => htmlResponse(renderPersonHtml()));
app.get('/watcher.html', (c) => htmlResponse(renderWatcherHtml()));
app.get('/docs', () => htmlResponse(DOCS_HTML));
app.get('/pro-demo', () => htmlResponse(PRO_DEMO_HTML));

app.use('*', async (c, next) => {
  await next();
  if (c.req.path === '/docs') {
    c.header('Content-Security-Policy', DOCS_CONTENT_SECURITY_POLICY);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (new URL(c.req.url).protocol === 'https:') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  } else {
    applySecurityHeaders(c);
  }
});

registerApiRoutes(app);

export default {
  async fetch(request: Request, env: AppBindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: AppBindings, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([
      checkOverduePersons(env.DB, env.EXPO_ACCESS_TOKEN),
      cleanupPairingRequests(env.DB),
      cleanupDeviceLinkRequests(env.DB),
    ]));
  },
};

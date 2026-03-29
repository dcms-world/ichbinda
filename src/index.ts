import { Hono } from 'hono';

import { registerApiRoutes } from './app/api';
import { cleanupPairingRequests, checkOverduePersons } from './app/helpers/db';
import { applySecurityHeaders, resolveTurnstileSiteKey } from './app/helpers/security';
import { LANDING_HTML, renderPersonHtml, renderWatcherHtml } from './frontend';
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
app.get('/person.html', (c) =>
  htmlResponse(
    renderPersonHtml(
      resolveTurnstileSiteKey(c.req.url, c.env.TURNSTILE_SITE_KEY, c.req.header('host')),
    ),
  ),
);
app.get('/watcher.html', (c) =>
  htmlResponse(
    renderWatcherHtml(
      resolveTurnstileSiteKey(c.req.url, c.env.TURNSTILE_SITE_KEY, c.req.header('host')),
    ),
  ),
);

app.use('*', async (c, next) => {
  await next();
  applySecurityHeaders(c);
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
    ]));
  },
};

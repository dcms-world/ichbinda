import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const TURNSTILE_TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function stubTurnstile(context: BrowserContext): Promise<void> {
  await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: '',
    });
  });
}

async function registerPerson(page: Page, displayName: string): Promise<string> {
  await page.goto('/person.html');
  await expect(page.locator('#personNameInput')).toBeVisible();
  await page.locator('#personNameInput').fill(displayName);
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.waitForFunction(() => typeof (window as { onTurnstileSuccess?: unknown }).onTurnstileSuccess === 'function');
  await expect(page.locator('#authOverlay')).toBeVisible();
  await page.evaluate(async (token) => {
    await (window as Window & { onTurnstileSuccess(token: string): Promise<void> }).onTurnstileSuccess(token);
  }, TURNSTILE_TEST_TOKEN);
  await page.waitForFunction(() => !!window.localStorage.getItem('ibinda_person_id'));
  await expect(page.locator('#authOverlay')).toBeHidden();
  await expect(page.locator('#status')).toContainText('Richte zuerst eine Verbindung ein');
  const personId = await page.evaluate(() => window.localStorage.getItem('ibinda_person_id') || '');
  expect(personId).not.toBe('');
  return personId;
}

async function registerWatcher(page: Page, displayName: string): Promise<void> {
  await page.goto('/watcher.html');
  await page.waitForFunction(() => typeof (window as { onTurnstileSuccess?: unknown }).onTurnstileSuccess === 'function');
  await expect(page.locator('#authOverlay')).toBeVisible();
  await page.evaluate(async (token) => {
    await (window as Window & { onTurnstileSuccess(token: string): Promise<void> }).onTurnstileSuccess(token);
  }, TURNSTILE_TEST_TOKEN);
  await expect(page.locator('#authOverlay')).toBeHidden();
  await expect(page.locator('#watcherNameInput')).toBeVisible();
  await page.locator('#watcherNameInput').fill(displayName);
  await page.getByRole('button', { name: 'Speichern' }).click();
  try {
    await page.waitForFunction(() => {
      const value = window.localStorage.getItem('ibinda_watcher_id') || '';
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }, { timeout: 3_000 });
  } catch {
    // Fall back to an explicit watcher bootstrap if the page init has not finished yet.
  }
  await page.evaluate(async () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const currentWatcherId = window.localStorage.getItem('ibinda_watcher_id') || '';
    if (!uuidPattern.test(currentWatcherId)) {
      const response = await fetch('/api/watcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ push_token: `web-${crypto.randomUUID()}` }),
      });
      const data = await response.json().catch(() => ({} as { error?: string; id?: string }));
      if (!response.ok || !uuidPattern.test(String(data.id || ''))) {
        throw new Error(data.error || `watcher bootstrap failed: ${response.status}`);
      }
      window.localStorage.setItem('ibinda_watcher_id', String(data.id));
    }

    const announcer = (window as Window & { announceWatcherName?: () => Promise<void> }).announceWatcherName;
    const loader = (window as Window & { loadPersons?: () => Promise<void> }).loadPersons;
    if (typeof announcer === 'function') {
      await announcer();
    }
    if (typeof loader === 'function') {
      await loader();
    }
  });
  await page.waitForFunction(() => {
    const value = window.localStorage.getItem('ibinda_watcher_id') || '';
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  });
  await expect(page.locator('#personList')).toContainText('Noch keine verbundenen Personen.');
}

test('pairing confirmation updates watcher list immediately', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  await stubTurnstile(personContext);
  await stubTurnstile(watcherContext);

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personId = await registerPerson(personPage, 'Oma Erna');
  await registerWatcher(watcherPage, 'Max Muster');

  await personPage.getByRole('button', { name: 'Menü öffnen' }).click();
  await personPage.locator('#settingsPanel .qr-scan-btn').first().click();
  await expect(personPage.locator('#pairingQrModalOverlay')).toHaveClass(/open/);
  await personPage.waitForFunction(() => {
    const payloadBuilder = (window as Window & { buildQrPayload?: () => string }).buildQrPayload;
    return typeof payloadBuilder === 'function' && !!payloadBuilder();
  });
  const pairingPayload = await personPage.evaluate(() => {
    return (window as Window & { buildQrPayload: () => string }).buildQrPayload();
  });

  await watcherPage.locator('#personId').fill(pairingPayload);
  await watcherPage.locator('#addPersonBtn').click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/);
  await expect(watcherPage.locator('#statusModalMessage')).toContainText('muss die Verbindung jetzt bestätigen');
  await watcherPage.locator('#statusModalButton').click();

  await expect(personPage.locator('#pairingRequestModalOverlay')).toHaveClass(/open/);
  await expect(personPage.locator('#pairingRequestText')).toContainText('Max Muster');
  await personPage.locator('#pairingApproveBtn').click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/);
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbindung bestätigt');
  await expect(watcherPage.locator('#personList .person-item')).toHaveCount(1);
  await expect(watcherPage.locator('#personList')).toContainText('Oma Erna');

  await expect(personPage.locator('#status')).toContainText('Einmal tippen: Alles okay');
  await expect(personPage.locator('#btnOkay')).toContainText('OK');
  await expect(personPage.locator('#noWatcherWarning')).not.toHaveClass(/visible/);

  await expect
    .poll(async () => {
      return watcherPage.evaluate(() => window.localStorage.getItem('ibinda_person_names') || '');
    })
    .toContain('Oma Erna');

  await personContext.close();
  await watcherContext.close();
  expect(personId).toMatch(UUID_PATTERN);
});

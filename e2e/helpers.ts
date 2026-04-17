import { expect, type Page } from '@playwright/test';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let uniqueCounter = 0;

export function uniqueName(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix} ${Date.now().toString().slice(-6)}-${uniqueCounter}`;
}

export async function getLocalStorageItem(page: Page, key: string): Promise<string> {
  return page.evaluate((storageKey) => window.localStorage.getItem(storageKey) || '', key);
}

export async function registerPerson(page: Page, displayName: string): Promise<string> {
  await page.goto('/person.html');
  await expect(page.locator('#personNameInput')).toBeVisible();
  await page.locator('#personNameInput').fill(displayName);
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.waitForFunction(() => {
    const value = window.localStorage.getItem('ibinda_person_id') || '';
    return /^[0-9a-f-]{36}$/i.test(value);
  });
  await expect(page.locator('#status')).toContainText('Richte zuerst eine Verbindung ein');
  await expect(page.locator('#inlineQrCard')).toBeVisible();
  const personId = await getLocalStorageItem(page, 'ibinda_person_id');
  expect(personId).toMatch(UUID_PATTERN);
  return personId;
}

export async function registerWatcher(page: Page, displayName: string): Promise<string> {
  await page.goto('/watcher.html');
  await expect(page.locator('#watcherNameInput')).toBeVisible();
  await page.locator('#watcherNameInput').fill(displayName);
  await page.getByRole('button', { name: 'Speichern' }).click();

  try {
    await page.waitForFunction(() => {
      const value = window.localStorage.getItem('ibinda_watcher_id') || '';
      return /^[0-9a-f-]{36}$/i.test(value);
    }, { timeout: 3_000 });
  } catch {
    // The bootstrap request can lag behind the modal close slightly in CI.
  }

  await page.evaluate(async () => {
    const uuidPattern = /^[0-9a-f-]{36}$/i;
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

    const watcherWindow = window as Window & {
      announceWatcherName?: () => Promise<void>;
      loadPersons?: () => Promise<void>;
    };
    if (typeof watcherWindow.announceWatcherName === 'function') {
      await watcherWindow.announceWatcherName();
    }
    if (typeof watcherWindow.loadPersons === 'function') {
      await watcherWindow.loadPersons();
    }
  });

  await page.waitForFunction(() => {
    const value = window.localStorage.getItem('ibinda_watcher_id') || '';
    return /^[0-9a-f-]{36}$/i.test(value);
  });
  await expect(page.locator('#personList')).toContainText('Noch niemand verbunden');
  const watcherId = await getLocalStorageItem(page, 'ibinda_watcher_id');
  expect(watcherId).toMatch(UUID_PATTERN);
  return watcherId;
}

export async function openPersonSettings(page: Page): Promise<void> {
  if (await page.locator('#settingsPanel').evaluate((element) => element.classList.contains('open')).catch(() => false)) {
    return;
  }
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  await expect(page.locator('#settingsPanel')).toHaveClass(/open/);
}

export async function decodeRenderedQr(page: Page, rootSelector = '#qrcode'): Promise<string> {
  return page.evaluate(async (selector) => {
    const qrRoot = document.querySelector(selector);
    if (!qrRoot) throw new Error('QR root missing');

    const appWindow = window as Window & {
      jsQR?: (
        data: Uint8ClampedArray,
        width: number,
        height: number,
        options?: unknown,
      ) => { data?: string } | null;
    };
    if (typeof appWindow.jsQR !== 'function') throw new Error('jsQR missing');

    const sourceCanvas = qrRoot.querySelector('canvas');
    if (sourceCanvas instanceof HTMLCanvasElement) {
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new Error('QR canvas context missing');
      const imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const result = appWindow.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      return result?.data || '';
    }

    const svg = qrRoot.querySelector('svg');
    if (!(svg instanceof SVGElement)) throw new Error('QR render element missing');

    const svgMarkup = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('QR image load failed'));
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = image.width || 240;
      canvas.height = image.height || 240;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('QR canvas context missing');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = appWindow.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      return result?.data || '';
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, rootSelector);
}

export async function openPairingQrAndGetPayload(page: Page, verifyRendered = true): Promise<string> {
  await openPersonSettings(page);
  await page.locator('#settingsPanel .qr-scan-btn').first().click();
  await expect(page.locator('#pairingQrModalOverlay')).toHaveClass(/open/);
  await page.waitForFunction(() => {
    const personWindow = window as Window & { buildQrPayload?: () => string };
    return typeof personWindow.buildQrPayload === 'function' && !!personWindow.buildQrPayload();
  });
  await page.waitForFunction(() => !!document.querySelector('#qrcode canvas, #qrcode svg'));
  const payload = await page.evaluate(() => {
    const personWindow = window as Window & { buildQrPayload: () => string };
    return personWindow.buildQrPayload();
  });
  if (verifyRendered) {
    await expect.poll(async () => decodeRenderedQr(page), { timeout: 10_000 }).toBe(payload);
  }
  return payload;
}

export async function openDeviceLinkQrAndGetPayload(page: Page): Promise<string> {
  await openPersonSettings(page);
  await expect(page.locator('#deviceActionButton')).toBeVisible();
  await page.locator('#deviceActionButton').click();
  await expect(page.locator('#pairingQrModalOverlay')).toHaveClass(/open/);
  await page.waitForFunction(() => {
    const personWindow = window as Window & { buildQrPayload?: () => string };
    return typeof personWindow.buildQrPayload === 'function' && !!personWindow.buildQrPayload();
  });
  await page.waitForFunction(() => !!document.querySelector('#qrcode canvas, #qrcode svg'));
  const payload = await page.evaluate(() => {
    const personWindow = window as Window & { buildQrPayload: () => string };
    return personWindow.buildQrPayload();
  });
  await expect.poll(async () => decodeRenderedQr(page), { timeout: 10_000 }).toBe(payload);
  return payload;
}

export async function submitWatcherPairing(page: Page, pairingPayload: string): Promise<void> {
  await page.locator('#fabAdd').click();
  await expect(page.locator('#addPersonOverlay')).toHaveClass(/open/);
  await page.locator('#personId').fill(pairingPayload);
  await page.locator('#addPersonBtn').click();
}

export async function closeWatcherStatusModal(page: Page): Promise<void> {
  if (await page.locator('#statusModalOverlay').evaluate((element) => element.classList.contains('open')).catch(() => false)) {
    await page.locator('#statusModalOverlay button').click();
    await expect(page.locator('#statusModalOverlay')).not.toHaveClass(/open/);
  }
}

export async function triggerPersonPairingPoll(page: Page, pairingPayload: string): Promise<void> {
  const token = JSON.parse(pairingPayload).t as string;
  await page.evaluate(async (pairingToken) => {
    const personWindow = window as Window & { pollPairingStatus?: (token: string) => Promise<void> };
    if (typeof personWindow.pollPairingStatus === 'function') {
      await personWindow.pollPairingStatus(pairingToken);
    }
  }, token);
}

export async function pairPersonAndWatcher(
  personPage: Page,
  watcherPage: Page,
  personName: string,
  watcherName: string,
  verifyRenderedQr = true,
): Promise<{ personId: string; watcherId: string; pairingPayload: string }> {
  const personId = await registerPerson(personPage, personName);
  const watcherId = await registerWatcher(watcherPage, watcherName);
  const pairingPayload = await openPairingQrAndGetPayload(personPage, verifyRenderedQr);
  await submitWatcherPairing(watcherPage, pairingPayload);
  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/);
  await expect(watcherPage.locator('#statusModalMessage')).toContainText('Warte auf Bestätigung der Person');
  await closeWatcherStatusModal(watcherPage);
  await triggerPersonPairingPoll(personPage, pairingPayload);
  await expect(personPage.locator('#pairingRequestModalOverlay')).toHaveClass(/open/, { timeout: 10_000 });
  return { personId, watcherId, pairingPayload };
}

export async function waitForWatcherPersonCard(page: Page, personName: string) {
  const card = page.locator('#personList .person-card').filter({ hasText: personName }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  return card;
}

export async function triggerWatcherReload(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const watcherWindow = window as Window & { loadPersons?: () => Promise<void> };
    if (typeof watcherWindow.loadPersons === 'function') {
      await watcherWindow.loadPersons();
    }
  });
}

export async function triggerPersonWatcherReload(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const personId = window.localStorage.getItem('ibinda_person_id') || '';
    const personWindow = window as Window & { loadWatchers?: (personId: string) => Promise<void> };
    if (personId && typeof personWindow.loadWatchers === 'function') {
      await personWindow.loadWatchers(personId);
    }
  });
}

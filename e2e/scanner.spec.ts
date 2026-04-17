import { expect, test, type Page } from '@playwright/test';

import {
  closeWatcherStatusModal,
  openPairingQrAndGetPayload,
  registerPerson,
  registerWatcher,
  triggerPersonPairingPoll,
  uniqueName,
  waitForWatcherPersonCard,
} from './helpers';

async function installWatcherCameraMocks(page: Page) {
  await page.addInitScript(() => {
    const fakeCanvas = document.createElement('canvas');
    fakeCanvas.width = 640;
    fakeCanvas.height = 640;
    const fakeContext = fakeCanvas.getContext('2d');
    if (fakeContext) {
      fakeContext.fillStyle = '#ffffff';
      fakeContext.fillRect(0, 0, fakeCanvas.width, fakeCanvas.height);
    }
    const fakeStream = typeof fakeCanvas.captureStream === 'function'
      ? fakeCanvas.captureStream()
      : new MediaStream();

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => fakeStream,
      },
    });

    HTMLMediaElement.prototype.play = function play() {
      if (this instanceof HTMLVideoElement) {
        Object.defineProperty(this, 'readyState', { configurable: true, get: () => 4 });
        Object.defineProperty(this, 'videoWidth', { configurable: true, get: () => 640 });
        Object.defineProperty(this, 'videoHeight', { configurable: true, get: () => 640 });
      }
      return Promise.resolve();
    };
  });
}

test('@camera watcher scanner accepts the person QR payload via mocked camera flow', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext({ permissions: ['camera'] });

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  await installWatcherCameraMocks(watcherPage);

  const personName = uniqueName('Oma Scanner');
  const watcherName = uniqueName('Max Scanner');

  await registerPerson(personPage, personName);
  await registerWatcher(watcherPage, watcherName);

  const pairingPayload = await openPairingQrAndGetPayload(personPage);

  await watcherPage.evaluate((payload) => {
    const scannerWindow = window as Window & {
      jsQR?: () => { data: string } | null;
    };
    scannerWindow.jsQR = () => ({ data: payload });
  }, pairingPayload);

  await watcherPage.locator('#fabAdd').click();
  await expect(watcherPage.locator('#addPersonOverlay')).toHaveClass(/open/);
  await watcherPage.getByRole('button', { name: 'QR-Code scannen' }).click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/, { timeout: 10_000 });
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Anfrage gesendet');
  await closeWatcherStatusModal(watcherPage);

  await triggerPersonPairingPoll(personPage, pairingPayload);
  await expect(personPage.locator('#pairingRequestModalOverlay')).toHaveClass(/open/, { timeout: 10_000 });
  await expect(personPage.locator('#pairingRequestText')).toContainText(watcherName);
  await personPage.locator('#pairingApproveBtn').click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/, { timeout: 10_000 });
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbunden!');
  await waitForWatcherPersonCard(watcherPage, personName);

  await personContext.close();
  await watcherContext.close();
});

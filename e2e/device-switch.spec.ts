import { expect, test } from '@playwright/test';

import {
  closeWatcherStatusModal,
  getLocalStorageItem,
  openDeviceLinkQrAndGetPayload,
  pairPersonAndWatcher,
  registerPerson,
  uniqueName,
  waitForWatcherPersonCard,
} from './helpers';

test('device switch moves the person to the new device and resets the old one', async ({ browser }) => {
  test.slow();

  const oldPersonContext = await browser.newContext();
  const watcherContext = await browser.newContext();
  const newPersonContext = await browser.newContext();

  const oldPersonPage = await oldPersonContext.newPage();
  const watcherPage = await watcherContext.newPage();
  const newPersonPage = await newPersonContext.newPage();

  const originalPersonName = uniqueName('Oma Wechsel');
  const watcherName = uniqueName('Max Wechsel');
  const { personId: originalPersonId } = await pairPersonAndWatcher(
    oldPersonPage,
    watcherPage,
    originalPersonName,
    watcherName,
  );

  await oldPersonPage.locator('#pairingApproveBtn').click();
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbunden!', { timeout: 10_000 });
  await closeWatcherStatusModal(watcherPage);

  await waitForWatcherPersonCard(watcherPage, originalPersonName);
  const deviceLinkPayload = await openDeviceLinkQrAndGetPayload(oldPersonPage);
  const deviceLinkToken = JSON.parse(deviceLinkPayload).link_token as string;

  const temporaryPersonId = await registerPerson(newPersonPage, uniqueName('Oma NeuesGerät'));
  expect(temporaryPersonId).not.toBe(originalPersonId);

  await newPersonPage.evaluate(async (payload) => {
    const data = JSON.parse(payload) as { link_token: string; device_mode: string; person_name: string };
    const personWindow = window as Window & {
      handleNewDeviceScanned?: (token: string, mode: string, personName: string) => Promise<void>;
    };
    if (typeof personWindow.handleNewDeviceScanned === 'function') {
      await personWindow.handleNewDeviceScanned(data.link_token, data.device_mode, data.person_name);
    }
  }, deviceLinkPayload);

  await expect(newPersonPage.locator('#pendingDeviceSwitchModalOverlay')).toHaveClass(/open/);
  await expect(newPersonPage.locator('#pendingDeviceSwitchText')).toContainText(originalPersonName);

  await oldPersonPage.evaluate(async (token) => {
    const personWindow = window as Window & { pollDeviceLinkStatus?: (deviceLinkToken: string) => Promise<void> };
    if (typeof personWindow.pollDeviceLinkStatus === 'function') {
      await personWindow.pollDeviceLinkStatus(token);
    }
  }, deviceLinkToken);
  await expect(oldPersonPage.locator('#deviceSwitchModalOverlay')).toHaveClass(/open/, { timeout: 10_000 });

  oldPersonPage.on('dialog', (dialog) => dialog.accept());
  await oldPersonPage.locator('#deviceSwitchApproveBtn').click();
  await expect(oldPersonPage.locator('#personNameInput')).toBeVisible({ timeout: 15_000 });

  await expect
    .poll(async () => getLocalStorageItem(newPersonPage, 'ibinda_person_id'), { timeout: 15_000 })
    .toBe(originalPersonId);
  await expect(newPersonPage.locator('#personNameDisplay')).toContainText(originalPersonName);
  await expect(newPersonPage.locator('#btnOkay')).toContainText('OK');

  await newPersonPage.locator('#btnOkay').click();
  await expect(newPersonPage.locator('#status')).toContainText('Gemeldet!');
  await waitForWatcherPersonCard(watcherPage, originalPersonName);

  await oldPersonContext.close();
  await watcherContext.close();
  await newPersonContext.close();
});

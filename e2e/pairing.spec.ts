import { expect, test } from '@playwright/test';

import {
  closeWatcherStatusModal,
  getLocalStorageItem,
  pairPersonAndWatcher,
  registerPerson,
  registerWatcher,
  triggerPersonPairingPoll,
  uniqueName,
  waitForWatcherPersonCard,
} from './helpers';

test('pairing confirmation updates watcher list immediately', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personName = uniqueName('Oma Erna');
  const watcherName = uniqueName('Max Muster');
  const { personId, pairingPayload } = await pairPersonAndWatcher(personPage, watcherPage, personName, watcherName);

  await expect(personPage.locator('#pairingRequestText')).toContainText(watcherName);
  await personPage.locator('#pairingApproveBtn').click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/, { timeout: 10_000 });
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbunden!');
  await waitForWatcherPersonCard(watcherPage, personName);

  await expect(personPage.locator('#status')).toContainText('Einmal tippen: Alles okay');
  await expect(personPage.locator('#btnOkay')).toContainText('OK');
  await expect(personPage.locator('#noWatcherWarning')).not.toHaveClass(/visible/);
  await expect
    .poll(async () => getLocalStorageItem(watcherPage, 'ibinda_person_names'))
    .toContain(personName);

  await personContext.close();
  await watcherContext.close();
  expect(JSON.parse(pairingPayload).p).toBe(personId);
});

test('pairing rejection surfaces a clean error without creating a connection', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personName = uniqueName('Oma Ablehnung');
  const watcherName = uniqueName('Max Ablehnung');
  const { pairingPayload } = await pairPersonAndWatcher(personPage, watcherPage, personName, watcherName);

  await expect(personPage.locator('#pairingRequestText')).toContainText(watcherName);
  await personPage.locator('#pairingRejectBtn').click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/, { timeout: 10_000 });
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Fehlgeschlagen');
  await expect(watcherPage.locator('#statusModalMessage')).toContainText('abgelehnt');
  await expect(watcherPage.locator('#personList')).toContainText('Noch niemand verbunden');

  await triggerPersonPairingPoll(personPage, pairingPayload);
  await expect(personPage.locator('#pairingQrModalOverlay')).toHaveClass(/open/);
  await expect(personPage.locator('#pairingRequestModalOverlay')).not.toHaveClass(/open/);

  await personContext.close();
  await watcherContext.close();
});

test('watcher rejects invalid or legacy pairing input in the UI', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personId = await registerPerson(personPage, uniqueName('Oma Legacy'));
  await registerWatcher(watcherPage, uniqueName('Max Legacy'));

  await watcherPage.locator('#fabAdd').click();
  await watcherPage.locator('#personId').fill(personId);
  await watcherPage.locator('#addPersonBtn').click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/);
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Pairing-Code erforderlich');
  await expect(watcherPage.locator('#statusModalMessage')).toContainText('gültiger Pairing-Code');
  await closeWatcherStatusModal(watcherPage);

  await watcherPage.locator('#personId').fill('kaputter-code');
  await watcherPage.locator('#addPersonBtn').click();

  await expect(watcherPage.locator('#statusModalOverlay')).toHaveClass(/open/);
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Eingabe prüfen');
  await expect(watcherPage.locator('#statusModalMessage')).toContainText('kein gültiges Pairing-Format');
  await expect(watcherPage.locator('#personList')).toContainText('Noch niemand verbunden');

  await personContext.close();
  await watcherContext.close();
});

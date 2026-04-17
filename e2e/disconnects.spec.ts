import { expect, test } from '@playwright/test';

import {
  closeWatcherStatusModal,
  pairPersonAndWatcher,
  triggerPersonWatcherReload,
  uniqueName,
  waitForWatcherPersonCard,
} from './helpers';

test('watcher can remove a connection and the person can acknowledge the disconnect', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personName = uniqueName('Oma Trennen');
  const watcherName = uniqueName('Max Trennen');
  await pairPersonAndWatcher(personPage, watcherPage, personName, watcherName);

  await personPage.locator('#pairingApproveBtn').click();
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbunden!', { timeout: 10_000 });
  await closeWatcherStatusModal(watcherPage);

  const card = await waitForWatcherPersonCard(watcherPage, personName);
  await card.click();
  await watcherPage.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(watcherPage.locator('#personEditOverlay')).toHaveClass(/open/);
  await watcherPage.getByRole('button', { name: 'Löschen' }).click();
  await expect(watcherPage.locator('#confirmModalOverlay')).toHaveClass(/open/);
  await watcherPage.locator('#confirmModalConfirmBtn').click();

  await expect(watcherPage.locator('#personList')).toContainText('Noch niemand verbunden');

  await triggerPersonWatcherReload(personPage);
  await expect(personPage.locator('#disconnectModalOverlay')).toHaveClass(/open/);
  await expect(personPage.locator('#disconnectModalText')).toContainText(watcherName);
  await personPage.locator('#disconnectModalAcknowledgeBtn').click();
  await expect(personPage.locator('#disconnectModalOverlay')).not.toHaveClass(/open/);

  await personPage.reload();
  await triggerPersonWatcherReload(personPage);
  await expect(personPage.locator('#disconnectModalOverlay')).not.toHaveClass(/open/);
  await expect(personPage.locator('#noWatcherWarning')).toHaveClass(/visible/);

  await personContext.close();
  await watcherContext.close();
});

test('deleting the watcher account disconnects persons and resets the watcher app', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personName = uniqueName('Oma Watcher');
  const watcherName = uniqueName('Max Watcher');
  await pairPersonAndWatcher(personPage, watcherPage, personName, watcherName);

  await personPage.locator('#pairingApproveBtn').click();
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbunden!', { timeout: 10_000 });
  await closeWatcherStatusModal(watcherPage);

  await watcherPage.locator('.watcher-profile').click();
  await expect(watcherPage.locator('#watcherProfileOverlay')).toHaveClass(/open/);
  await watcherPage.getByRole('button', { name: 'Konto löschen' }).click();
  await expect(watcherPage.locator('#confirmModalOverlay')).toHaveClass(/open/);
  await expect(watcherPage.locator('#confirmModalTitle')).toContainText('Konto löschen');
  await watcherPage.locator('#confirmModalConfirmBtn').click();

  await expect(watcherPage.locator('#watcherNameInput')).toBeVisible({ timeout: 10_000 });

  await triggerPersonWatcherReload(personPage);
  await expect(personPage.locator('#disconnectModalOverlay')).toHaveClass(/open/);
  await expect(personPage.locator('#disconnectModalText')).toContainText(watcherName);

  await personContext.close();
  await watcherContext.close();
});

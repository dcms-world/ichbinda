import { expect, test } from '@playwright/test';

import {
  closeWatcherStatusModal,
  openPersonSettings,
  pairPersonAndWatcher,
  triggerWatcherReload,
  uniqueName,
  waitForWatcherPersonCard,
} from './helpers';

test('deleting the person account marks the entry as deleted until the watcher removes it', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personName = uniqueName('Oma Löschen');
  const watcherName = uniqueName('Max Löschen');
  await pairPersonAndWatcher(personPage, watcherPage, personName, watcherName, false);

  await personPage.locator('#pairingApproveBtn').click();
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbunden!', { timeout: 10_000 });
  await closeWatcherStatusModal(watcherPage);
  await waitForWatcherPersonCard(watcherPage, personName);

  await openPersonSettings(personPage);
  await personPage.getByRole('button', { name: 'Konto endgültig löschen' }).click();
  await expect(personPage.locator('#deleteAccountOverlay')).toHaveClass(/open/);
  await personPage.locator('#deleteAccountOverlay').getByRole('button', { name: 'Endgültig löschen', exact: true }).click();
  await expect(personPage.locator('#personNameInput')).toBeVisible({ timeout: 10_000 });

  await triggerWatcherReload(watcherPage);
  const deletedCard = await waitForWatcherPersonCard(watcherPage, personName);
  await expect(deletedCard).toContainText('Konto gelöscht');

  await deletedCard.getByRole('button', { name: /entfernen/i }).click();
  await expect(watcherPage.locator('#personList')).toContainText('Noch niemand verbunden');

  await personContext.close();
  await watcherContext.close();
});

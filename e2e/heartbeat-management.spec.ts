import { expect, test } from '@playwright/test';

import {
  closeWatcherStatusModal,
  openPersonSettings,
  pairPersonAndWatcher,
  triggerWatcherReload,
  uniqueName,
  waitForWatcherPersonCard,
} from './helpers';

test('heartbeat updates watcher state and interval changes survive reloads', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  const personName = uniqueName('Oma Puls');
  const watcherName = uniqueName('Max Puls');
  await pairPersonAndWatcher(personPage, watcherPage, personName, watcherName);

  await personPage.locator('#pairingApproveBtn').click();
  await expect(watcherPage.locator('#statusModalTitle')).toContainText('Verbunden!', { timeout: 10_000 });
  await closeWatcherStatusModal(watcherPage);
  await openPersonSettings(personPage);
  await personPage.getByRole('button', { name: 'Fertig' }).click();
  await expect(personPage.locator('#settingsPanel')).not.toHaveClass(/open/);
  await triggerWatcherReload(watcherPage);

  const card = await waitForWatcherPersonCard(watcherPage, personName);
  await expect
    .poll(async () => {
      const text = (await card.textContent()) || '';
      return !text.includes('Nie');
    }, { timeout: 10_000 })
    .toBe(true);
  await expect(card).not.toContainText('Nie');

  await card.click();
  await expect(watcherPage.locator('#personDetailOverlay')).toHaveClass(/open/);
  await watcherPage.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(watcherPage.locator('#personEditOverlay')).toHaveClass(/open/);
  await watcherPage.locator('#editIntervalSelect').selectOption('60');
  await watcherPage.locator('#editSaveBtn').click();

  await expect(card).toContainText('Alarm nach: 1 Std');
  await watcherPage.reload();
  await triggerWatcherReload(watcherPage);
  await expect(await waitForWatcherPersonCard(watcherPage, personName)).toContainText('Alarm nach: 1 Std');

  await personContext.close();
  await watcherContext.close();
});

import { expect, test } from '@playwright/test';

import { openPersonSettings, registerPerson, registerWatcher, uniqueName } from './helpers';

test('landing page links to both app modes', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="/person.html"]')).toBeVisible();
  await expect(page.locator('a[href="/watcher.html"]')).toBeVisible();
});

test('person and watcher onboarding render the expected empty states', async ({ browser }) => {
  const personContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  const personPage = await personContext.newPage();
  const watcherPage = await watcherContext.newPage();

  await registerPerson(personPage, uniqueName('Oma Start'));
  await expect(personPage.locator('#inlineQrCard')).toBeVisible();
  await expect(personPage.locator('#btnOkay')).toBeHidden();
  await expect(personPage.locator('#noWatcherWarning')).toHaveClass(/visible/);

  await openPersonSettings(personPage);
  await expect(personPage.locator('#watcherInfo')).toContainText('Noch nicht verbunden');
  await expect(personPage.locator('#deviceActionTitle')).toContainText('Mit bestehendem Konto verbinden');
  await expect(personPage.locator('#deviceActionButton')).toContainText('QR scannen');

  await registerWatcher(watcherPage, uniqueName('Max Start'));
  await expect(watcherPage.locator('#personList')).toContainText('Noch niemand verbunden');
  await expect(watcherPage.locator('#personLimitMessage')).toBeHidden();

  await personContext.close();
  await watcherContext.close();
});

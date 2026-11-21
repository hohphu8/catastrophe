import { test, expect } from '@playwright/test';

test('mounts GyosJS, starts game and swats from an accessible target', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('.intro-overlay')).toBeVisible();
  await expect(page.locator('.target')).toHaveCount(10);

  await page.getByRole('button', { name: /Bắt đầu phá thôi/ }).click();
  await expect(page.locator('.intro-overlay')).toBeHidden();
  await expect(page.locator('.target').first()).toBeEnabled();
  await page.locator('.target').first().click();
  await page.waitForFunction(() => window.__catastrophe?.getState().attacks >= 1);
  const state = await page.evaluate(() => window.__catastrophe.getState());
  expect(state.score).toBeGreaterThan(0);
  expect(state.props[0].state).not.toBe('idle');
  await expect(page.locator('.damage .stat-main')).not.toHaveText('0 PTS');
  expect(errors).toEqual([]);
});

test('room selection, pause and restart work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nhà bếp' }).click();
  const game = await page.evaluate(() => window.__catastrophe.getState());
  expect(game.roomIndex).toBe(1);
  await page.getByRole('button', { name: /Bắt đầu phá thôi/ }).click();
  await page.getByRole('button', { name: /Tạm dừng/ }).click();
  await expect(page.locator('.pause-overlay')).toBeVisible();
  await page.getByRole('button', { name: /Chơi tiếp/ }).click();
  await expect(page.locator('.pause-overlay')).toBeHidden();
  await page.getByRole('button', { name: /Chơi lại/ }).click();
  await expect(page.locator('.intro-overlay')).toBeVisible();
  expect((await page.evaluate(() => window.__catastrophe.getState())).attacks).toBe(0);
});

test('mobile layout keeps target controls accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Bắt đầu phá thôi/ })).toBeVisible();
  await page.getByRole('button', { name: /Bắt đầu phá thôi/ }).click();
  await expect(page.locator('.target')).toHaveCount(10);
  await expect(page.locator('.target').first()).toBeEnabled();
  await page.locator('.target').first().click();
  await page.waitForFunction(() => window.__catastrophe?.getState().attacks >= 1);
  expect((await page.evaluate(() => window.__catastrophe.getState())).score).toBeGreaterThan(0);
});

test('getting caught shows the outcome and saves best score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Bắt đầu phá thôi/ }).click();
  await page.evaluate(() => {
    const game = window.__catastrophe.getState();
    for (const item of game.props.slice(0, 6)) window.__catastrophe.swat(item.id);
  });
  await expect(page.locator('.end-overlay')).toBeVisible();
  await expect(page.locator('.end-overlay h2')).toContainText('SEN BẮT QUẢ TANG');
  const points = await page.evaluate(() => window.__catastrophe.score());
  expect(points).toBeGreaterThan(0);
  await expect(page.locator('.best-score')).not.toHaveText('0');
});

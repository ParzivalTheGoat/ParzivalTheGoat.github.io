import { expect, test } from '@playwright/test';

test('home has factual metadata and no slogan', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle("Parzival's Lab");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'ParzivalTheGoat 的个人技术博客',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Parzival's Lab");
});

test('theme choice persists across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '切换深浅主题' }).click();

  const selected = await page.locator('html').getAttribute('data-theme');
  expect(['light', 'dark']).toContain(selected);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', selected as string);
});

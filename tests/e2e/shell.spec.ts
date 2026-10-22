import { expect, test } from '@playwright/test';

test('all four navigation links fit the smallest viewport without a menu', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: '主导航' });
  for (const label of ['首页', '学习', '关于', '搜索']) {
    await expect(navigation.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(navigation.getByRole('link', { name: '首页', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await navigation.getByRole('link', { name: '学习', exact: true }).click();
  await expect(page).toHaveURL(/\/posts\/$/);
  await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '学习', exact: true }))
    .toHaveAttribute('aria-current', 'page');
});

test('mobile home links straight to side B', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('link', { name: 'B 面 · 放一张 ↓' }).click();
  await expect(page).toHaveURL(/#side-b$/);
  await expect(page.locator('#side-b')).toBeInViewport();
});

for (const path of ['/categories/', '/tags/', '/archive/']) {
  test(`${path} highlights the study navigation link`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '学习', exact: true }))
      .toHaveAttribute('aria-current', 'page');
  });
}

test('home has factual metadata and no slogan', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle("Parzival's Lab");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'ParzivalTheGoat 的个人技术博客',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Parzival.');
});

const themeCases = [
  { initial: 'light', initialPressed: 'false', next: 'dark', nextPressed: 'true' },
  { initial: 'dark', initialPressed: 'true', next: 'light', nextPressed: 'false' },
] as const;

for (const themeCase of themeCases) {
  test(`stored ${themeCase.initial} theme initializes pressed state and toggles to ${themeCase.next}`, async ({ page }) => {
    await page.addInitScript((theme) => {
      if (localStorage.getItem('theme') === null) localStorage.setItem('theme', theme);
    }, themeCase.initial);
    await page.goto('/');

    const root = page.locator('html');
    const toggle = page.getByRole('button', { name: '切换深浅主题' });
    await expect(root).toHaveAttribute('data-theme', themeCase.initial);
    await expect(toggle).toHaveAttribute('aria-pressed', themeCase.initialPressed);

    await toggle.click();
    await expect(root).toHaveAttribute('data-theme', themeCase.next);
    await expect(toggle).toHaveAttribute('aria-pressed', themeCase.nextPressed);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe(themeCase.next);

    await page.reload();
    await expect(root).toHaveAttribute('data-theme', themeCase.next);
    await expect(toggle).toHaveAttribute('aria-pressed', themeCase.nextPressed);
  });
}

test('theme follows system changes when no stored preference exists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  const root = page.locator('html');
  const toggle = page.getByRole('button', { name: '切换深浅主题' });
  await expect(root).not.toHaveAttribute('data-theme');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => root.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgb(19, 33, 27)');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => root.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgb(242, 233, 211)');
});

test('manual theme override ignores later system changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  const root = page.locator('html');
  const toggle = page.getByRole('button', { name: '切换深浅主题' });
  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => root.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe('rgb(19, 33, 27)');
});

test('system theme and pressed state survive storage read failure', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('storage unavailable', 'SecurityError');
    };
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await expect(page.getByRole('button', { name: '切换深浅主题' })).toHaveAttribute('aria-pressed', 'true');
  expect(pageErrors).toEqual([]);
});

test('theme choice still applies when storage persistence fails', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('storage unavailable', 'SecurityError');
    };
  });

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: '切换深浅主题' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(pageErrors).toEqual([]);
});

test('inline stored-theme initializer precedes the built stylesheet', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();
  const initializerIndex = html.indexOf("localStorage.getItem('theme')");
  const stylesheetIndex = html.search(/<link[^>]*rel="stylesheet"[^>]*>/);

  expect(initializerIndex).toBeGreaterThanOrEqual(0);
  expect(stylesheetIndex).toBeGreaterThanOrEqual(0);
  expect(initializerIndex).toBeLessThan(stylesheetIndex);
});

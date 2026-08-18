import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';

const routes = ['/', '/posts/', '/categories/', '/tags/', '/archive/', '/search/', '/about/', '/404.html'];
const viewports = [
  { name: 'mobile 320', width: 320, height: 800 },
  { name: 'mobile 390', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

async function expectVisibleFocusOutline(locator: Locator) {
  const outline = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.outlineColor,
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });

  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
  expect(outline.color).toBe('rgb(169, 78, 50)');
}

function parseTransitionDurations(value: string): number[] {
  return value.split(',').map((duration) => {
    const normalized = duration.trim();
    const parsed = Number.parseFloat(normalized);
    return normalized.endsWith('ms') ? parsed / 1000 : parsed;
  });
}

for (const route of routes) {
  test(`${route} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('keyboard focus is visible on main navigation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  const siteName = page.getByRole('link', { name: "Parzival's Lab" });
  await page.keyboard.press('Tab');
  await expect(siteName).toBeFocused();

  const navigation = page.getByRole('navigation', { name: '主导航' });
  for (const label of ['文章', '分类', '标签', '归档', '搜索', '关于']) {
    await page.keyboard.press('Tab');
    const link = navigation.getByRole('link', { name: label, exact: true });
    await expect(link).toBeFocused();
    if (label === '文章') await expectVisibleFocusOutline(link);
  }

  await page.keyboard.press('Tab');
  const toggle = page.getByRole('button', { name: '切换深浅主题' });
  await expect(toggle).toBeFocused();
  await expectVisibleFocusOutline(toggle);
});

for (const viewport of viewports) {
  for (const route of routes) {
    test(`${route} has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);

      const dimensions = await page.evaluate(() => ({
        content: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        viewport: window.innerWidth,
      }));
      expect(dimensions.content, `${route} overflowed at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.viewport);
    });
  }
}

test('reduced motion removes meaningful transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('body').evaluate((body) => {
    const probe = document.createElement('div');
    probe.dataset.motionProbe = '';
    probe.style.transitionProperty = 'opacity, transform';
    probe.style.transitionDuration = '120ms, 250ms';
    body.append(probe);
  });

  const probe = page.locator('[data-motion-probe]');
  const normalDurations = parseTransitionDurations(
    await probe.evaluate((element) => getComputedStyle(element).transitionDuration),
  );
  expect(normalDurations.every((duration) => duration > 0)).toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => {
    const durations = parseTransitionDurations(
      await probe.evaluate((element) => getComputedStyle(element).transitionDuration),
    );
    return durations.every((duration) => duration === 0);
  }).toBe(true);
});

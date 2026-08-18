import { expect, test, type Page } from '@playwright/test';

const unavailableStatus = '搜索暂时不可用';

async function stubPagefind(page: Page, source: string) {
  await page.route('**/pagefind/pagefind.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: source,
  }));
}

test('Pagefind loads and returns a neutral no-result state', async ({ page }) => {
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('不会匹配的随机字符串-7f14');
  await page.getByRole('button', { name: '搜索' }).click();
  await expect(page.getByText('没有找到匹配内容')).toBeVisible();
});

test('search exposes busy state and restores controls after completion', async ({ page }) => {
  await stubPagefind(page, `
    let resolveSearch;
    export function search() {
      return new Promise((resolve) => { resolveSearch = resolve; });
    }
    window.resolvePagefindSearch = () => resolveSearch({ results: [] });
  `);
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('等待');
  await page.getByRole('button', { name: '搜索' }).click();

  const form = page.getByRole('search');
  const input = page.getByRole('searchbox', { name: '搜索文章' });
  const button = page.getByRole('button', { name: '搜索' });
  await expect(form).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('正在搜索')).toBeVisible();
  await expect(input).toBeEnabled();
  await expect(button).toBeEnabled();

  await page.evaluate(() => (window as unknown as { resolvePagefindSearch(): void }).resolvePagefindSearch());
  await expect(page.getByText('没有找到匹配内容')).toBeVisible();
  await expect(form).toHaveAttribute('aria-busy', 'false');
  await expect(input).toBeEnabled();
  await expect(button).toBeEnabled();
});

test('search keeps the newest completion when requests overlap', async ({ page }) => {
  await stubPagefind(page, `
    const pending = [];
    export function search(query) {
      return new Promise((resolve) => { pending.push({ query, resolve }); });
    }
    window.resolvePagefindSearch = (query, title) => {
      const request = pending.find((item) => item.query === query);
      request.resolve({ results: [{ data: async () => ({ url: '/search/', meta: { title } }) }] });
    };
  `);
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('先前查询');
  await page.getByRole('button', { name: '搜索' }).click();
  await expect(page.getByRole('search')).toHaveAttribute('aria-busy', 'true');

  await page.locator('#query').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '最新查询';
    input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await page.evaluate(() => (window as unknown as { resolvePagefindSearch(query: string, title: string): void }).resolvePagefindSearch('最新查询', '最新结果'));
  await expect(page.getByRole('link', { name: '最新结果' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { resolvePagefindSearch(query: string, title: string): void }).resolvePagefindSearch('先前查询', '过期结果'));
  await expect(page.getByRole('link', { name: '过期结果' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '最新结果' })).toBeVisible();
});

test('search renders Pagefind result text and internal URLs safely', async ({ page }) => {
  await stubPagefind(page, `
    export async function search() {
      return {
        results: [
          { data: async () => ({ url: '/posts/result/', meta: { title: '<img src=x>' } }) },
          { data: async () => ({ url: '/about/', meta: { title: '第二项' } }) },
        ],
      };
    }
  `);
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('结果');
  await page.getByRole('button', { name: '搜索' }).click();

  const links = page.locator('.search-results a');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveText('<img src=x>');
  await expect(links.nth(0)).toHaveAttribute('href', '/posts/result/');
  await expect(links.nth(1)).toHaveText('第二项');
  await expect(page.locator('.search-results img')).toHaveCount(0);
});

test('search handles a Pagefind module load failure without a page error', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.route('**/pagefind/pagefind.js', (route) => route.abort('failed'));
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('失败');
  await page.getByRole('button', { name: '搜索' }).click();

  await expect(page.getByText(unavailableStatus)).toBeVisible();
  await expect(page.getByRole('search')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: '搜索' })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('search handles a rejected Pagefind search without a page error', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await stubPagefind(page, 'export async function search() { throw new Error("search failure"); }');
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('失败');
  await page.getByRole('button', { name: '搜索' }).click();

  await expect(page.getByText(unavailableStatus)).toBeVisible();
  await expect(page.getByRole('search')).toHaveAttribute('aria-busy', 'false');
  expect(errors).toEqual([]);
});

test('search handles a rejected Pagefind result payload without a page error', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await stubPagefind(page, `
    export async function search() {
      return { results: [{ data: async () => { throw new Error('result failure'); } }] };
    }
  `);
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('失败');
  await page.getByRole('button', { name: '搜索' }).click();

  await expect(page.getByText(unavailableStatus)).toBeVisible();
  await expect(page.locator('.search-results li')).toHaveCount(0);
  await expect(page.getByRole('search')).toHaveAttribute('aria-busy', 'false');
  expect(errors).toEqual([]);
});

test('keyboard focus keeps the search input visibly outlined', async ({ page }) => {
  await page.goto('/search/');
  for (let index = 0; index < 9; index += 1) await page.keyboard.press('Tab');

  const input = page.getByRole('searchbox', { name: '搜索文章' });
  await expect(input).toBeFocused();
  const outline = await input.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
});

test('Enter keeps search input focus through delayed Pagefind success and failure', async ({ page }) => {
  await stubPagefind(page, `
    const pending = [];
    window.pagefindQueries = [];
    export function search(query) {
      window.pagefindQueries.push(query);
      return new Promise((resolve, reject) => { pending.push({ query, resolve, reject }); });
    }
    window.settlePagefindSearch = (query, failure) => {
      const request = pending.find((item) => item.query === query);
      if (failure) request.reject(new Error('failure'));
      else request.resolve({ results: [] });
    };
  `);
  await page.goto('/search/');
  for (let index = 0; index < 9; index += 1) await page.keyboard.press('Tab');

  const input = page.getByRole('searchbox', { name: '搜索文章' });
  await expect(input).toBeFocused();
  await page.keyboard.type('success');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('search')).toHaveAttribute('aria-busy', 'true');
  await expect(input).toBeFocused();
  await page.waitForFunction(() => typeof (window as unknown as { settlePagefindSearch?: unknown }).settlePagefindSearch === 'function');
  await page.waitForFunction(() => (window as unknown as { pagefindQueries?: string[] }).pagefindQueries?.includes('success'));
  await page.evaluate(() => (window as unknown as { settlePagefindSearch(query: string, failure: boolean): void }).settlePagefindSearch('success', false));
  await expect(page.getByText('没有找到匹配内容')).toBeVisible();
  await expect(input).toBeFocused();

  await input.fill('failure');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('search')).toHaveAttribute('aria-busy', 'true');
  await expect(input).toBeFocused();
  await page.waitForFunction(() => (window as unknown as { pagefindQueries?: string[] }).pagefindQueries?.includes('failure'));
  await page.evaluate(() => (window as unknown as { settlePagefindSearch(query: string, failure: boolean): void }).settlePagefindSearch('failure', true));
  await expect(page.getByText(unavailableStatus)).toBeVisible();
  await expect(input).toBeFocused();
});

test('search settlement preserves an intentional keyboard focus move', async ({ page }) => {
  await stubPagefind(page, `
    let resolveSearch;
    export function search() {
      return new Promise((resolve) => { resolveSearch = resolve; });
    }
    window.resolvePagefindSearch = () => resolveSearch({ results: [] });
  `);
  await page.goto('/search/');
  for (let index = 0; index < 9; index += 1) await page.keyboard.press('Tab');

  const input = page.getByRole('searchbox', { name: '搜索文章' });
  const button = page.getByRole('button', { name: '搜索' });
  await expect(input).toBeFocused();
  await page.keyboard.type('move');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('search')).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  await page.waitForFunction(() => typeof (window as unknown as { resolvePagefindSearch?: unknown }).resolvePagefindSearch === 'function');
  await page.evaluate(() => (window as unknown as { resolvePagefindSearch(): void }).resolvePagefindSearch());
  await expect(page.getByText('没有找到匹配内容')).toBeVisible();
  await expect(button).toBeFocused();
});

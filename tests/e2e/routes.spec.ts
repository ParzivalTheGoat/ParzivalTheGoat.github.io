import { expect, test } from '@playwright/test';

const categories = ['网络安全', 'Web 安全', 'AI', 'AI 安全', '学习笔记', '个人感悟'];

for (const path of ['/', '/posts/', '/categories/', '/tags/', '/archive/', '/about/']) {
  test(`${path} responds`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
  });
}

test('home contains the latest-posts region without invented posts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Parzival.' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'A 面 · 学习' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'B 面 · 生活' })).toBeVisible();
  await expect(page.getByText('暂无文章')).toBeVisible();
  await expect(page.locator('[data-post-row]')).toHaveCount(0);
});

test('category index lists only categories that hold posts', async ({ page }) => {
  await page.goto('/categories/');
  await expect(page.locator('[data-category-row]')).toHaveCount(0);
  await expect(page.locator('main').getByText('暂无文章')).toBeVisible();
});

test('empty site generates neither later post pages nor tag detail pages', async ({ page }) => {
  const laterPosts = await page.goto('/posts/page/2/');
  expect(laterPosts?.status()).toBe(404);

  const tag = await page.goto('/tags/example/');
  expect(tag?.status()).toBe(404);

  for (const category of categories) {
    const response = await page.goto(`/categories/${category}/`);
    expect(response?.status()).toBe(404);
  }
});

test('about contains only the public handle and GitHub destination', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'ParzivalTheGoat' })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/ParzivalTheGoat');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('main').getByRole('link')).toHaveCount(2);
  await expect(page.locator('main').getByRole('link', { name: 'RSS' })).toHaveAttribute('href', '/rss.xml');
});

test('machine-readable routes describe the empty static site', async ({ request }) => {
  const rssResponse = await request.get('/rss.xml');
  expect(rssResponse.status()).toBe(200);
  const rss = await rssResponse.text();
  expect(rss).toContain('<title>Parzival&apos;s Lab</title>');
  expect(rss).toContain('<description>ParzivalTheGoat 的个人技术博客</description>');
  expect(rss).toContain('<link>https://parzivalthegoat.github.io/</link>');
  expect(rss).toContain('<language>zh-CN</language>');
  expect(rss.match(/<item>/g) ?? []).toHaveLength(0);

  const sitemapIndexResponse = await request.get('/sitemap-index.xml');
  expect(sitemapIndexResponse.status()).toBe(200);
  expect(await sitemapIndexResponse.text()).toContain('<loc>https://parzivalthegoat.github.io/sitemap-0.xml</loc>');

  const sitemapResponse = await request.get('/sitemap-0.xml');
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain('<loc>https://parzivalthegoat.github.io/search/</loc>');
  expect(sitemap).not.toMatch(/https:\/\/parzivalthegoat\.github\.io\/posts\/[^<]+\//);
});

test('404 has neutral noindex metadata and a static canonical URL', async ({ page }) => {
  const response = await page.goto('/404.html');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '这张唱片没有这一面' })).toBeVisible();
  const main = page.locator('main');
  await expect(main.getByRole('link')).toHaveCount(1);
  await expect(main.getByRole('link', { name: '回首页' })).toHaveAttribute('href', '/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://parzivalthegoat.github.io/404.html');
  await expect(main.locator('[data-pagefind-ignore]')).toContainText('这张唱片没有这一面');
});

import { expect, test } from '@playwright/test';

const categories = ['网络安全', 'Web 安全', 'AI', 'AI 安全', '学习笔记', '个人感悟'];

for (const path of ['/', '/posts/', '/categories/', '/tags/', '/archive/', '/about/']) {
  test(`${path} responds`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
  });
}

for (const category of categories) {
  test(`/categories/${category}/ responds when empty`, async ({ page }) => {
    const response = await page.goto(`/categories/${category}/`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText('暂无文章')).toBeVisible();
  });
}

test('home contains the latest-posts region without invented posts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: "Parzival's Lab" })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '最新文章' })).toBeVisible();
  await expect(page.getByText('暂无文章')).toBeVisible();
  await expect(page.locator('[data-post-row]')).toHaveCount(0);
});

test('category index lists all supported categories with zero counts', async ({ page }) => {
  await page.goto('/categories/');
  await expect(page.locator('[data-category-row]')).toHaveCount(categories.length);

  for (const category of categories) {
    await expect(page.getByRole('link', { name: category, exact: true })).toBeVisible();
  }
});

test('empty site generates neither later post pages nor tag detail pages', async ({ page }) => {
  const laterPosts = await page.goto('/posts/page/2/');
  expect(laterPosts?.status()).toBe(404);

  const tag = await page.goto('/tags/example/');
  expect(tag?.status()).toBe(404);
});

test('about contains only the public handle and GitHub destination', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'ParzivalTheGoat' })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/ParzivalTheGoat');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('main')).toHaveText('ParzivalTheGoat GitHub');
});

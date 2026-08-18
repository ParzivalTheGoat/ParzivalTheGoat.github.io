import { expect, test } from '@playwright/test';

test('Pagefind loads and returns a neutral no-result state', async ({ page }) => {
  await page.goto('/search/');
  await page.getByRole('searchbox', { name: '搜索文章' }).fill('不会匹配的随机字符串-7f14');
  await page.getByRole('button', { name: '搜索' }).click();
  await expect(page.getByText('没有找到匹配内容')).toBeVisible();
});

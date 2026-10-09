import { expect, test } from '@playwright/test'

/*
 * 交付物回归：nchu-cs-club-standalone.html 必须能从 file:// 直接双击打开并正常启动。
 * 它由 `pnpm build:standalone` 生成（dist 全量内联成单文件）；文件不存在时跳过。
 * 注意这里刻意不 import node:fs —— 项目未安装 @types/node，用 import.meta.url 取路径即可。
 */
const standaloneUrl = new URL('../nchu-cs-club-standalone.html', import.meta.url).href

test('单文件交付物可从 file:// 直接打开', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  try {
    await page.goto(standaloneUrl)
  } catch {
    test.skip(true, '先用 pnpm build:standalone 生成单文件交付物')
    return
  }

  await expect(page.locator('.hero-sticky-frame')).toBeVisible()
  await expect(page.locator('body')).toContainText('计算机科技小组')
  expect(pageErrors, pageErrors.join('\n')).toEqual([])
})

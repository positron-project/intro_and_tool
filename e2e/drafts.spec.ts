import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'club-demo-session',
      JSON.stringify({
        accessToken: 'draft-e2e',
        user: { id: 'demo-leader', name: '草稿测试', initials: '测', role: 'Leader', cohort: '全站', directions: [], status: 'active' },
      }),
    )
  })
})

test('投稿草稿可恢复，取消离开保留表单，确认关闭后保留最后输入', async ({ page }) => {
  await page.goto('/#/resources/prompts')
  await page.getByRole('button', { name: '投稿模板', exact: true }).click()
  const modal = page.getByRole('dialog', { name: '投稿 Prompt 模板' })
  await modal.getByLabel('模板名称').fill('尚未提交的模板')
  await modal.getByLabel('Prompt 正文').fill('刷新前保留这段文字')
  await expect(modal.getByText('已保存到此浏览器', { exact: false })).toBeVisible()

  page.once('dialog', (dialog) => dialog.dismiss())
  await page.evaluate(() => {
    window.location.hash = '/resources'
  })
  await expect(page).toHaveURL(/#\/resources\/prompts$/)
  await expect(modal.getByLabel('模板名称')).toHaveValue('尚未提交的模板')

  await modal.getByLabel('Prompt 正文').fill('关闭前的最后一次输入')
  page.once('dialog', (dialog) => dialog.accept())
  await modal.getByRole('button', { name: '关闭 Prompt 投稿' }).click()
  await expect(modal).toHaveCount(0)
  await page.getByRole('button', { name: '投稿模板', exact: true }).click()
  await expect(modal.getByText('发现未提交的本地草稿')).toBeVisible()
  await expect(modal.getByLabel('模板名称')).toHaveValue('')
  await modal.getByRole('button', { name: '恢复草稿', exact: true }).click()
  await expect(modal.getByLabel('Prompt 正文')).toHaveValue('关闭前的最后一次输入')
  page.once('dialog', (dialog) => dialog.accept())
  await page.reload()
  await page.getByRole('button', { name: '投稿模板', exact: true }).click()
  await modal.getByRole('button', { name: '恢复草稿', exact: true }).click()
  await expect(modal.getByLabel('模板名称')).toHaveValue('尚未提交的模板')
})

test('面经显式保存后绑定记录，刷新恢复修改不会重复创建投稿', async ({ page }) => {
  await page.goto('/#/interviews/submit')
  await page.getByPlaceholder('例如：某互联网公司').fill('草稿测试公司')
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  await expect(page).toHaveURL(/#\/interviews\/submit\/[^/]+$/)
  await expect(page.getByRole('heading', { name: '修改面经投稿', exact: true })).toBeVisible()
  const savedUrl = page.url()
  await expect(page.getByPlaceholder('例如：某互联网公司')).toHaveValue('草稿测试公司')
  await page.getByPlaceholder('例如：后端开发实习生').fill('恢复后的岗位')
  await expect(page.getByText('已保存到此浏览器', { exact: false })).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.reload()
  await page.getByRole('button', { name: '恢复草稿', exact: true }).click()
  await expect(page.getByPlaceholder('例如：后端开发实习生')).toHaveValue('恢复后的岗位')
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  await expect(page).toHaveURL(savedUrl)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('club-interview-submissions-v1') ?? '[]').length)).toBe(1)
})

import { defineConfig, devices } from '@playwright/test'

/*
 * 端到端测试跑在本机已安装的 Microsoft Edge 上（channel: 'msedge'），
 * 这样不需要额外下载 Playwright 自带的 Chromium 版本。
 * 开发服务器默认复用 5173 上已经在跑的那一个（reuseExistingServer）。
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
  webServer: {
    command: 'pnpm exec vite --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})

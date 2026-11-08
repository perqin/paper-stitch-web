import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  use: {
    baseURL: 'http://paper-stitch.test:5174',
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: ['--host-resolver-rules=MAP paper-stitch.test 127.0.0.1'] },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', deviceScaleFactor: 1 } },
    { name: 'chromium-hidpi', use: { browserName: 'chromium', deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: '__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=paper-stitch.test pnpm dev --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
})

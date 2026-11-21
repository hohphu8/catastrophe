import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4230', browserName: 'chromium', headless: true },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4230',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  reporter: process.env.CI ? 'list' : 'line'
});

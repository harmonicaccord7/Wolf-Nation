import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/launch',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'phone-safari-375', use: { ...devices['iPhone 12'], viewport: { width: 375, height: 812 } } },
    { name: 'phone-chrome-393', use: { ...devices['Pixel 5'] } },
  ],
})

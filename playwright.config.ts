import { defineConfig, devices } from '@playwright/test';

const basePath = process.env.TEST_BASE || '/';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:4173${basePath}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.platform === 'win32' ? { channel: 'msedge' } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: {width:1280,height:900} } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: `http://127.0.0.1:4173${basePath}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});

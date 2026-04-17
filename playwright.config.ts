import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT || 4173);
const isRemoteRun = !!process.env.PLAYWRIGHT_BASE_URL;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  outputDir: 'test-results/playwright',
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'iphone-13',
      use: {
        ...devices['iPhone 13'],
      },
    },
    {
      name: 'pixel-7',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
  webServer: isRemoteRun
    ? undefined
    : {
        command: 'bash ./scripts/e2e-server.sh',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          PORT: String(port),
        },
      },
});

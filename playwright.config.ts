import { defineConfig } from '@playwright/test';

const defaultBaseURL = 'http://127.0.0.1:3001';

function parseWorkers(value: string | undefined): number {
  const fallbackWorkers = 1;

  if (!value) {
    return fallbackWorkers;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallbackWorkers;
  }

  return parsedValue;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: parseWorkers(process.env.PLAYWRIGHT_WORKERS),
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});

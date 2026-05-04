import type { APIRequestContext } from '@playwright/test';

const DEFAULT_LOCAL_APP_BASE_URL = 'http://127.0.0.1:3001';
const DEFAULT_TEST_DATA_RESET_PATH = '/api/exam-fixtures/reset';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

type ResetExamTestDataOptions = {
  request: APIRequestContext;
  baseURL?: string;
};

function isLocalOrigin(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    return LOCAL_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function resolveTestDataResetURL(baseURL: string | undefined): string {
  const overrideURL =
    process.env.PLAYWRIGHT_TEST_DATA_RESET_URL ?? process.env.PLAYWRIGHT_FIXTURE_RESET_URL;

  if (overrideURL) {
    return overrideURL;
  }

  if (isLocalOrigin(baseURL)) {
    return new URL(DEFAULT_TEST_DATA_RESET_PATH, baseURL).toString();
  }

  return new URL(DEFAULT_TEST_DATA_RESET_PATH, DEFAULT_LOCAL_APP_BASE_URL).toString();
}

function shouldSkipTestDataReset(): boolean {
  return (
    process.env.PLAYWRIGHT_SKIP_TEST_DATA_RESET === '1' ||
    process.env.PLAYWRIGHT_SKIP_FIXTURE_RESET === '1'
  );
}

export async function resetExamTestData({
  request,
  baseURL
}: ResetExamTestDataOptions): Promise<void> {
  if (shouldSkipTestDataReset()) {
    return;
  }

  const testDataResetURL = resolveTestDataResetURL(baseURL);

  try {
    const response = await request.post(testDataResetURL);

    if (!response.ok()) {
      const responseBody = await response.text();

      throw new Error(
        [
          `Test data reset failed with ${response.status()} ${response.statusText()}.`,
          `URL: ${testDataResetURL}`,
          responseBody ? `Response: ${responseBody}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      [
        'Unable to reset the exam test data before the test.',
        `URL: ${testDataResetURL}`,
        'Ensure the local app is running and the reset endpoint is reachable.',
        `Details: ${message}`
      ].join('\n')
    );
  }
}
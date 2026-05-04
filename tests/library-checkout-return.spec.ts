import { test } from '@playwright/test';

import { resetExamTestData } from './reset-test-data';

test.describe('Library Checkout & Return System', () => {
	test.beforeEach(async ({ request, baseURL }) => {
		await resetExamTestData({ request, baseURL });
	});

});

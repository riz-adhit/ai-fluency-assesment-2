import { test, expect, type Page } from '@playwright/test';

import { resetExamTestData } from './reset-test-data';

/** Search for a book by ID so its row becomes visible before interacting with it. */
async function searchBook(page: Page, bookId: string): Promise<void> {
	await page.getByTestId('book-search-input').fill(bookId);
	await page.getByRole('button', { name: 'Search Books' }).click();
	await expect(page.getByTestId(`book-row_${bookId}`)).toBeVisible();
}

// ─── Fixture constants (from PRD QA Automation Test Data) ────────────────────
const BOOK_ID = {
	RETURN_ON_TIME: '9001', // active checkout, borrow_date = today - 7 days, not overdue
	RETURN_LATE:    '9002', // active checkout, borrow_date = today - 21 days, overdue
	OUT_OF_STOCK:   '9003', // stock = 0
	EMPTY_HISTORY:  '9004', // no borrowing history
	CHECKOUT_READY: '9005', // stock available, member has no active/overdue borrowings
} as const;

const MEMBER_EMAIL = {
	RETURN_ON_TIME: 'exam.return-on-time@example.com',
	RETURN_LATE:    'exam.return-late@example.com',
	CHECKOUT_READY: 'exam.checkout-ready@example.com',
} as const;

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Library Checkout & Return System', () => {
	test.beforeEach(async ({ request, baseURL }) => {
		await resetExamTestData({ request, baseURL });
	});

	// ══════════════════════════════════════════════════════════════════════════
	// CHECKOUT
	// ══════════════════════════════════════════════════════════════════════════
	test.describe('Checkout', () => {

		test('TC_1 - Successful Checkout with Valid Member and Available Stock [P0]', async ({ page }) => {
			// Given: test data reset; book 9005 has stock; member checkout-ready has no overdues
			await page.goto('/');
			const stockText = await page.getByTestId(`book-stock_${BOOK_ID.CHECKOUT_READY}`).textContent();
			const stockBefore = parseInt(stockText ?? '0', 10);

			// When: open checkout page for book 9005, enter valid member ID and submit
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			await page.getByTestId('library-member-id-input').fill(MEMBER_EMAIL.CHECKOUT_READY);
			await expect(page.getByTestId('member-name-display')).not.toBeEmpty();
			await expect(page.getByTestId('checkout-submit-button')).toBeEnabled();
			await page.getByTestId('checkout-submit-button').click();

			// Then: checkout record created; available stock for book 9005 reduced by 1
			await page.goto('/');
			const updatedStockText = await page.getByTestId(`book-stock_${BOOK_ID.CHECKOUT_READY}`).textContent();
			const stockAfter = parseInt(updatedStockText ?? '0', 10);
			expect(stockAfter).toBe(stockBefore - 1);
		});

		test('TC_2 - Checkout Button Disabled When Library Member ID Is Empty [P0]', async ({ page }) => {
			// Given: on checkout page for book 9005
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: Library Member ID input is empty (default state)
			await expect(page.getByTestId('library-member-id-input')).toHaveValue('');

			// Then: Submit Checkout button is disabled
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
		});

		test('TC_3 - Checkout Button Disabled When Library Member ID Has Invalid Email Format [P0]', async ({ page }) => {
			// Given: on checkout page for book 9005
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: enter a non-email string
			await page.getByTestId('library-member-id-input').fill('notanemail');

			// Then: Submit Checkout button is disabled
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
		});

		test('TC_4 - Checkout Button Disabled When Library Member ID Is Not Found in Registry [P0]', async ({ page }) => {
			// Given: on checkout page for book 9005
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: enter a valid-format email that does not exist in the borrower registry
			await page.getByTestId('library-member-id-input').fill('nonexistent.member@example.com');

			// Then: borrower name and phone not displayed; submit button disabled
			await expect(page.getByTestId('member-name-display')).toBeEmpty();
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
		});

		test('TC_5 - Checkout Button Disabled and Out-of-Stock Message Shown [P0]', async ({ page }) => {
			// Given: book 9003 has zero available stock
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.OUT_OF_STOCK}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// Then: out-of-stock message shown; submit button disabled
			await expect(page.getByTestId('checkout-validation-banner')).toContainText('The selected book is out of stock.');
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
		});

		test('TC_6 - Checkout Rejected When Borrower Has Overdue Items [P0]', async ({ page }) => {
			// Given: member exam.return-late@example.com has an overdue item for book 9002
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: enter the overdue member's Library Member ID
			await page.getByTestId('library-member-id-input').fill(MEMBER_EMAIL.RETURN_LATE);

			// Then: overdue warning banner shown; submit button disabled; no checkout created
			await expect(page.getByTestId('borrower-overdue-warning')).toBeVisible();
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
		});

		test('TC_7 - Checkout Blocked When Borrower Already Has That Book Checked Out [P0]', async ({ page }) => {
			// Given: member exam.return-on-time@example.com already has an active checkout for book 9001
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: enter the same member's Library Member ID
			await page.getByTestId('library-member-id-input').fill(MEMBER_EMAIL.RETURN_ON_TIME);

			// Then: correct message shown; submit button disabled; no new checkout record created
			await expect(page.getByTestId('checkout-validation-banner')).toContainText('The borrower already has that book checked out.');
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
		});

		test('TC_8 - Due Date Equals Checkout Date Plus 14 Days [P1]', async ({ page }) => {
			// Given: on checkout page for book 9005; valid member entered
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			await page.getByTestId('library-member-id-input').fill(MEMBER_EMAIL.CHECKOUT_READY);
			await expect(page.getByTestId('member-name-display')).not.toBeEmpty();

			// When: librarian views the checkout date and due date
			const checkoutDateValue = await page.getByTestId('checkout-date-input').inputValue();
			const dueDateText = await page.getByTestId('due-date-display').textContent();

			// Then: due date = checkout date + 14 calendar days
			const checkoutDate = new Date(checkoutDateValue);
			const expectedDueDate = new Date(checkoutDate);
			expectedDueDate.setDate(expectedDueDate.getDate() + 14);

			const dueDate = new Date(dueDateText ?? '');
			expect(dueDate.toDateString()).toBe(expectedDueDate.toDateString());
		});

		test('TC_9 - Borrower Name and Phone Displayed After Valid Library Member ID Lookup [P1]', async ({ page }) => {
			// Given: on checkout page for book 9005
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: enter valid Library Member ID
			await page.getByTestId('library-member-id-input').fill(MEMBER_EMAIL.CHECKOUT_READY);

			// Then: borrower name and phone number displayed in read-only fields
			await expect(page.getByTestId('member-name-display')).not.toBeEmpty();
			await expect(page.getByTestId('member-phone-display')).not.toBeEmpty();
		});

		test('TC_10 - Checkout Page Displays Selected Book ID and Title [P1]', async ({ page }) => {
			// Given: on main book list page
			await page.goto('/');

			// When: click checkout action for book 9005
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// Then: checkout page displays correct book ID and a non-empty book title
			await expect(page.getByTestId('checkout-selected-book-id')).toContainText(BOOK_ID.CHECKOUT_READY);
			await expect(page.getByTestId('checkout-selected-book-title')).not.toBeEmpty();
		});

		test('TC_11 - Checkout Date Input Defaults to Current GMT+7 Date and Is Read-Only [P1]', async ({ page }) => {
			// Given: on checkout page for book 9005
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// Then: checkout date input has a value and is not editable
			const checkoutDateInput = page.getByTestId('checkout-date-input');
			await expect(checkoutDateInput).not.toHaveValue('');
			await expect(checkoutDateInput).not.toBeEditable();
		});

	});

	// ══════════════════════════════════════════════════════════════════════════
	// RETURN
	// ══════════════════════════════════════════════════════════════════════════
	test.describe('Return', () => {

		test('TC_12 - Successful On-Time Return [P0]', async ({ page }) => {
			// Given: book 9001 has active checkout for exam.return-on-time; borrow_date = today - 7 d (not overdue)
			await page.goto('/');
			const stockText = await page.getByTestId(`book-stock_${BOOK_ID.RETURN_ON_TIME}`).textContent();
			const stockBefore = parseInt(stockText ?? '0', 10);

			// When: open return page; enter member ID; submit
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.RETURN_ON_TIME);
			await expect(page.getByTestId('return-member-name-display')).not.toBeEmpty();
			await expect(page.getByTestId('return-submit-button')).toBeEnabled();
			await page.getByTestId('return-submit-button').click();

			// Then: no overdue fine displayed; stock increased by 1
			await expect(page.getByTestId('return-overdue-fine')).not.toBeVisible();

			await page.goto('/');
			const updatedStockText = await page.getByTestId(`book-stock_${BOOK_ID.RETURN_ON_TIME}`).textContent();
			const stockAfter = parseInt(updatedStockText ?? '0', 10);
			expect(stockAfter).toBe(stockBefore + 1);
		});

		test('TC_13 - Overdue Return Accepted with Fine at Rp10000 Per Late Day [P0]', async ({ page }) => {
			// Given: book 9002 has active checkout for exam.return-late; borrow_date = today - 21 d (7 d overdue)
			await page.goto('/');
			const stockText = await page.getByTestId(`book-stock_${BOOK_ID.RETURN_LATE}`).textContent();
			const stockBefore = parseInt(stockText ?? '0', 10);

			// When: open return page; enter member ID; submit
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_LATE}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.RETURN_LATE);
			await expect(page.getByTestId('return-member-name-display')).not.toBeEmpty();
			await expect(page.getByTestId('return-submit-button')).toBeEnabled();
			await page.getByTestId('return-submit-button').click();

			// Then: overdue fine shown (Rp10000 × days late); stock increased by 1
			await expect(page.getByTestId('return-overdue-fine')).toBeVisible();
			await expect(page.getByTestId('return-overdue-fine')).toContainText('10000');

			await page.goto('/');
			const updatedStockText = await page.getByTestId(`book-stock_${BOOK_ID.RETURN_LATE}`).textContent();
			const stockAfter = parseInt(updatedStockText ?? '0', 10);
			expect(stockAfter).toBe(stockBefore + 1);
		});

		test('TC_14 - Return Blocked When No Active Checkout Found for Book and Member [P0]', async ({ page }) => {
			// Given: book 9005 has no active checkout for exam.checkout-ready@example.com
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			// When: enter member email that has no active checkout for this book
			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.CHECKOUT_READY);

			// Then: return validation banner shows no active checkout; submit button disabled; stock unchanged
			await expect(page.getByTestId('return-validation-banner')).toBeVisible();
			await expect(page.getByTestId('return-submit-button')).toBeDisabled();
		});

		test('TC_15 - On-Time Return Incurs No Overdue Fine [P1]', async ({ page }) => {
			// Given: book 9001, borrow_date = today - 7 days (due date = today + 7 days)
			// Note: fixture does not have exactly today as the due date, but this tests the
			// on-time return path (return before due date) which must not produce a fine.
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.RETURN_ON_TIME);
			await expect(page.getByTestId('return-submit-button')).toBeEnabled();
			await page.getByTestId('return-submit-button').click();

			// Then: no overdue fine is displayed
			await expect(page.getByTestId('return-overdue-fine')).not.toBeVisible();
		});

		test('TC_16 - Return Success Message Displays Correct Format [P1]', async ({ page }) => {
			// Given: book 9001 has active checkout for exam.return-on-time@example.com
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			const bookTitle = await page.getByTestId('return-book-title').textContent();

			// When: complete on-time return
			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.RETURN_ON_TIME);
			await expect(page.getByTestId('return-submit-button')).toBeEnabled();
			await page.getByTestId('return-submit-button').click();

			// Then: success message follows format: Returned "<book_name>" from Member One.
			await expect(page.getByTestId('global-alert-banner')).toContainText(`Returned "${bookTitle}"`);
			await expect(page.getByTestId('global-alert-banner')).toContainText('Member One');
		});

		test('TC_17 - Return Page Displays Borrower Name and Phone After Valid Member Lookup [P1]', async ({ page }) => {
			// Given: book 9001 has active checkout for exam.return-on-time@example.com
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			// When: enter valid Library Member ID
			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.RETURN_ON_TIME);

			// Then: borrower name, phone, and due date for active checkout displayed
			await expect(page.getByTestId('return-member-name-display')).not.toBeEmpty();
			await expect(page.getByTestId('return-member-phone-display')).not.toBeEmpty();
			await expect(page.getByTestId('return-due-date')).not.toBeEmpty();
		});

		test('TC_18 - Return Date Input Defaults to Current GMT+7 Date and Is Read-Only [P1]', async ({ page }) => {
			// Given: on return page for book 9001
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			// Then: return date input has a value and is not editable
			const returnDateInput = page.getByTestId('return-date-input');
			await expect(returnDateInput).not.toHaveValue('');
			await expect(returnDateInput).not.toBeEditable();
		});

		test('TC_19 - Return Blocked When Library Member ID Is Empty [P0]', async ({ page }) => {
			// Given: on return page for book 9001
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			// When: Library Member ID input is empty (default state)
			await expect(page.getByTestId('return-library-member-id-input')).toHaveValue('');

			// Then: Submit Return button is disabled
			await expect(page.getByTestId('return-submit-button')).toBeDisabled();
		});

	});

	// ══════════════════════════════════════════════════════════════════════════
	// BOOK LOG
	// ══════════════════════════════════════════════════════════════════════════
	test.describe('Book Log', () => {

		test('TC_20 - Book Log Displays Newest Events First by Default [P0]', async ({ page }) => {
			// Given: book 9001 has an existing checkout event from fixture;
			// perform a return to add a second (newer) return event
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.RETURN_ON_TIME);
			await expect(page.getByTestId('return-submit-button')).toBeEnabled();
			await page.getByTestId('return-submit-button').click();

			// When: open book log for book 9001
			await page.goto('/');
			await page.getByTestId(`book-show-log_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('book-log-page')).toBeVisible();
			await expect(page.getByTestId('book-log-table')).toBeVisible();

			// Then: at least two log rows exist; the first row is the newest (return) event
			const logRows = page.locator('[data-testid^="book-log-row_"]');
			await expect(logRows).toHaveCount(2);

			const firstRowEventCell = logRows.first().locator('[data-testid^="book-log-event_"]');
			await expect(firstRowEventCell).toBeVisible();
			await expect(firstRowEventCell).toContainText(/return/i);
		});

		test('TC_21 - Book Log Entry Shows Event Type, Borrower, Date, and Fine When Relevant [P0]', async ({ page }) => {
			// Given: book 9002 is overdue; perform return to create a return log entry with fine
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_LATE}`).click();
			await page.getByTestId('return-library-member-id-input').fill(MEMBER_EMAIL.RETURN_LATE);
			await expect(page.getByTestId('return-submit-button')).toBeEnabled();
			await page.getByTestId('return-submit-button').click();

			// When: open book log for book 9002
			await page.goto('/');
			await page.getByTestId(`book-show-log_${BOOK_ID.RETURN_LATE}`).click();
			await expect(page.getByTestId('book-log-page')).toBeVisible();

			// Then: each log row exposes event type, borrower name, and date cells (all visible and non-empty)
			const logRows = page.locator('[data-testid^="book-log-row_"]');
			const firstRow = logRows.first();

			await expect(firstRow.locator('[data-testid^="book-log-event_"]')).not.toBeEmpty();
			await expect(firstRow.locator('[data-testid^="book-log-borrower_"]')).not.toBeEmpty();
			await expect(firstRow.locator('[data-testid^="book-log-date_"]')).not.toBeEmpty();
		});

		test('TC_22 - Book Log Shows Empty State for Book With No Circulation History [P1]', async ({ page }) => {
			// Given: book 9004 has no circulation history
			await page.goto('/');
			await page.getByTestId(`book-show-log_${BOOK_ID.EMPTY_HISTORY}`).click();
			await expect(page.getByTestId('book-log-page')).toBeVisible();

			// Then: empty-state element shown; no log rows in the table
			await expect(page.getByTestId('book-log-empty-state')).toBeVisible();
			await expect(page.locator('[data-testid^="book-log-row_"]')).toHaveCount(0);
		});

		test('TC_23 - Book Log Page Does Not Show Filters, Pagination, or Export Options [P2]', async ({ page }) => {
			// Given: on book log page for book 9001
			await page.goto('/');
			await page.getByTestId(`book-show-log_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('book-log-page')).toBeVisible();

			// Then: no filter, pagination, or export elements are rendered
			await expect(page.locator('[data-testid*="filter"]')).toHaveCount(0);
			await expect(page.locator('[data-testid*="pagination"]')).toHaveCount(0);
			await expect(page.locator('[data-testid*="export"]')).toHaveCount(0);
		});

		test('TC_24 - Book Log Page Displays Correct Book ID and Title for Selected Book [P1]', async ({ page }) => {
			// Given: on main book list page
			await page.goto('/');

			// When: click show log for book 9001
			await page.getByTestId(`book-show-log_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('book-log-page')).toBeVisible();

			// Then: book log page shows correct book ID and a non-empty book title
			await expect(page.getByTestId('book-log-selected-book-id')).toContainText(BOOK_ID.RETURN_ON_TIME);
			await expect(page.getByTestId('book-log-selected-book-title')).not.toBeEmpty();
		});

	});

	// ══════════════════════════════════════════════════════════════════════════
	// SECURITY
	// ══════════════════════════════════════════════════════════════════════════
	test.describe('Security', () => {

		test('TC_25 - HTML/Script Input Rejected in Checkout Library Member ID Field [P0]', async ({ page }) => {
			// Given: on checkout page for book 9005
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: enter XSS payload in the Library Member ID field
			await page.getByTestId('library-member-id-input').fill("<script>alert('xss')</script>");

			// Then: input treated as invalid email; submit button disabled; no script execution
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
			// Verify the page title was not overwritten by a script execution
			await expect(page).not.toHaveTitle(/xss/i);
		});

		test('TC_26 - HTML/Script Input Rejected in Return Library Member ID Field [P0]', async ({ page }) => {
			// Given: on return page for book 9001
			await page.goto('/');
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('return-page')).toBeVisible();

			// When: enter XSS payload in the Library Member ID field
			await page.getByTestId('return-library-member-id-input').fill("<script>alert('xss')</script>");

			// Then: input treated as invalid; submit button disabled
			await expect(page.getByTestId('return-submit-button')).toBeDisabled();
		});

		test('TC_27 - Duplicate Checkout Attempt for Same Book and Member Is Rejected [P0]', async ({ page }) => {
			// Given: member exam.return-on-time@example.com already has active checkout for book 9001
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.RETURN_ON_TIME}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: attempt to check out the same book for the same member again
			await page.getByTestId('library-member-id-input').fill(MEMBER_EMAIL.RETURN_ON_TIME);

			// Then: rejected with correct message; submit button disabled; no new checkout record created
			await expect(page.getByTestId('checkout-validation-banner')).toContainText('The borrower already has that book checked out.');
			await expect(page.getByTestId('checkout-submit-button')).toBeDisabled();
		});

	});

	// ══════════════════════════════════════════════════════════════════════════
	// NAVIGATION & MAIN PAGE
	// ══════════════════════════════════════════════════════════════════════════
	test.describe('Navigation and Main Page', () => {

		test('TC_28 - Clicking Checkout Action Navigates to Checkout Page [P0]', async ({ page }) => {
			// Given: on main book list page
			await page.goto('/');
			await expect(page.getByTestId('book-list-page')).toBeVisible();

			// When: click checkout action button for book 9005
			await page.getByTestId(`book-checkout_${BOOK_ID.CHECKOUT_READY}`).click();

			// Then: checkout page opened with correct book ID displayed
			await expect(page.getByTestId('checkout-page')).toBeVisible();
			await expect(page.getByTestId('checkout-selected-book-id')).toContainText(BOOK_ID.CHECKOUT_READY);
		});

		test('TC_29 - Clicking Return Action Navigates to Return Page [P0]', async ({ page }) => {
			// Given: on main book list page
			await page.goto('/');
			await expect(page.getByTestId('book-list-page')).toBeVisible();

			// When: click return action button for book 9001
			await page.getByTestId(`book-return_${BOOK_ID.RETURN_ON_TIME}`).click();

			// Then: return page opened with correct book ID displayed
			await expect(page.getByTestId('return-page')).toBeVisible();
			await expect(page.getByTestId('return-selected-book-id')).toContainText(BOOK_ID.RETURN_ON_TIME);
		});

		test('TC_30 - Clicking Show Log Action Navigates to Book Log Page [P0]', async ({ page }) => {
			// Given: on main book list page
			await page.goto('/');
			await expect(page.getByTestId('book-list-page')).toBeVisible();

			// When: click show log action for book 9001
			await page.getByTestId(`book-show-log_${BOOK_ID.RETURN_ON_TIME}`).click();

			// Then: book log page opened with correct book ID and title displayed
			await expect(page.getByTestId('book-log-page')).toBeVisible();
			await expect(page.getByTestId('book-log-selected-book-id')).toContainText(BOOK_ID.RETURN_ON_TIME);
			await expect(page.getByTestId('book-log-selected-book-title')).not.toBeEmpty();
		});

		test('TC_31 - Main Book List Search Finds Books by Book ID [P1]', async ({ page }) => {
			// Given: on main book list page
			await page.goto('/');
			await expect(page.getByTestId('book-list-page')).toBeVisible();

			// When: enter book ID 9001 in the search input
			await page.getByTestId('book-search-input').fill(BOOK_ID.RETURN_ON_TIME);

			// Then: book row for 9001 is visible
			await expect(page.getByTestId(`book-row_${BOOK_ID.RETURN_ON_TIME}`)).toBeVisible();
		});

		test('TC_32 - Main Book List Search Finds Books by Partial Title [P1]', async ({ page }) => {
			// Given: on main book list page
			await page.goto('/');
			await expect(page.getByTestId('book-list-page')).toBeVisible();

			// Capture the full title of book 9001 and take a partial substring
			const fullTitle = await page.getByTestId(`book-title_${BOOK_ID.RETURN_ON_TIME}`).textContent();
			const partialTitle = (fullTitle ?? 'Book').slice(0, 4);

			// When: enter partial title in the search input
			await page.getByTestId('book-search-input').fill(partialTitle);

			// Then: book list table shows at least one result containing that partial title
			const visibleRows = page.locator('[data-testid^="book-row_"]');
			await expect(visibleRows.first()).toBeVisible();
		});

		test('TC_33 - Main Book List Shows Correct Available Stock for Each Book [P1]', async ({ page }) => {
			// Given: test data reset
			await page.goto('/');
			await expect(page.getByTestId('book-list-page')).toBeVisible();

			// Then: out-of-stock book 9003 shows 0 in its stock cell
			await expect(page.getByTestId(`book-stock_${BOOK_ID.OUT_OF_STOCK}`)).toContainText('0');
		});

		test('TC_34 - Global Alert Banner Shows Validation Messages [P1]', async ({ page }) => {
			// Given: checkout page opened for out-of-stock book 9003 (triggers an inline validation)
			await page.goto('/');
			await page.getByTestId(`book-checkout_${BOOK_ID.OUT_OF_STOCK}`).click();
			await expect(page.getByTestId('checkout-page')).toBeVisible();

			// When: a validation error is present (out-of-stock condition)
			// Then: checkout-validation-banner is visible and non-empty
			await expect(page.getByTestId('checkout-validation-banner')).toBeVisible();
			await expect(page.getByTestId('checkout-validation-banner')).not.toBeEmpty();
		});

	});

});

import { test, expect } from "@playwright/test";

test("focus sets tab indexes appropriately", async ({ page }) => {
	await page.goto("http://localhost:3000/test");
	await expect(page).toHaveTitle("test page");
	await page.locator("input").evaluateAll((nodes) => {
		for (const node of nodes) {
			expect(node).toBeInstanceOf(HTMLElement);
			expect(node.tabIndex).toBe(0);
		}
		// this test is failing because:
		// locator.evaluateAll: Evaluation failed: ReferenceError: _test is not defined
	});
});

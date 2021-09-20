import { test, expect } from "@playwright/test";

test("focus sets tab indexes appropriately", async ({ page }) => {
	await page.goto("http://localhost:3000/test");
	const inputs = page.locator("input");
	await expect(inputs).toHaveCount(5);
	await inputs.evaluateAll(async (nodes) => {
		console.log(nodes);
		for (const node of nodes) {
			console.log(node);
			await expect(node.tabIndex).toBe(0);
		}
	});
});

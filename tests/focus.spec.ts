import { test, expect } from "@playwright/test";

test("focus sets tab indexes appropriately", async ({ page }) => {
	const getTabIndex = (selector: string) => page.locator(selector).evaluate((e) => e.tabIndex);

	await page.goto("http://localhost:3000/test");
	await expect(page.locator("input")).toHaveCount(5);

	const originalTabIndexes = await page.locator("input").evaluateAll((ee) =>
		ee.reduce((acc, e) => {
			acc[e.id] = e.tabIndex;
			return acc;
		}, {} as Record<string, number>),
	);
	await page.click("#toggle");

	await expect(await getTabIndex("#focusInput1")).toBe(0);
	await expect(await getTabIndex("#focusInput2")).toBe(0);
	await expect(await getTabIndex("#focusInput3")).toBe(0);
	await expect(await getTabIndex("#focusTextArea")).toBe(0);

	await expect(await getTabIndex("#unfocusedInput1")).toBe(-1);
	await expect(await getTabIndex("#unfocusedInput2")).toBe(-1);

	await page.click("#toggle");
	for (const [key, value] of Object.entries(originalTabIndexes)) {
		await expect(await page.locator(`#${key}`).evaluate((e) => e.tabIndex)).toBe(value);
	}
});

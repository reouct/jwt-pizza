import { test, expect } from "playwright-test-coverage";

/**
 * History Page Tests
 * Verifies:
 *  - Title heading text
 *  - Hero image with correct src
 *  - Presence and count of narrative paragraphs
 *  - Key historical phrases exist
 *  - Page loads without any network API calls (no /api/ fetches)
 */

test.describe("History Page", () => {
  const url = "http://localhost:5173/history";

  test("renders title, image, and narrative paragraphs", async ({ page }) => {
    // Track network requests to ensure no API hits (only static assets allowed)
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (/\/api\//.test(u)) apiCalls.push(u);
    });

    await page.goto(url);

    // Title from View component (inside h2 gradient span)
    await expect(
      page.locator('h2:has-text("Mama Rucci, my my")')
    ).toBeVisible();

    // Image present with correct src
    const img = page.locator('img[src="mamaRicci.png"]');
    await expect(img).toBeVisible();
    await expect(img).toHaveClass(/w-64/);

    // Paragraphs: count all p children inside the main text wrapper (excluding nested spans)
    // Select paragraph elements with class py-2 under the main narrative container.
    // Use a broader container then filter by p.py-2 since the long text contains an apostrophe.
    const paragraphs = page.locator("div.text-neutral-100 p.py-2");
    await expect(paragraphs).toHaveCount(4);

    // Key historical phrases
    const expectedPhrases = [
      "ancient civilizations",
      "Neapolitan pizza",
      "working class",
      "United States",
      "countless variations",
    ];
    for (const phrase of expectedPhrases) {
      const phraseLocator = page.locator(`text=${phrase}`).first();
      await expect(phraseLocator).toBeVisible();
    }

    // Assert no API calls were made
    expect(
      apiCalls,
      "Expected no /api/ network calls on static History page"
    ).toHaveLength(0);
  });

  test("responsive classes exist for layout container", async ({ page }) => {
    await page.goto(url);
    const container = page.locator("div.text-neutral-100.text-start");
    await expect(container).toHaveClass(/py-8/);
    await expect(container).toHaveClass(/px-4/);
  });
});

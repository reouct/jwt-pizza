import { test, expect } from "playwright-test-coverage";

test.describe("About Page", () => {

  test("displays employee images and tooltips", async ({ page }) => {
    await page.goto("http://localhost:5173/about");

    // Check that all 4 employee images are present
    const employeeImages = page.locator('img[alt="Employee stock photo"]');
    await expect(employeeImages).toHaveCount(4);

    // Verify each employee tooltip by hovering over images
    const employees = [
      { name: "James", index: 0 },
      { name: "Maria", index: 1 },
      { name: "Anna", index: 2 },
      { name: "Brian", index: 3 },
    ];

    for (const employee of employees) {
      const employeeImage = employeeImages.nth(employee.index);
      await expect(employeeImage).toBeVisible();

      // Hover to trigger tooltip
      await employeeImage.hover();

      // Check if tooltip with employee name is visible
      const tooltip = page
        .getByRole("tooltip")
        .filter({ hasText: employee.name });
      await expect(tooltip).toBeVisible();
    }
  });

  test("has proper responsive styling classes", async ({ page }) => {
    await page.goto("http://localhost:5173/about");

    // Check main container has responsive padding
    const mainContainer = page.locator(
      ".text-start.py-8.px-4.sm\\:px-6.lg\\:px-8"
    );
    await expect(mainContainer).toBeVisible();

    // Check heading has responsive text sizing
    const heading = page.locator("h2").filter({ hasText: "Our employees" });
    await expect(heading).toHaveClass(/text-2xl/);
    await expect(heading).toHaveClass(/sm:text-4xl/);

    // Verify employee images have proper styling
    const employeeContainer = page.locator(".flex.-space-x-2");
    await expect(employeeContainer).toBeVisible();

    const firstEmployeeImage = page
      .locator('img[alt="Employee stock photo"]')
      .first();
    await expect(firstEmployeeImage).toHaveClass(/size-\[96px\]/);
    await expect(firstEmployeeImage).toHaveClass(/rounded-full/);
    await expect(firstEmployeeImage).toHaveClass(/ring-2/);
    await expect(firstEmployeeImage).toHaveClass(/ring-white/);
  });

  test("displays special typography styling on first paragraph", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/about");

    // Verify the first paragraph has special first-line and first-letter styling
    const firstParagraph = page
      .locator("p")
      .filter({
        hasText: "At JWT Pizza, our amazing employees are the secret behind",
      });
    await expect(firstParagraph).toHaveClass(/first-line:uppercase/);
    await expect(firstParagraph).toHaveClass(/first-line:tracking-widest/);
    await expect(firstParagraph).toHaveClass(/first-letter:text-7xl/);
    await expect(firstParagraph).toHaveClass(/first-letter:font-bold/);
    await expect(firstParagraph).toHaveClass(/first-letter:text-orange-800/);
  });

  test("has correct text colors for different sections", async ({ page }) => {
    await page.goto("http://localhost:5173/about");

    // Check first paragraph has neutral-100 text
    const firstParagraph = page
      .locator("p")
      .filter({ hasText: "At JWT Pizza, our amazing employees" });
    await expect(firstParagraph).toHaveClass(/text-neutral-100/);

    // Check other paragraphs have white text
    const secondParagraph = page
      .locator("p")
      .filter({ hasText: "Our talented employees at JWT Pizza" });
    await expect(secondParagraph).toHaveClass(/text-white/);

    // Check heading has orange color
    const heading = page.locator("h2").filter({ hasText: "Our employees" });
    await expect(heading).toHaveClass(/text-orange-600/);
  });

  test("employee images load from external sources", async ({ page }) => {
    await page.goto("http://localhost:5173/about");

    const employeeImages = page.locator('img[alt="Employee stock photo"]');

    // Check that images have Unsplash URLs (external images)
    for (let i = 0; i < 4; i++) {
      const img = employeeImages.nth(i);
      const src = await img.getAttribute("src");
      expect(src).toContain("images.unsplash.com");
      expect(src).toContain("auto=format&fit=facearea");
    }
  });
});

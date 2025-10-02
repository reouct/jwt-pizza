import { test, expect } from "playwright-test-coverage";
import type { Page, Route } from "@playwright/test";

/**
 * FranchiseDashboard tests
 * Covers:
 *  - Marketing view when user has no franchise
 *  - Franchise table rendering with stores
 *  - Create store navigation
 *  - Close store navigation
 *  - Revenue formatting
 *  - Empty stores array case
 */

test.describe("FranchiseDashboard", () => {
  const baseUrl = "http://localhost:5173/franchise-dashboard";

  const user = {
    id: "u-1",
    name: "Fran Owner",
    email: "owner@example.com",
    roles: [{ role: "franchisee", objectId: "fr-1" }],
  };
  const dinerUser = {
    id: "u-2",
    name: "Regular Diner",
    email: "diner@example.com",
    roles: [{ role: "diner" }],
  };

  const franchiseWithStores = [
    {
      id: "fr-1",
      name: "Crust Dynasty",
      stores: [
        { id: "st-1", name: "Downtown", totalRevenue: 1234 },
        { id: "st-2", name: "Uptown", totalRevenue: 56789 },
      ],
    },
  ];

  const franchiseNoStores = [{ id: "fr-1", name: "Crust Dynasty", stores: [] }];

  async function mockUser(page: Page, which: "owner" | "diner") {
    await page.addInitScript(() => localStorage.setItem("token", "test-token"));
    await page.route(/\/api\/user\/me$/, async (route: Route) => {
      await route.fulfill({ json: which === "owner" ? user : dinerUser });
    });
  }

  async function mockFranchise(
    page: Page,
    variant: "with-stores" | "empty" | "none"
  ) {
    await page.route(/\/api\/franchise\/u-1$/, async (route: Route) => {
      if (variant === "with-stores") {
        await route.fulfill({ json: franchiseWithStores });
      } else if (variant === "empty") {
        await route.fulfill({ json: franchiseNoStores });
      } else {
        await route.fulfill({ json: [] });
      }
    });
    // For diner user (id u-2) also intercept to return none
    await page.route(/\/api\/franchise\/u-2$/, async (route: Route) => {
      await route.fulfill({ json: [] });
    });
  }

  async function goto(page: Page) {
    await page.goto(baseUrl);
  }

  test("shows marketing view when no franchise present", async ({ page }) => {
    await mockUser(page, "diner");
    await mockFranchise(page, "none");
    await goto(page);

    await expect(
      page.locator('h2:has-text("So you want a piece of the pie?")')
    ).toBeVisible();
    await expect(page.locator("text=Call now")).toBeVisible();
    await expect(
      page.locator('a[href="/franchise-dashboard/login"]')
    ).toBeVisible();
  });

  test("renders franchise name as title and store table with rows", async ({
    page,
  }) => {
    await mockUser(page, "owner");
    await mockFranchise(page, "with-stores");
    await goto(page);

    await expect(page.locator('h2:has-text("Crust Dynasty")')).toBeVisible();
    const headers = page.locator("thead tr th");
    await expect(headers).toHaveCount(3);
    await expect(headers.nth(0)).toContainText("Name");
    await expect(headers.nth(1)).toContainText("Revenue");
    await expect(headers.nth(2)).toContainText("Action");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Downtown");
    await expect(rows.nth(0)).toContainText("1,234");
    await expect(rows.nth(1)).toContainText("56,789");
  });

  test("navigates to create store page when Create store button clicked", async ({
    page,
  }) => {
    await mockUser(page, "owner");
    await mockFranchise(page, "with-stores");
    await goto(page);

    await page.click('button:has-text("Create store")');
    await expect(page).toHaveURL(/.*create-store/);
  });

  test("navigates to close store page when Close clicked", async ({ page }) => {
    await mockUser(page, "owner");
    await mockFranchise(page, "with-stores");
    await goto(page);

    // Click first Close button
    await page.click("tbody tr >> text=Close");
    await expect(page).toHaveURL(/.*close-store/);
  });

  test("handles franchise with zero stores gracefully (headers shown, no rows)", async ({
    page,
  }) => {
    await mockUser(page, "owner");
    await mockFranchise(page, "empty");
    await goto(page);

    await expect(page.locator('h2:has-text("Crust Dynasty")')).toBeVisible();
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(0);
  });
});

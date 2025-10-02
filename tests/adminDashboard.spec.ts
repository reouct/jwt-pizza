import { test, expect } from "playwright-test-coverage";
import type { Page, Route } from "@playwright/test";

test.describe("Admin Dashboard", () => {
  // Mock data for testing
  const adminUser = {
    id: "1",
    name: "Admin User",
    email: "admin@jwt.com",
    roles: [{ role: "admin" }],
  };

  const nonAdminUser = {
    id: "2",
    name: "Regular User",
    email: "user@jwt.com",
    roles: [{ role: "diner" }],
  };

  const mockFranchises = {
    franchises: [
      {
        id: "1",
        name: "PizzaPalace",
        admins: [{ id: "10", name: "John Doe", email: "john@pizza.com" }],
        stores: [
          { id: "101", name: "Downtown", totalRevenue: 12500 },
          { id: "102", name: "Uptown", totalRevenue: 8750 },
        ],
      },
      {
        id: "2",
        name: "CrustyCrust",
        admins: [{ id: "20", name: "Jane Smith", email: "jane@crusty.com" }],
        stores: [{ id: "201", name: "Mall Location", totalRevenue: 15600 }],
      },
    ],
    more: true,
  };

  async function setupMocks(page: Page) {
    // Mock user authentication endpoint - this is crucial for the app to know user is logged in
    await page.route(/\/api\/user\/me$/, async (route: Route) => {
      await route.fulfill({ json: adminUser });
    });

    // Mock authentication endpoint for login flow
    await page.route(/\/api\/auth$/, async (route: Route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          json: {
            user: adminUser,
            token: "fake-admin-token",
          },
        });
      }
    });

    // Mock franchise list endpoint with pagination
    await page.route(/\/api\/franchise\?.*/, async (route: Route) => {
      const url = new URL(route.request().url());
      const pageNum = parseInt(url.searchParams.get("page") || "0");
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const nameFilter = url.searchParams.get("name") || "*";

      let filteredFranchises = mockFranchises.franchises;

      // Apply name filter if not wildcard
      if (nameFilter !== "*" && !nameFilter.includes("*")) {
        filteredFranchises = mockFranchises.franchises.filter((f) =>
          f.name.toLowerCase().includes(nameFilter.toLowerCase())
        );
      }

      const startIndex = pageNum * limit;
      const endIndex = startIndex + limit;
      const paginatedFranchises = filteredFranchises.slice(
        startIndex,
        endIndex
      );

      await route.fulfill({
        json: {
          franchises: paginatedFranchises,
          more: endIndex < filteredFranchises.length,
        },
      });
    });

    // Mock close franchise endpoint
    await page.route(/\/api\/franchise\/\d+$/, async (route: Route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          json: { message: "Franchise closed successfully" },
        });
      }
    });

    // Mock close store endpoint
    await page.route(
      /\/api\/franchise\/\d+\/store\/\d+$/,
      async (route: Route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            json: { message: "Store closed successfully" },
          });
        }
      }
    );

    // Set up authentication state in localStorage to simulate logged in admin
    await page.addInitScript((user) => {
      localStorage.setItem("token", "fake-admin-token");
      // Store user in localStorage or sessionStorage if the app uses it
      localStorage.setItem("user", JSON.stringify(user));
    }, adminUser);
  }


  test("shows not found page for non-admin users", async ({ page }) => {
    // Mock non-admin user
    await page.route(/\/api\/user\/me$/, async (route: Route) => {
      await route.fulfill({ json: nonAdminUser });
    });

    await page.goto("http://localhost:5173/admin-dashboard");

    // Should show not found page instead of admin dashboard
    await expect(page.getByText("Oops")).toBeVisible();
    await expect(
      page.getByText("It looks like we have dropped a pizza on the floor.")
    ).toBeVisible();
  });

  test("navigates to create franchise page when Add Franchise button is clicked", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Find and click the Add Franchise button
    const addFranchiseButton = page.getByText("Add Franchise");
    await expect(addFranchiseButton).toBeVisible();

    await addFranchiseButton.click();

    // Should navigate to create franchise page
    await expect(page).toHaveURL(/.*admin-dashboard\/create-franchise/);
  });

  test("filters franchises by name", async ({ page }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Find and use the filter input
    const filterInput = page.getByPlaceholder("Filter franchises");
    const submitButton = page.getByText("Submit");

    await expect(filterInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    await filterInput.fill("Pizza");
    await submitButton.click();

    // Should still see PizzaPalace but request would filter results
    await expect(page.getByText("PizzaPalace")).toBeVisible();
  });

  test("close franchise button navigates correctly", async ({ page }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Find first close franchise button (there should be one for each franchise)
    const closeFranchiseButtons = page
      .getByRole("button")
      .filter({ hasText: "Close" });
    const firstCloseFranchiseButton = closeFranchiseButtons.first();

    await expect(firstCloseFranchiseButton).toBeVisible();
    await firstCloseFranchiseButton.click();

    // Should navigate to close franchise page
    await expect(page).toHaveURL(/.*admin-dashboard\/close-franchise/);
  });

  test("close store button navigates correctly", async ({ page }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Find close buttons for stores (should be more than franchise close buttons)
    const closeButtons = page.getByRole("button").filter({ hasText: "Close" });

    // Click on a store close button (not the franchise one)
    // Store close buttons appear after franchise close buttons in the DOM
    const storeCloseButton = closeButtons.nth(1); // Second close button should be for a store

    await expect(storeCloseButton).toBeVisible();
    await storeCloseButton.click();

    // Should navigate to close store page
    await expect(page).toHaveURL(/.*admin-dashboard\/close-store/);
  });

  test("displays revenue with proper formatting", async ({ page }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Check that revenue is formatted with commas and bitcoin symbol
    await expect(page.getByText("12,500 ₿")).toBeVisible();
    await expect(page.getByText("8,750 ₿")).toBeVisible();
    await expect(page.getByText("15,600 ₿")).toBeVisible();
  });

  test("handles empty franchise list", async ({ page }) => {
    // Mock empty franchise response
    await page.route(/\/api\/franchise\?.*/, async (route: Route) => {
      await route.fulfill({
        json: { franchises: [], more: false },
      });
    });

    await page.route(/\/api\/user\/me$/, async (route: Route) => {
      await route.fulfill({ json: adminUser });
    });

    await page.addInitScript((user) => {
      localStorage.setItem("token", "fake-admin-token");
      localStorage.setItem("user", JSON.stringify(user));
    }, adminUser);

    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Should still show headers and add franchise button
    await expect(page.getByText("Franchises")).toBeVisible();
    await expect(page.getByText("Add Franchise")).toBeVisible();

    // Pagination buttons should be disabled
    await expect(page.getByText("«")).toBeDisabled();
    await expect(page.getByText("»")).toBeDisabled();
  });

  test("displays franchise admins correctly", async ({ page }) => {
    // Mock franchise with multiple admins
    const franchiseWithMultipleAdmins = {
      franchises: [
        {
          id: "1",
          name: "MultiAdmin Pizza",
          admins: [
            { id: "1", name: "Admin One", email: "admin1@test.com" },
            { id: "2", name: "Admin Two", email: "admin2@test.com" },
          ],
          stores: [],
        },
      ],
      more: false,
    };

    await page.route(/\/api\/franchise\?.*/, async (route: Route) => {
      await route.fulfill({ json: franchiseWithMultipleAdmins });
    });

    await page.route(/\/api\/user\/me$/, async (route: Route) => {
      await route.fulfill({ json: adminUser });
    });

    await page.addInitScript((user) => {
      localStorage.setItem("token", "fake-admin-token");
      localStorage.setItem("user", JSON.stringify(user));
    }, adminUser);

    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Should display both admin names joined by comma
    await expect(page.getByText("Admin One, Admin Two")).toBeVisible();
  });

  test("createFranchise function navigation works correctly", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(1000);
    await page.goto("http://localhost:5173/admin-dashboard");

    // Verify the Add Franchise button is present and functional
    const addFranchiseButton = page.getByRole("button", {
      name: "Add Franchise",
    });
    await expect(addFranchiseButton).toBeVisible();
    await expect(addFranchiseButton).toHaveClass(/w-36/); // Check styling classes
    await expect(addFranchiseButton).toHaveClass(/text-xs/);

    // Click the button to test the createFranchise function
    await addFranchiseButton.click();

    // Verify navigation to the correct route
    await expect(page).toHaveURL(
      "http://localhost:5173/admin-dashboard/create-franchise"
    );
  });
});

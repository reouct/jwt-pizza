import { test, expect } from "playwright-test-coverage";
import type { Page, Route } from "@playwright/test";

test.describe("Diner Dashboard", () => {
  const adminUser = {
    id: 1,
    name: "Admin User",
    email: "admin@jwt.com",
    roles: [{ role: "admin" }],
  };

  const nonAdminUser = {
    id: 2,
    name: "Regular User",
    email: "user@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User2 = {
    id: 3,
    name: "Regular User 2",
    email: "user2@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User3 = {
    id: 4,
    name: "Regular User 3",
    email: "user3@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User4 = {
    id: 5,
    name: "Regular User 4",
    email: "user4@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User5 = {
    id: 6,
    name: "Regular User 5",
    email: "user5@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User6 = {
    id: 7,
    name: "Franchisee User 1",
    email: "user6@jwt.com",
    roles: [{ role: "franchisee" }],
  };

  const User7 = {
    id: 8,
    name: "Regular User 7",
    email: "user7@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User8 = {
    id: 9,
    name: "Franchisee User 2",
    email: "user8@jwt.com",
    roles: [{ role: "franchisee" }],
  };

  const User9 = {
    id: 10,
    name: "Regular User 8",
    email: "user9@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User10 = {
    id: 11,
    name: "Regular User 9",
    email: "user10@jwt.com",
    roles: [{ role: "diner" }],
  };

  const User11 = {
    id: 12,
    name: "Regular User 10",
    email: "user11@jwt.com",
    roles: [{ role: "diner" }],
  };

  async function mockUser(page: Page, user: any) {
    await page.route(/\/api\/user\/me$/, async (route: Route) => {
      await route.fulfill({ json: user });
    });

    // Ensure the app sees a token in localStorage
    await page.addInitScript((token) => {
      localStorage.setItem("token", token);
    }, "test-token");
  }

  const allUsers = [
    adminUser,
    nonAdminUser,
    User2,
    User3,
    User4,
    User5,
    User6,
    User7,
    User8,
    User9,
    User10,
    User11,
  ];

  // First page (10 users)
  const usersPage1 = allUsers.slice(0, 10);
  // Second page (remaining 2 users)
  const usersPage2 = allUsers.slice(10, 12);

  async function listUser(
    page: Page,
    users: any[] = usersPage1,
    more: boolean = false,
    frontendPageNum: number = 0,
    nameFilter?: string
  ) {
    // Convert frontend page number to backend page number (0-based to 1-based)
    const backendPageNum = frontendPageNum + 1;
    let routePattern: RegExp;

    if (nameFilter) {
      routePattern = new RegExp(
        `/api/user\\?page=${backendPageNum}&limit=10&name=${nameFilter.replace(
          "*",
          "\\*"
        )}`
      );
    } else {
      routePattern = new RegExp(`/api/user\\?page=${backendPageNum}&limit=10`);
    }

    await page.route(routePattern, async (route: Route) => {
      await route.fulfill({
        json: {
          users: users,
          more: more,
        },
      });
    });
  }

  test("shows List button for admin users", async ({ page }) => {
    await mockUser(page, adminUser);

    await page.goto("http://localhost:5173/diner-dashboard");

    // Wait a short while for the UI to render
    await page.waitForTimeout(500);

    // The List button should be visible next to Edit for admins
    const listButton = page.getByRole("button", { name: "List" });
    await expect(listButton).toBeVisible();
  });

  test("does not show List button for non-admin users", async ({ page }) => {
    await mockUser(page, nonAdminUser);

    await page.goto("http://localhost:5173/diner-dashboard");

    await page.waitForTimeout(500);

    const listButton = page.getByRole("button", { name: "List" });
    await expect(listButton).toHaveCount(0);
  });

  test("admin can see 10 users per page and Next enabled when more users exist", async ({
    page,
  }) => {
    await mockUser(page, adminUser);

    // Mock page 0 (first 10 users) with more = true
    await listUser(page, usersPage1, true, 0);

    // Mock page 1 (remaining 2 users) with more = false
    await listUser(page, usersPage2, false, 1);

    await page.goto("http://localhost:5173/admin-dashboard/list-users");

    // Wait for the table to render
    await page.waitForSelector("table");

    // Count body rows (should be 10)
    const rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(10);

    // Next button should be enabled because more: true
    const nextButton = page.getByRole("button", { name: "»" });
    await expect(nextButton).toBeEnabled();

    // Click Next button to go to page 1
    await nextButton.click();

    // Wait for the new page to load
    await page.waitForTimeout(500);

    // Verify second page shows 2 users
    const rowsPage2 = await page.locator("tbody tr");
    await expect(rowsPage2).toHaveCount(2);

    // Next button should now be disabled because more: false
    await expect(nextButton).toBeDisabled();
  });

  test("displays user ID column in the table", async ({ page }) => {
    await mockUser(page, adminUser);
    await listUser(page, [adminUser, nonAdminUser], false, 0);

    await page.goto("http://localhost:5173/admin-dashboard/list-users");

    // Wait for the table to render
    await page.waitForSelector("table");

    // Check that ID header is present
    const idHeader = page.locator("th").first();
    await expect(idHeader).toHaveText("ID");

    // Check that the first user's ID is displayed
    const firstRowIdCell = page
      .locator("tbody tr")
      .first()
      .locator("td")
      .first();
    await expect(firstRowIdCell).toHaveText("1");

    // Check that the second user's ID is displayed
    const secondRowIdCell = page
      .locator("tbody tr")
      .nth(1)
      .locator("td")
      .first();
    await expect(secondRowIdCell).toHaveText("2");
  });

  test("handles pagination correctly with multiple pages", async ({ page }) => {
    await mockUser(page, adminUser);

    // Mock backend page 1 (frontend page 0 -> backend page 1) - first 10 users
    await page.route(/\/api\/user\?page=1&limit=10$/, async (route: Route) => {
      await route.fulfill({
        json: {
          users: usersPage1, // First 10 users
          more: true, // Indicate there are more pages
        },
      });
    });

    // Mock backend page 2 (frontend page 1 -> backend page 2) - remaining 2 users
    await page.route(/\/api\/user\?page=2&limit=10$/, async (route: Route) => {
      await route.fulfill({
        json: {
          users: usersPage2, // Remaining 2 users
          more: false, // No more pages
        },
      });
    });

    await page.goto("http://localhost:5173/admin-dashboard/list-users");

    // Wait for the table to render
    await page.waitForSelector("table");

    // Verify first page shows 10 users
    const rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(10);

    // Verify Next button is enabled (more = true)
    const nextButton = page.getByRole("button", { name: "»" });
    await expect(nextButton).toBeEnabled();

    // Click Next button to go to page 1
    await nextButton.click();

    // Wait for the new page to load
    await page.waitForTimeout(500);

    // Verify second page shows 2 users
    const rowsPage2 = await page.locator("tbody tr");
    await expect(rowsPage2).toHaveCount(2);

    // Verify Next button is disabled (more = false)
    await expect(nextButton).toBeDisabled();

    // Verify Previous button is enabled
    const prevButton = page.getByRole("button", { name: "«" });
    await expect(prevButton).toBeEnabled();
  });

  test("displays specific user when filtered", async ({ page }) => {
    await mockUser(page, adminUser);

    // Mock the standard endpoint to return only "Regular User 3"
    await listUser(page, [User3], false, 0);

    await page.goto("http://localhost:5173/admin-dashboard/list-users");

    // Wait for the table to render
    await page.waitForSelector("table");

    // Verify only "Regular User 3" is displayed
    const rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(1);

    // Verify the user name is "Regular User 3"
    const nameCell = page.locator("tbody tr").first().locator("td").nth(1);
    await expect(nameCell).toHaveText("Regular User 3");

    // Verify the user ID is 4
    const idCell = page.locator("tbody tr").first().locator("td").first();
    await expect(idCell).toHaveText("4");
  });

  test("search with no results shows empty state", async ({ page }) => {
    await mockUser(page, adminUser);

    // Mock search for "nonexistent" - should return empty results
    await page.route(
      /\/api\/user\?page=1&limit=10&name=%2Anonexistent%2A$/,
      async (route: Route) => {
        await route.fulfill({
          json: {
            users: [],
            more: false,
          },
        });
      }
    );

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    // Type in search box
    const searchBox = page.locator('input[placeholder*="Search by name"]');
    await searchBox.fill("nonexistent");

    // Wait for debounced search
    await page.waitForTimeout(500);

    // Should show "No users to display" message
    const emptyMessage = page.locator("text=No users to display");
    await expect(emptyMessage).toBeVisible();

    // Check that filter indicator is shown
    const filterIndicator = page.locator('text=(Filtered by: "nonexistent")');
    await expect(filterIndicator).toBeVisible();
  });

  test("clearing search reloads all users", async ({ page }) => {
    await mockUser(page, adminUser);

    // Mock initial load (all users)
    await page.route(/\/api\/user\?page=1&limit=10$/, async (route: Route) => {
      await route.fulfill({
        json: {
          users: usersPage1,
          more: true,
        },
      });
    });

    // Mock search results
    await page.route(
      /\/api\/user\?page=1&limit=10&name=%2Aadmin%2A$/,
      async (route: Route) => {
        await route.fulfill({
          json: {
            users: [adminUser],
            more: false,
          },
        });
      }
    );

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    const searchBox = page.locator('input[placeholder*="Search by name"]');

    // Search for "admin"
    await searchBox.fill("admin");
    await page.waitForTimeout(500);

    // Should show 1 result
    let rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(1);

    // Clear search
    await searchBox.clear();
    await page.waitForTimeout(500);

    // Should show all users again
    rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(10);

    // Filter indicator should be gone
    const filterIndicator = page.locator("text=(Filtered by:");
    await expect(filterIndicator).toHaveCount(0);
  });
});

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

  // Helper to mock DELETE /api/user/:userId
  async function deleteUser(
    page: Page,
    userId: number | string,
    options: { status?: number; delayMs?: number; responseBody?: any } = {}
  ) {
    const { status = 200, delayMs = 0, responseBody } = options;
    const routePattern = new RegExp(`/api/user/${userId}$`);

    await page.route(routePattern, async (route: Route) => {
      // Only handle DELETE, let other methods pass through
      if (route.request().method() !== "DELETE") {
        try {
          await route.continue();
        } catch {
          // If no backend exists, ignore
          await route.fulfill({ status: 404 });
        }
        return;
      }

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const fulfill: any = { status };
      if (responseBody !== undefined) {
        if (typeof responseBody === "string") {
          fulfill.body = responseBody;
        } else {
          fulfill.json = responseBody;
        }
      }

      await route.fulfill(fulfill);
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

  test("displays delete button for each user", async ({ page }) => {
    await mockUser(page, adminUser);
    await listUser(page, [adminUser, nonAdminUser], false, 0);

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    // Check that Actions header is present
    const actionsHeader = page.locator("th").last();
    await expect(actionsHeader).toHaveText("Actions");

    // Check that delete buttons are present for each user
    const deleteButtons = page.getByRole("button", { name: "Delete" });
    await expect(deleteButtons).toHaveCount(2);

    // Check that buttons are enabled
    const firstDeleteButton = deleteButtons.first();
    await expect(firstDeleteButton).toBeEnabled();
  });

  test("successfully deletes a user", async ({ page }) => {
    await mockUser(page, adminUser);

    // Track the number of calls to the main endpoint
    let callCount = 0;
    await page.route(/\/api\/user\?page=1&limit=10$/, async (route: Route) => {
      callCount++;
      if (callCount === 1) {
        // Initial load: 3 users
        await route.fulfill({
          json: {
            users: [adminUser, nonAdminUser, User2],
            more: false,
          },
        });
      } else {
        // Refresh after delete: 2 users (nonAdminUser removed)
        await route.fulfill({
          json: {
            users: [adminUser, User2],
            more: false,
          },
        });
      }
    });

    // Mock delete API call using helper (return JSON so callEndpoint can parse)
    await deleteUser(page, 2, { status: 200, responseBody: {} });

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    // Initially should have 3 users
    let rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(3);

    // Auto-confirm the deletion dialog
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    // Click delete button for the second user (nonAdminUser)
    const deleteButtons = page.getByRole("button", { name: "Delete" });
    const secondDeleteButton = deleteButtons.nth(1);

    // Wait for the refresh API call to happen after delete
    const refreshResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/user?page=1&limit=10") &&
        response.request().method() === "GET"
    );

    await secondDeleteButton.click();

    // Wait for both delete and refresh to complete
    await refreshResponsePromise;
    await page.waitForTimeout(500); // Small buffer for UI to update

    // Should now have 2 users (nonAdminUser deleted)
    rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // Verify the deleted user is no longer in the list
    const userNames = await page
      .locator("tbody tr td:nth-child(2)")
      .allTextContents();
    expect(userNames).not.toContain("Regular User");
  });

  test("shows confirmation dialog before deleting", async ({ page }) => {
    await mockUser(page, adminUser);
    await listUser(page, [adminUser, nonAdminUser], false, 0);

    // Mock delete API - this should NOT be called since we're cancelling
    await page.route(/\/api\/user\/1$/, async (route: Route) => {
      if (route.request().method() === "DELETE") {
        throw new Error(
          "Delete API should not be called when confirmation is cancelled"
        );
      }
    });

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    // Track confirmation dialog calls
    await page.evaluate(() => {
      const originalConfirm = window.confirm;
      window.confirm = (message) => {
        (window as any).confirmCalled = true;
        (window as any).confirmMessage = message;
        return false; // Cancel the deletion
      };
    });

    // Click delete button
    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();

    // Check if confirmation was called
    const wasConfirmCalled = await page.evaluate(
      () => (window as any).confirmCalled
    );
    const confirmationMessage = await page.evaluate(
      () => (window as any).confirmMessage
    );

    expect(wasConfirmCalled).toBe(true);
    expect(confirmationMessage).toContain(
      'Are you sure you want to delete user "Admin User"?'
    );
    expect(confirmationMessage).toContain("This action cannot be undone.");
  });

  test("cancels deletion when user clicks cancel", async ({ page }) => {
    await mockUser(page, adminUser);
    await listUser(page, [adminUser, nonAdminUser], false, 0);

    // Mock delete API - this should NOT be called since we're cancelling
    await page.route(/\/api\/user\/1$/, async (route: Route) => {
      if (route.request().method() === "DELETE") {
        throw new Error(
          "Delete API should not be called when confirmation is cancelled"
        );
      }
    });

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    // Mock confirmation to return false (cancel)
    await page.evaluate(() => {
      window.confirm = () => false;
    });

    // Initially should have 2 users
    let rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // Click delete button
    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();

    // Wait a bit
    await page.waitForTimeout(500);

    // Should still have 2 users (deletion was cancelled)
    rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
  });

  test("shows loading state during deletion", async ({ page }) => {
    await mockUser(page, adminUser);

    // Mock initial load and refresh after delete
    let isInitialLoad = true;
    await page.route(/\/api\/user\?page=1&limit=10$/, async (route: Route) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        await route.fulfill({
          json: {
            users: [adminUser, nonAdminUser],
            more: false,
          },
        });
      } else {
        // Refresh after delete (adminUser removed)
        await route.fulfill({
          json: {
            users: [nonAdminUser],
            more: false,
          },
        });
      }
    });

    // Mock delete API with delay to simulate loading
    await page.route(/\/api\/user\/1$/, async (route: Route) => {
      if (route.request().method() === "DELETE") {
        // Add delay to simulate slow network
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({ status: 200 });
      }
    });

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    // Auto-confirm deletion
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    // Click delete button for first user
    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();

    // Should show loading state
    const deletingButton = page.getByRole("button", { name: "Deleting..." });
    await expect(deletingButton).toBeVisible();
    await expect(deletingButton).toBeDisabled();
  });

  test("handles delete API errors gracefully", async ({ page }) => {
    await mockUser(page, adminUser);
    await listUser(page, [adminUser, nonAdminUser], false, 0);

    // Mock delete API to return error
    await page.route(/\/api\/user\/1$/, async (route: Route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({ status: 500, body: "Server Error" });
      }
    });

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    // Track alert calls
    await page.evaluate(() => {
      (window as any).alertCalled = false;
      (window as any).alertMessage = "";
      window.alert = (message) => {
        (window as any).alertCalled = true;
        (window as any).alertMessage = message;
      };
      window.confirm = () => true;
    });

    // Initially should have 2 users
    let rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // Click delete button
    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
    await deleteButton.click();

    // Wait for error handling
    await page.waitForTimeout(1000);

    // Should still have 2 users (deletion failed)
    rows = await page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // Check that error alert was shown
    const alertCalled = await page.evaluate(() => (window as any).alertCalled);
    const alertMessage = await page.evaluate(
      () => (window as any).alertMessage
    );

    expect(alertCalled).toBe(true);
    expect(alertMessage).toContain('Failed to delete user "Admin User"');
    expect(alertMessage).toContain("Please try again.");
  });

  test("disables delete button for users without ID", async ({ page }) => {
    await mockUser(page, adminUser);

    // Create a user without ID
    const userWithoutId = {
      name: "User Without ID",
      email: "noId@jwt.com",
      roles: [{ role: "diner" }],
    };

    await listUser(page, [adminUser, userWithoutId], false, 0);

    await page.goto("http://localhost:5173/admin-dashboard/list-users");
    await page.waitForSelector("table");

    const deleteButtons = page.getByRole("button", { name: "Delete" });
    await expect(deleteButtons).toHaveCount(2);

    // First button (adminUser with ID) should be enabled
    const firstDeleteButton = deleteButtons.first();
    await expect(firstDeleteButton).toBeEnabled();

    // Second button (user without ID) should be disabled
    const secondDeleteButton = deleteButtons.last();
    await expect(secondDeleteButton).toBeDisabled();
  });
});

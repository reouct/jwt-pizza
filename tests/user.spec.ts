import { test, expect } from "playwright-test-coverage";

test("updateUser", async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;

  // Mutable user state used by mocked endpoints so updates persist
  const currentUser: any = { id: "1", name: "pizza diner", email, roles: [] };

  // Mock backend endpoints: /api/auth for register/login
  await page.route("**/api/auth", async (route, request) => {
    const method = request.method();
    if (method === "POST") {
      // register - set currentUser and return token
      currentUser.name = "pizza diner";
      currentUser.email = email;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: currentUser, token: "fake-token" }),
      });
    } else if (method === "PUT") {
      // login - return current user (may have been updated)
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: currentUser, token: "fake-token" }),
      });
    } else {
      route.continue();
    }
  });

  // /api/user/me should return the currentUser object
  await page.route("**/api/user/me", async (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentUser),
    });
  });

  // Mock update user endpoint - persist changes into currentUser
  await page.route("**/api/user/*", async (route, request) => {
    if (request.method() === "PUT") {
      const body = await request.postData();
      let parsed = {} as any;
      try {
        parsed = body ? JSON.parse(body) : {};
      } catch (e) {
        parsed = {};
      }
      // merge updates into currentUser
      Object.assign(currentUser, parsed);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: currentUser, token: "fake-token" }),
      });
    } else {
      route.continue();
    }
  });

  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Register" }).click();

  const userLink = page.getByRole("link", { name: "pd" });
  // wait for the header user link (initials) to appear after registration
  await expect(userLink).toBeVisible({ timeout: 10000 });
  await userLink.click();

  await expect(page.getByRole("main")).toContainText("pizza diner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza diner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("pizza dinerx");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "pd" }).click();

  await expect(page.getByRole("main")).toContainText("pizza dinerx");
});

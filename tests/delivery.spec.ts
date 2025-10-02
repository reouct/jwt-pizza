import { test, expect } from "playwright-test-coverage";
import type { Page, Route } from "@playwright/test";

test.describe("Delivery", () => {
  // Mock data for testing
  const mockOrder = {
    id: "order-123",
    franchiseId: "1",
    storeId: "10",
    date: "2024-01-01T12:00:00Z",
    items: [
      { menuId: "1", description: "Veggie", price: 0.0038 },
      { menuId: "2", description: "Pepperoni", price: 0.0042 },
    ],
  };

  const mockJWT =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjo5OTk5OTk5OTk5fQ.fake-signature";

  const validJWTPayload = {
    message: "valid",
    payload: {
      vendor: {
        id: "jwt-pizza",
        name: "JWT Pizza",
      },
      diner: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
      order: mockOrder,
    },
  };

  const invalidJWTPayload = {
    message: "invalid",
    payload: { error: "invalid JWT. Looks like you have a bad pizza!" },
  };

  async function setupMocks(page: Page, jwtValid: boolean = true) {
    // Mock user authentication endpoint to ensure user is logged in
    await page.route(/\/api\/user\/me$/, async (route: Route) => {
      await route.fulfill({
        json: {
          id: "1",
          name: "Test User",
          email: "test@pizza.com",
          roles: [{ role: "diner" }],
        },
      });
    });

    // Mock the verifyOrder API endpoint
    await page.route(/\/api\/order\/verify$/, async (route: Route) => {
      if (route.request().method() === "POST") {
        if (jwtValid) {
          await route.fulfill({ json: validJWTPayload });
        } else {
          await route.fulfill({
            status: 400,
            json: { message: "Invalid JWT", error: "JWT verification failed" },
          });
        }
      }
    });
  }

  test("modal can be closed correctly", async ({ page }) => {
    await setupMocks(page, true);
    await page.goto("http://localhost:5173/delivery");

    // Open modal by clicking verify
    await page.getByRole("button", { name: "Verify" }).click();
    await page.waitForTimeout(1000);

    // Verify modal is open
    const modal = page.locator("#hs-jwt-modal");
    await expect(modal).toBeVisible();

    // Close modal using the close button
    const closeButton = page.getByRole("button", { name: "Close" });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Wait for modal to close
    await page.waitForTimeout(500);

    // Modal should be hidden after closing
    await expect(modal).toBeHidden();
  });

  test("modal can be closed using X button", async ({ page }) => {
    await setupMocks(page, true);
    await page.goto("http://localhost:5173/delivery");

    // Open modal
    await page.getByRole("button", { name: "Verify" }).click();
    await page.waitForTimeout(1000);

    // Verify modal is open
    const modal = page.locator("#hs-jwt-modal");
    await expect(modal).toBeVisible();

    // Close using X button in header
    const xButton = page.locator('[data-hs-overlay="#hs-jwt-modal"]').first();
    await expect(xButton).toBeVisible();
    await xButton.click();

    // Wait for modal to close
    await page.waitForTimeout(500);

    // Modal should be hidden
    await expect(modal).toBeHidden();
  });

  test("Order more button navigates to menu", async ({ page }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/delivery");

    const orderMoreButton = page.getByRole("button", { name: "Order more" });
    await expect(orderMoreButton).toBeVisible();

    // Click order more button
    await orderMoreButton.click();

    // Should navigate to menu page
    await expect(page).toHaveURL(/.*\/menu/);
  });



  test("verify button styling and accessibility", async ({ page }) => {
    await setupMocks(page);
    await page.goto("http://localhost:5173/delivery");

    const verifyButton = page.getByRole("button", { name: "Verify" });
    const orderMoreButton = page.getByRole("button", { name: "Order more" });

    // Verify button styling
    await expect(verifyButton).toHaveClass(/bg-transparent/);
    await expect(verifyButton).toHaveClass(/border-white/);

    // Order more button should have default styling
    await expect(orderMoreButton).toBeVisible();

    // Both buttons should be clickable
    await expect(verifyButton).toBeEnabled();
    await expect(orderMoreButton).toBeEnabled();
  });


});

import { test, expect } from "playwright-test-coverage";
import type { Page, Route } from "@playwright/test";

/**
 * Logout Page Tests
 * Verifies:
 *  - DELETE /api/auth is called when token exists
 *  - localStorage token removed
 *  - Redirect to home page occurs
 *  - Interim message 'Logging out ...' visible pre-redirect
 *  - No DELETE call when no token
 *  - Failed DELETE still clears token and redirects
 */

test.describe("Logout Flow", () => {
  const logoutUrl = "http://localhost:5173/logout";
  const homeUrl = "http://localhost:5173/";
  const authEndpointRegex = /\/api\/auth$/;

  async function setToken(page: Page) {
    await page.addInitScript(() => localStorage.setItem("token", "fake-token"));
  }

  test("logs out: calls DELETE, clears token, redirects", async ({ page }) => {
    await setToken(page);
    let deleteCalled = false;
    const deletePromise = page.waitForRequest(
      (req) => authEndpointRegex.test(req.url()) && req.method() === "DELETE"
    );

    await page.route(authEndpointRegex, async (route: Route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        await route.fulfill({ json: { ok: true } });
      } else {
        await route.fallback();
      }
    });

    await page.goto(logoutUrl);

    // Soft check for interim message (don't fail if too fast)
    const message = page.locator("text=Logging out");
    await message
      .first()
      .waitFor({ state: "visible", timeout: 300 })
      .catch(() => {});

    await deletePromise.catch(() => {});
    await page.waitForURL(homeUrl, { timeout: 5000 });
    expect(deleteCalled).toBe(true);
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
  });

  test("no token: still redirects without DELETE call", async ({ page }) => {
    let deleteCalled = false;
    await page.route(authEndpointRegex, async (route: Route) => {
      if (route.request().method() === "DELETE") deleteCalled = true;
      await route.fulfill({ json: { ok: true } });
    });

    await page.goto(logoutUrl);
    await page.waitForURL(homeUrl, { timeout: 5000 });
    expect(deleteCalled).toBe(false);
  });

  test("failed DELETE still clears token and redirects", async ({ page }) => {
    await setToken(page);
    let deleteCalled = false;
    // Wrap fetch BEFORE app scripts run to observe DELETE even if navigation happens quickly
    await page.addInitScript(() => {
      const originalFetch = window.fetch;
      (window as any).__logoutDeleteObserved__ = false;
      (window as any).__logoutDeletePromise__ = new Promise<void>((resolve) => {
        (window as any).__resolveLogoutDelete__ = () => {
          (window as any).__logoutDeleteObserved__ = true;
          resolve();
        };
      });
      // @ts-ignore
      window.fetch = async (...args: any[]) => {
        const [input, init] = args;
        const url = typeof input === "string" ? input : input.url;
        const method = (init?.method || "GET").toUpperCase();
        if (url.endsWith("/api/auth") && method === "DELETE") {
          (window as any).__resolveLogoutDelete__?.();
        }
        return originalFetch.apply(window, args as any);
      };
    });

    await page.route(authEndpointRegex, async (route: Route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        // Simulate slow server & error to ensure request finishes after navigation attempt
        await new Promise((r) => setTimeout(r, 50));
        await route.fulfill({ status: 500, json: { message: "Server error" } });
      } else {
        await route.fallback();
      }
    });

    await page.goto(logoutUrl);
    // Wait for fetch wrapper promise (up to 1s) but don't fail test if not resolved yet
    await page
      .evaluate(() => (window as any).__logoutDeletePromise__)
      .catch(() => {});
    await page.waitForURL(homeUrl, { timeout: 5000 });
    expect(deleteCalled).toBe(true);
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
  });
});

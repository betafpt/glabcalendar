import { test, expect } from "@playwright/test";

test.describe("Google Calendar Integration UI", () => {
  test("renders integration settings, status, controls and reconciliation rules", async ({ page }) => {
    await page.goto("/integrations/google-calendar");

    // Title & Headers
    await expect(page.locator("h1")).toContainText(/Google Calendar|Tích hợp/);

    // Sync options section
    const syncOptions = page.locator("section").filter({ hasText: /Tùy chọn đồng bộ|Sync options/ });
    await expect(syncOptions.getByText(/Tùy chọn đồng bộ|Sync options/)).toBeVisible();
    await expect(syncOptions.locator("label").filter({ hasText: /Buổi quay|Shoots/ })).toBeVisible();

    // Two-way sync controls
    await expect(page.getByText(/Đồng bộ từ Google sang G.Lab|Sync from Google to G.Lab/)).toBeVisible();
    await expect(page.getByText(/Đồng bộ từ G.Lab sang Google|Sync from G.Lab to Google/)).toBeVisible();

    // Reconciliation rule card
    await expect(page.getByText(/Quy tắc đối soát dữ liệu|Reconciliation/)).toBeVisible();
    await expect(page.locator("strong").filter({ hasText: /Nguồn chân lý|Source of Truth/ })).toBeVisible();
  });
});
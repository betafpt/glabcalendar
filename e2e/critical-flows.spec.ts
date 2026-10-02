import { test, expect } from "@playwright/test";

test.describe("Critical Production Flow E2E", () => {
  test("walks through dashboard, shoot details, calendar schedule, and resource directory", async ({
    page,
  }) => {
    // 1. Dashboard entry
    await page.goto("/");
    const mainTitle = page.getByRole("heading", { level: 1 });
    await expect(mainTitle).toBeVisible();
    await expect(mainTitle).toContainText(/(Hôm nay|Today)/i);

    // Verify today's scheduled shoot is displayed
    const todayShootCard = page.locator('a[href*="/shoots/30000000-0000-0000-0000-000000000001"]').first();
    await expect(todayShootCard).toBeVisible();
    await expect(todayShootCard).toContainText(/Lifestyle Campaign — Day 1/i);

    // 2. Click through into shoot detail
    await Promise.all([
      page.waitForURL(/\/shoots\/30000000-0000-0000-0000-000000000001/, { timeout: 15_000 }),
      todayShootCard.click(),
    ]);

    // Verify shoot detail components
    await expect(page.getByRole("heading", { name: /CHECKLIST/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lifestyle Campaign — Day 1/i })).toBeVisible();
    await expect(page.getByText(/Autumn Brand Film/i).first()).toBeVisible();

    // Verify crew assignments and equipment bookings
    await expect(page.getByText(/Minh Tran/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Sony FX3/i).filter({ visible: true }).first()).toBeVisible();

    // Verify checklist items
    await expect(page.getByText(/Charge camera batteries/i).first()).toBeVisible();
    await expect(page.getByText(/Pack lighting kit/i).first()).toBeVisible();

    // 3. Navigate to calendar
    const nav = page.getByRole("navigation", { name: "Primary" }).first();
    await nav.locator('a[href="/calendar"]').first().click();
    await expect(page).toHaveURL(/\/calendar/);

    // Check calendar view switcher
    await page.locator('a[href*="view=week"]').first().click();
    await expect(page).toHaveURL(/view=week/);

    // 4. Navigate to crew roster
    await nav.locator('a[href="/crew"]').first().click();
    await expect(page).toHaveURL(/\/crew/);
    await expect(page.getByText(/Minh Tran/i)).toBeVisible();
    await expect(page.getByText(/Linh Nguyen/i)).toBeVisible();

    // 5. Navigate to equipment inventory
    await nav.locator('a[href="/equipment"]').first().click();
    await expect(page).toHaveURL(/\/equipment/);
    await expect(page.getByText(/Sony FX3/i)).toBeVisible();
    await expect(page.getByText(/Aputure LS 600d Pro/i)).toBeVisible();

    // 6. Navigate to projects directory
    await nav.locator('a[href="/projects"]').first().click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByText(/Autumn Brand Film/i)).toBeVisible();
    await expect(page.getByText(/ROMRA Summer Menu/i)).toBeVisible();

    // 7. Return to dashboard
    await nav.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL("/");
    await expect(mainTitle).toBeVisible();
  });
});

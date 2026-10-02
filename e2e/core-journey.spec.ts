import { test, expect } from "@playwright/test";

test.describe("Core Production Journey E2E", () => {
  test("completes full end-to-end user journey across all core screens", async ({ page }) => {
    // 1. Dashboard / Today
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify navigation links exist
    await expect(page.locator('a[href="/calendar"]').first()).toBeVisible();
    await expect(page.locator('a[href="/shoots"]').first()).toBeVisible();

    // 2. Navigate to Projects list
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: /PROJECTS/i })).toBeVisible();

    // Check filter buttons/links exist
    await expect(page.getByText(/(Tất cả|All)/i).first()).toBeVisible();
    await expect(page.getByText(/(Tiền kỳ|Pre-Production)/i).first()).toBeVisible();

    // Check project cards are present
    const projectLink = page.locator('a[href*="/projects/"]').first();
    await expect(projectLink).toBeVisible();
    await projectLink.click();

    // 3. Project Detail Screen
    await expect(page).toHaveURL(/\/projects\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/(Buổi quay của dự án|Project Shoots)/i).first()).toBeVisible();

    // 4. Shoots List Screen
    await page.goto("/shoots");
    await expect(page.getByRole("heading", { name: /NEW SHOOT/i })).toBeVisible();
    await expect(page.getByText(/SHOOTS/i).first()).toBeVisible();

    // 5. Shoot Details Screen (with Crew/Equipment assignments, conflicts, checklist)
    const seededShootLink = page.locator('a[href*="/shoots/30000000-0000-0000-0000-000000000001"]').first();
    await expect(seededShootLink).toBeVisible();
    await seededShootLink.click();

    await expect(page).toHaveURL(/\/shoots\/30000000-0000-0000-0000-000000000001/);
    await expect(page.getByRole("heading", { name: /CHECKLIST/i })).toBeVisible();

    // Verify checklist items
    await expect(page.getByText(/Charge camera batteries/i).first()).toBeVisible();

    // Verify crew assignments & equipment bookings are displayed
    await expect(page.getByText(/Minh Tran/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Sony FX3/i).filter({ visible: true }).first()).toBeVisible();

    // 6. Crew Screen
    await page.goto("/crew");
    await expect(page.getByRole("heading", { name: /CREW/i })).toBeVisible();
    await expect(page.getByText(/(All|Tất cả)/i).first()).toBeVisible();

    // 7. Equipment Screen
    await page.goto("/equipment");
    await expect(page.getByRole("heading", { name: /GEAR/i })).toBeVisible();
    await expect(page.getByText(/(Cameras|Lenses|Audio)/i).first()).toBeVisible();

    // 8. Calendar Screen
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('a[aria-label="Previous period"]')).toBeVisible();
    await expect(page.locator('a[aria-label="Next period"]')).toBeVisible();

    // 9. Settings Screen (with sign out option)
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /(Cài đặt|Settings)/i })).toBeVisible();
    await expect(page.getByText(/(Đăng xuất|Sign out)/i).first()).toBeVisible();
  });
});

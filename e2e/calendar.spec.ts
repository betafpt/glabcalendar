import { test, expect } from "@playwright/test";

test.describe("Calendar Flow", () => {
  test("renders calendar page with header and period view controls", async ({ page }) => {
    await page.goto("/calendar");

    // Check main heading
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/(Tháng|Month|Tuần|Week|Ngày|Day)/i);

    // Period controls (Previous, Today, Next)
    await expect(page.locator('a[aria-label="Previous period"]')).toBeVisible();
    await expect(page.locator('a[aria-label="Next period"]')).toBeVisible();
    await expect(page.getByText(/(Hôm nay|Today)/i).first()).toBeVisible();

    // View selector controls (Tuần/Week, Tháng/Month, Dòng/Timeline)
    await expect(page.getByText(/(Tháng|Month)/i).first()).toBeVisible();
    await expect(page.getByText(/(Tuần|Week)/i).first()).toBeVisible();
  });

  test("switches between month and week calendar views", async ({ page }) => {
    // Navigate to Month view explicitly
    await page.goto("/calendar?view=month");
    await expect(page).toHaveURL(/view=month/);
    const monthHeading = page.getByRole("heading", { level: 1 });
    await expect(monthHeading).toContainText(/(Tháng|Month)/i);

    // Navigate to Week view
    await page.goto("/calendar?view=week");
    await expect(page).toHaveURL(/view=week/);
    const weekHeading = page.getByRole("heading", { level: 1 });
    await expect(weekHeading).toContainText(/(Tuần|Week)/i);

    // Verify day columns or headers in week view (MON, TUE, WED, etc. or T2, T3, T4...)
    await expect(page.getByText(/(MON|T2)/i).first()).toBeVisible();
  });

  test("displays scheduled shoots in calendar view and navigates to shoot detail", async ({ page }) => {
    await page.goto("/calendar?view=month");

    // Seeded shoots should appear in the calendar view
    const shootEvent = page.locator('a[href*="/shoots/"]').filter({
      hasText: /Lifestyle Campaign/i,
    }).first();

    await expect(shootEvent).toBeVisible();
    await shootEvent.click();

    // Should navigate to shoot detail page
    await expect(page).toHaveURL(/\/shoots\//);
    await expect(page.getByRole("heading", { name: /CHECKLIST/i })).toBeVisible();
  });

  test("allows navigating between previous and next calendar periods", async ({ page }) => {
    await page.goto("/calendar?view=month");

    const prevBtn = page.locator('a[aria-label="Previous period"]');
    await expect(prevBtn).toBeVisible();
    const prevHref = await prevBtn.getAttribute("href");
    expect(prevHref).toContain("date=");

    const nextBtn = page.locator('a[aria-label="Next period"]');
    await expect(nextBtn).toBeVisible();
    const nextHref = await nextBtn.getAttribute("href");
    expect(nextHref).toContain("date=");
  });
});

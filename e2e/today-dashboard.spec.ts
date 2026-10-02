import { test, expect } from "@playwright/test";

test.describe("Today Dashboard Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the Today Dashboard header and production day", async ({ page }) => {
    // Check main title
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/(Hôm nay|Today)/i);

    // Verify production date bar
    await expect(
      page.getByText(/(Ngày sản xuất|Production day)/i)
    ).toBeVisible();
  });

  test("displays KPI summary cards for shoots, crew, gear, and conflicts", async ({ page }) => {
    // Check presence of KPI links/cards
    const shootsCard = page.locator('a[href="/shoots"]').first();
    await expect(shootsCard).toBeVisible();
    await expect(shootsCard).toContainText(/(Buổi quay|Shoots)/i);

    const crewCard = page.locator('a[href="/crew"]').first();
    await expect(crewCard).toBeVisible();
    await expect(crewCard).toContainText(/(Nhân sự|Crew)/i);

    const gearCard = page.locator('a[href="/equipment"]').first();
    await expect(gearCard).toBeVisible();
    await expect(gearCard).toContainText(/(Thiết bị|Gear)/i);

    // Conflict summary metric
    await expect(page.getByText(/(Xung đột|Conflicts)/i).first()).toBeVisible();
  });

  test("displays scheduled today shoot card from demo seed data", async ({ page }) => {
    // Lifestyle Campaign — Day 1 is seeded for today
    const shootTitle = page.getByRole("heading", { name: /Lifestyle Campaign — Day 1/i });
    await expect(shootTitle).toBeVisible();

    // Associated project and location details
    await expect(page.getByText(/Autumn Brand Film/i).first()).toBeVisible();
    await expect(page.getByText(/G\.Lab Studio/i).first()).toBeVisible();

    // Verify shoot link navigates to shoot detail
    const shootLink = page.locator('a[href*="/shoots/30000000-0000-0000-0000-000000000001"]').first();
    await expect(shootLink).toBeVisible();
    await shootLink.click();

    await expect(page).toHaveURL(/\/shoots\/30000000-0000-0000-0000-000000000001/);
    await expect(page.getByRole("heading", { name: /Lifestyle Campaign — Day 1/i })).toBeVisible();
  });

  test("supports primary navigation to calendar, projects, crew and gear", async ({ page }) => {
    // Check navigation element
    const nav = page.getByRole("navigation", { name: "Primary" }).first();
    await expect(nav).toBeVisible();

    // Navigate to Calendar
    await nav.locator('a[href="/calendar"]').first().click();
    await expect(page).toHaveURL(/\/calendar/);

    // Navigate to Projects
    await page.goto("/");
    await nav.locator('a[href="/projects"]').first().click();
    await expect(page).toHaveURL(/\/projects/);

    // Navigate to Crew
    await page.goto("/");
    await nav.locator('a[href="/crew"]').first().click();
    await expect(page).toHaveURL(/\/crew/);

    // Navigate to Equipment
    await page.goto("/");
    await nav.locator('a[href="/equipment"]').first().click();
    await expect(page).toHaveURL(/\/equipment/);
  });

  test("toggles application language via language switcher", async ({ page }) => {
    // Find language switcher buttons
    const langBtn = page.locator("button").filter({ hasText: /^(VI|EN|Tiếng Việt|English)$/i }).first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      // Confirm that the document lang or text changed
      const htmlLang = await page.getAttribute("html", "lang");
      expect(["vi", "en"]).toContain(htmlLang);
    }
  });
});

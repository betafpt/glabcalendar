import { test, expect } from "@playwright/test";

test.describe("Resources and Projects Directory Flows", () => {
  test("displays projects list with clients and status badges", async ({ page }) => {
    await page.goto("/projects");

    // Check header
    await expect(page.getByRole("heading", { name: /PROJECTS/i })).toBeVisible();

    // Verify seeded projects and their clients
    await expect(page.getByText(/Autumn Brand Film/i)).toBeVisible();
    await expect(page.getByText(/Maison Studio/i).first()).toBeVisible();

    await expect(page.getByText(/ROMRA Summer Menu/i)).toBeVisible();
    await expect(page.getByText(/ROMRA Coffee/i).first()).toBeVisible();

    await expect(page.getByText(/Aura Editorial/i)).toBeVisible();
    await expect(page.getByText(/Aura Magazine/i).first()).toBeVisible();

    await expect(page.getByText(/Hoi An Makers/i)).toBeVisible();
    await expect(page.getByText(/G\.Lab Originals/i).first()).toBeVisible();
  });

  test("displays crew directory with roles and status filter tabs", async ({ page }) => {
    await page.goto("/crew");

    // Check header
    await expect(page.getByRole("heading", { name: /CREW/i })).toBeVisible();

    // Verify filter pills
    await expect(page.getByText(/All/i).first()).toBeVisible();
    await expect(page.getByText(/Available/i).first()).toBeVisible();

    // Verify seeded crew members and their roles
    await expect(page.getByText(/Minh Tran/i)).toBeVisible();
    await expect(page.getByText(/DOP/i).first()).toBeVisible();

    await expect(page.getByText(/Linh Nguyen/i)).toBeVisible();
    await expect(page.getByText(/Photographer/i).first()).toBeVisible();

    await expect(page.getByText(/Mai Anh/i)).toBeVisible();
    await expect(page.getByText(/Producer/i).first()).toBeVisible();

    await expect(page.getByText(/Quang Le/i)).toBeVisible();
    await expect(page.getByText(/Gaffer/i).first()).toBeVisible();

    await expect(page.getByText(/Bao Pham/i)).toBeVisible();
    await expect(page.getByText(/Sound Recordist/i).first()).toBeVisible();

    // Add crew button
    await expect(page.locator('summary[aria-label="Add crew"]')).toBeVisible();
  });

  test("displays equipment inventory categorized by department", async ({ page }) => {
    await page.goto("/equipment");

    // Check header
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verify gear items and codes
    await expect(page.getByText(/Sony FX3/i)).toBeVisible();

    await expect(page.getByText(/Aputure LS 600d Pro/i)).toBeVisible();

    await expect(page.getByText(/Sony FX6/i)).toBeVisible();
    await expect(page.getByText(/Sony 24-70mm GM II/i)).toBeVisible();
    await expect(page.getByText(/DJI Mic 2/i)).toBeVisible();
    await expect(page.getByText(/Sachtler Flowtech 75/i)).toBeVisible();

    // Verify categories
    await expect(page.getByRole("heading", { name: /^Cameras$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Lighting$/i })).toBeVisible();
  });
});

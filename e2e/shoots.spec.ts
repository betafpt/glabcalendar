import { test, expect } from "@playwright/test";

test.describe("Shoots Flow", () => {
  test("displays shoot creation form and upcoming shoots list", async ({ page }) => {
    await page.goto("/shoots");

    // Verify page header
    await expect(page.getByRole("heading", { name: /NEW SHOOT/i })).toBeVisible();

    // Verify shoot creation form fields are accessible
    const titleInput = page.locator("#title");
    await expect(titleInput).toBeVisible();
    await expect(page.locator("#projectId")).toBeVisible();
    await expect(page.locator("#status")).toBeVisible();
    await expect(page.locator("#startsAt")).toBeVisible();
    await expect(page.locator("#endsAt")).toBeVisible();
    await expect(page.locator("#locationName")).toBeVisible();

    // Verify upcoming shoots list is populated with seeded shoots
    await expect(page.getByText(/Lifestyle Campaign — Day 1/i)).toBeVisible();
    await expect(page.getByText(/Lifestyle Campaign — Day 2/i)).toBeVisible();
    await expect(page.getByText(/ROMRA Drinks — Product Day/i)).toBeVisible();
  });

  test("navigates from shoots list to shoot details page", async ({ page }) => {
    await page.goto("/shoots");

    // Click on the first shoot (Lifestyle Campaign — Day 1)
    const shootLink = page.locator('a[href*="/shoots/30000000-0000-0000-0000-000000000001"]').first();
    await expect(shootLink).toBeVisible();
    await shootLink.click();

    // Verify navigation and shoot details
    await expect(page).toHaveURL(/\/shoots\/30000000-0000-0000-0000-000000000001/);
    await expect(page.getByRole("heading", { name: /Lifestyle Campaign — Day 1/i })).toBeVisible();
    await expect(page.getByText(/Autumn Brand Film/i).first()).toBeVisible();
    await expect(page.getByText(/G\.Lab Studio/i).first()).toBeVisible();
  });

  test("displays checklist items and production readiness summary", async ({ page }) => {
    await page.goto("/shoots/30000000-0000-0000-0000-000000000001");

    // Verify readiness / checklist header
    await expect(page.getByRole("heading", { name: /CHECKLIST/i })).toBeVisible();

    // Verify seeded checklist items
    await expect(page.getByText(/Charge camera batteries/i).first()).toBeVisible();
    await expect(page.getByText(/Pack lighting kit/i).first()).toBeVisible();
    await expect(page.getByText(/Confirm client call sheet/i).first()).toBeVisible();
    await expect(page.getByText(/Format media cards/i).first()).toBeVisible();

    // Verify add checklist item form
    const addItemInput = page.locator("#checklist-title");
    await expect(addItemInput).toBeVisible();
  });

  test("displays assigned crew and booked equipment", async ({ page }) => {
    await page.goto("/shoots/30000000-0000-0000-0000-000000000001");

    // Verify crew members assigned to this shoot
    await expect(page.getByText(/Minh Tran/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Linh Nguyen/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Mai Anh/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Quang Le/i).filter({ visible: true }).first()).toBeVisible();

    // Verify equipment booked for this shoot
    await expect(page.getByText(/Sony FX3/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Aputure LS 600d Pro/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Sony 24-70mm GM II/i).filter({ visible: true }).first()).toBeVisible();
  });

  test("displays shoot edit form with prefilled values", async ({ page }) => {
    await page.goto("/shoots/30000000-0000-0000-0000-000000000001");

    // Verify edit form
    const editTitle = page.locator("#edit-title");
    await expect(editTitle).toBeVisible();
    await expect(editTitle).toHaveValue("Lifestyle Campaign — Day 1");

    const editStatus = page.locator("#edit-status");
    await expect(editStatus).toBeVisible();
    await expect(editStatus).toHaveValue("confirmed");
  });
});

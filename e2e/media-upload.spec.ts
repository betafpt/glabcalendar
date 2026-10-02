import { expect, test, type Locator } from "@playwright/test";

const pixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZrF8AAAAASUVORK5CYII=",
  "base64"
);

async function setImage(fileInput: Locator) {
  await fileInput.setInputFiles({
    name: "qa-upload.png",
    mimeType: "image/png",
    buffer: pixelPng,
  });
}

test.describe("Media upload persistence", () => {
  test("crew avatar can be uploaded, persisted, then removed", async ({ page }) => {
    await page.goto("/crew/40000000-0000-0000-0000-000000000005");
    await page.locator("details").last().locator("summary").click();

    const form = page.locator('form:has(input[name="avatarDataUrl"])');
    await setImage(form.locator('input[type="file"]'));
    await expect(form.locator('input[name="avatarDataUrl"]')).toHaveValue(/^data:image\/webp;base64,/);
    const save = form.locator('button[type="submit"]');
    await save.click();
    await expect(save).toBeEnabled();

    await page.reload();
    await expect(page.locator('img[alt^="Avatar "]')).toBeVisible();

    await page.locator("details").last().locator("summary").click();
    const removeForm = page.locator('form:has(input[name="avatarDataUrl"])');
    await removeForm.getByRole("button", { name: /Xóa ảnh|Remove image/i }).click();
    const removeSave = removeForm.locator('button[type="submit"]');
    await removeSave.click();
    await expect(removeSave).toBeEnabled();

    await page.reload();
    await expect(page.locator('img[alt^="Avatar "]')).toHaveCount(0);
  });

  test("equipment image can be uploaded, persisted, then removed", async ({ page }) => {
    await page.goto("/equipment/50000000-0000-0000-0000-000000000008");
    await page.getByLabel("Gear actions").click();

    const form = page.locator('form:has(input[name="imageDataUrl"])');
    await setImage(form.locator('input[type="file"]'));
    await expect(form.locator('input[name="imageDataUrl"]')).toHaveValue(/^data:image\/webp;base64,/);
    const save = form.locator('button[type="submit"]');
    await save.click();
    await expect(save).toBeEnabled();

    await page.reload();
    await expect(page.locator('section img[alt="Aputure LS 300x"]')).toBeVisible();

    await page.getByLabel("Gear actions").click();
    const removeForm = page.locator('form:has(input[name="imageDataUrl"])');
    await removeForm.getByRole("button", { name: /Xóa ảnh|Remove image/i }).click();
    const removeSave = removeForm.locator('button[type="submit"]');
    await removeSave.click();
    await expect(removeSave).toBeEnabled();

    await page.reload();
    await expect(page.locator('section img[alt="Aputure LS 300x"]')).toHaveCount(0);
  });
});

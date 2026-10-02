import { expect, test } from "@playwright/test";

const routes = ["/", "/calendar", "/projects", "/shoots", "/crew", "/equipment", "/settings"];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test.describe(`Responsive smoke - ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route} renders without overflow or runtime errors`, async ({ page }) => {
        const runtimeErrors: string[] = [];
        const consoleErrors: string[] = [];

        page.on("pageerror", (error) => runtimeErrors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });

        await page.goto(route);
        await expect(page.locator("body")).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

        const overflow = await page.evaluate(() =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        );

        expect(overflow, `horizontal overflow on ${route} at ${viewport.width}px`).toBeLessThanOrEqual(2);
        expect(runtimeErrors, `page errors on ${route}`).toEqual([]);
        expect(consoleErrors, `console errors on ${route}`).toEqual([]);
      });
    }
  });
}

test.describe("Project detail narrow viewport", () => {
  test.use({ viewport: { width: 430, height: 932 } });

  test("does not overflow horizontally", async ({ page }) => {
    await page.goto("/projects");
    const firstProject = page.locator('a[href^="/projects/"]').first();
    await expect(firstProject).toBeVisible();
    await firstProject.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});

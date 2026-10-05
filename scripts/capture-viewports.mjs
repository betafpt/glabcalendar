import { chromium } from "@playwright/test";

const viewports = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "2560x1440", width: 2560, height: 1440 },
  { name: "3840x2160", width: 3840, height: 2160 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. Authenticate
    await page.goto("http://localhost:3000/api/dev-login?email=betafpt@gmail.com");
    await context.addCookies([
      {
        name: "glab_active_workspace_id",
        value: "10000000-0000-0000-0000-000000000001",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.waitForTimeout(400);

    // 2. Set Vietnamese locale and navigate to Calendar
    await page.goto("http://localhost:3000/calendar");
    await page.evaluate(() => localStorage.setItem("glab-calendar-locale", "vi"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // 3. Inspect layout
    const metrics = await page.evaluate((vpInfo) => {
      const container = document.querySelector(".app-shell-container");
      const aside = document.querySelector("aside");
      const contextPanel = document.querySelector(".lg\\:calendar-workspace-grid > div:first-child");
      const mainCalendar = document.querySelector("section.calendar-min-h");
      const activeViewBtn = Array.from(document.querySelectorAll("header button")).find(b => b.className.includes("bg-ink"));
      const dayColumns = Array.from(document.querySelectorAll(".grid-cols-\\[70px_repeat\\(7\\,minmax\\(0\\,1fr\\)\\] > div:not(:first-child)"));

      const containerStyle = container ? window.getComputedStyle(container) : null;
      const asideRect = aside ? aside.getBoundingClientRect() : null;
      const contextRect = contextPanel ? contextPanel.getBoundingClientRect() : null;
      const mainRect = mainCalendar ? mainCalendar.getBoundingClientRect() : null;

      let railToContextGap = null;
      if (asideRect && contextRect) {
        railToContextGap = Math.round(contextRect.left - asideRect.right);
      }

      let contextToMainGap = null;
      if (contextRect && mainRect) {
        contextToMainGap = Math.round(mainRect.left - contextRect.right);
      }

      return {
        viewport: `${vpInfo.width}x${vpInfo.height}`,
        containerPaddingInline: containerStyle ? `${containerStyle.paddingLeft} / ${containerStyle.paddingRight}` : null,
        activeView: activeViewBtn ? activeViewBtn.textContent?.trim() : "unknown",
        railWidth: asideRect ? Math.round(asideRect.width) : null,
        railToContextGap,
        contextWidth: contextRect ? Math.round(contextRect.width) : null,
        contextToMainGap,
        mainCalendarWidth: mainRect ? Math.round(mainRect.width) : null,
        mainCalendarHeight: mainRect ? Math.round(mainRect.height) : null,
        calendarMinHeightExpected: vpInfo.height - 140,
        dayColumnWidth: dayColumns.length > 0 ? Math.round(dayColumns[0].getBoundingClientRect().width) : null,
        hasCurrentTimeIndicator: Boolean(document.querySelector(".shadow-\\[0_0_8px_rgba\\(255\\,79\\,154\\,0\\.8\\)\\]")),
      };
    }, vp);

    console.log("Metrics:", JSON.stringify(metrics, null, 2));
    results.push(metrics);

    const artifactPath = `C:/Users/Giang Nguyen/.gemini/antigravity-ide/brain/d2460330-9180-4454-a360-d4d14f8db43b/calendar_viewport_${vp.name}.png`;
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log(`Saved screenshot: ${artifactPath}`);

    await context.close();
  }

  await browser.close();
  console.log("\n=== ALL VIEWPORT TESTS COMPLETE ===");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

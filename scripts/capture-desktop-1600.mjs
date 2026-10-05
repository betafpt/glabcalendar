import { chromium } from "@playwright/test";
import path from "path";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 950 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log("1. Authenticating via dev-login...");
  await page.goto("http://localhost:3000/api/dev-login?email=betafpt@gmail.com");
  await context.addCookies([
    {
      name: "glab_active_workspace_id",
      value: "10000000-0000-0000-0000-000000000001",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.waitForTimeout(500);

  console.log("2. Navigating to /calendar...");
  await page.goto("http://localhost:3000/calendar");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  console.log("3. Inspecting layout dimensions...");
  const metrics = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    const contextPanel = document.querySelector("aside + div div aside") || document.querySelector("div[class*='w-[355px]']");
    const mainCalendar = document.querySelector("section[class*='rounded-[24px]']");
    const activeViewBtn = Array.from(document.querySelectorAll("header button")).find(b => b.className.includes("bg-ink"));
    const miniCalendar = document.querySelector("div[class*='w-full rounded-[24px]']");
    const todayCard = document.querySelectorAll("div[class*='w-full rounded-[20px]']")[0];
    const attentionCard = document.querySelectorAll("div[class*='w-full rounded-[20px]']")[1];

    const asideRect = aside ? aside.getBoundingClientRect() : null;
    const contextRect = contextPanel ? contextPanel.getBoundingClientRect() : null;
    const mainRect = mainCalendar ? mainCalendar.getBoundingClientRect() : null;
    const miniRect = miniCalendar ? miniCalendar.getBoundingClientRect() : null;
    const todayRect = todayCard ? todayCard.getBoundingClientRect() : null;
    const attentionRect = attentionCard ? attentionCard.getBoundingClientRect() : null;

    let railToContextGap = null;
    if (asideRect && contextRect) {
      railToContextGap = Math.round(contextRect.left - asideRect.right);
    }

    let contextToMainGap = null;
    if (contextRect && mainRect) {
      contextToMainGap = Math.round(mainRect.left - contextRect.right);
    }

    return {
      activeView: activeViewBtn ? activeViewBtn.textContent?.trim() : "unknown",
      railWidth: asideRect ? Math.round(asideRect.width) : null,
      railToContextGap,
      contextWidth: contextRect ? Math.round(contextRect.width) : null,
      contextToMainGap,
      mainCalendarWidth: mainRect ? Math.round(mainRect.width) : null,
      miniCalendarSize: miniRect ? `${Math.round(miniRect.width)}px x ${Math.round(miniRect.height)}px` : null,
      todayCardHeight: todayRect ? `${Math.round(todayRect.height)}px` : null,
      attentionCardHeight: attentionRect ? `${Math.round(attentionRect.height)}px` : null,
      hasTimeGrid: Boolean(document.querySelector(".grid-cols-\\[70px_repeat\\(7\\,minmax\\(0\\,1fr\\)\\]")),
      hasCurrentTimeIndicator: Boolean(document.querySelector(".shadow-\\[0_0_8px_rgba\\(255\\,79\\,154\\,0\\.8\\)\\]")),
    };
  });

  console.log("Layout Verification Metrics:", JSON.stringify(metrics, null, 2));

  const artifactPath = "C:/Users/Giang Nguyen/.gemini/antigravity-ide/brain/d2460330-9180-4454-a360-d4d14f8db43b/desktop_1600_blueprint.png";
  await page.screenshot({ path: artifactPath, fullPage: false });
  console.log("Screenshot saved to:", artifactPath);

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

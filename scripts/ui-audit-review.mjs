import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("qa-browser/ui-review");
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const routes = [
  { path: "/", name: "today" },
  { path: "/calendar", name: "calendar" },
  { path: "/projects", name: "projects" },
  { path: "/shoots", name: "shoots" },
  { path: "/crew", name: "crew" },
  { path: "/equipment", name: "equipment" },
  { path: "/clients", name: "clients" },
  { path: "/settings", name: "settings" },
  { path: "/integrations/google-calendar", name: "integrations" },
  { path: "/ai", name: "ai" }
];

const report = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile || false,
    hasTouch: vp.hasTouch || false,
  });
  const page = await context.newPage();

  for (const r of routes) {
    const url = `http://localhost:3011${r.path}`;
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 10000 }).catch(async () => {
        return await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      });

      await page.waitForTimeout(500);

      const shotPath = path.join(outDir, `${vp.name}-${r.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      const metrics = await page.evaluate(() => {
        const bodyStyle = window.getComputedStyle(document.body);
        const h1 = document.querySelector("h1");
        const h1Style = h1 ? window.getComputedStyle(h1) : null;

        const cards = Array.from(document.querySelectorAll(".card, [class*='rounded-'], [class*='bg-white'], [class*='bg-neutral'], article, section")).slice(0, 10);
        const cardStyles = cards.map(c => {
          const s = window.getComputedStyle(c);
          return {
            tag: c.tagName,
            bg: s.backgroundColor,
            radius: s.borderRadius,
            padding: s.padding,
            border: s.border
          };
        });

        const nav = document.querySelector("nav");
        const navStyle = nav ? window.getComputedStyle(nav) : null;

        return {
          title: document.title,
          h1Text: h1 ? h1.innerText.trim() : null,
          h1Font: h1Style ? {
            family: h1Style.fontFamily,
            size: h1Style.fontSize,
            weight: h1Style.fontWeight,
            textTransform: h1Style.textTransform,
            letterSpacing: h1Style.letterSpacing,
            color: h1Style.color
          } : null,
          bodyBg: bodyStyle.backgroundColor,
          bodyColor: bodyStyle.color,
          hasBottomNav: !!document.querySelector("[data-bottom-nav], nav.fixed, nav.bottom-0"),
          hasSidebar: !!document.querySelector("aside, [data-sidebar]"),
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          sampleCards: cardStyles.slice(0, 5)
        };
      });

      report.push({
        viewport: vp.name,
        route: r.path,
        name: r.name,
        screenshot: shotPath,
        status: resp?.status() || 200,
        metrics
      });
    } catch (err) {
      report.push({
        viewport: vp.name,
        route: r.path,
        name: r.name,
        error: err.message
      });
    }
  }
  await context.close();
}

await fs.writeFile(path.join(outDir, "audit-summary.json"), JSON.stringify(report, null, 2), "utf8");
console.log("Audit completed successfully. Total runs:", report.length);
await browser.close();

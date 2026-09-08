import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.SHIP_IT_BROWSER
    ? { executablePath: process.env.SHIP_IT_BROWSER }
    : {}),
});
const page = await browser.newPage({
  viewport: { width: 1512, height: 982 },
  deviceScaleFactor: 1,
});
await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:5173");
await page.locator(".instant-input").focus();
await page.locator(".monaco-editor").first().waitFor({ timeout: 60000 });
await page.screenshot({
  path: "artifacts/workspace-desktop.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Toggle color theme" }).click();
await page.screenshot({
  path: "artifacts/workspace-light.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Toggle color theme" }).click();
await page.getByRole("button", { name: "Sprint board", exact: true }).click();
await page.screenshot({ path: "artifacts/sprint-board.png", fullPage: true });
await page.getByRole("button", { name: "Growth plan", exact: true }).click();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "artifacts/growth-desktop.png", fullPage: true });
await page.locator(".nav-item").first().click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "artifacts/workspace-mobile.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Your growth plan", exact: true }).click();
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "artifacts/growth-mobile.png", fullPage: true });
console.log(JSON.stringify({ screenshots: 6, pageErrors: errors }, null, 2));
await browser.close();

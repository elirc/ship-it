import { chromium } from "playwright";
import { createServer } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";

// Optional audit: install lighthouse locally, or supply its core/index.js file URL.
const entry =
  process.env.SHIP_IT_LIGHTHOUSE ?? import.meta.resolve("lighthouse");
const [{ default: lighthouse }, { default: desktopConfig }] = await Promise.all(
  [import(entry), import(new URL("./config/desktop-config.js", entry).href)],
);
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const browser = await chromium.launch({
  headless: true,
  args: [`--remote-debugging-port=${port}`],
  ...(process.env.SHIP_IT_BROWSER
    ? { executablePath: process.env.SHIP_IT_BROWSER }
    : {}),
});
try {
  const report = await lighthouse(
    "http://127.0.0.1:4173",
    {
      port,
      logLevel: "silent",
      output: "json",
      onlyCategories: ["performance", "accessibility"],
    },
    desktopConfig,
  );
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/lighthouse.json", report.report);
  console.log(
    JSON.stringify(
      {
        performance: report.lhr.categories.performance.score * 100,
        accessibility: report.lhr.categories.accessibility.score * 100,
        fcp: report.lhr.audits["first-contentful-paint"].displayValue,
        lcp: report.lhr.audits["largest-contentful-paint"].displayValue,
        tbt: report.lhr.audits["total-blocking-time"].displayValue,
        cls: report.lhr.audits["cumulative-layout-shift"].displayValue,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

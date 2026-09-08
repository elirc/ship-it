import { chromium } from "playwright";
import { ticketById } from "../src/content/curriculum";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.SHIP_IT_BROWSER
    ? { executablePath: process.env.SHIP_IT_BROWSER }
    : {}),
});
console.log("Browser launched");
const page = await browser.newPage({ viewport: { width: 1512, height: 982 } });
page.on("pageerror", (error) => console.error("PAGE ERROR", error.message));
page.on("console", (message) => {
  if (message.type() === "error")
    console.error("BROWSER", message.text().slice(0, 700));
});
await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
console.log("Page loaded");
for (const id of ["TF-001", "TF-031"]) {
  const result = await page.evaluate(async (ticket) => {
    const modulePath = "/src/runner/client.ts";
    const { runTicket } = await import(modulePath);
    return await runTicket(ticket, ticket.solutionFiles).promise;
  }, ticketById[id]);
  console.log(id, JSON.stringify(result));
}
await browser.close();

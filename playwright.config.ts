import { defineConfig } from "@playwright/test";
const port = Number(process.env.SHIP_IT_TEST_PORT ?? 5175);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid browser test port");
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    launchOptions: process.env.SHIP_IT_BROWSER
      ? { executablePath: process.env.SHIP_IT_BROWSER }
      : {},
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});

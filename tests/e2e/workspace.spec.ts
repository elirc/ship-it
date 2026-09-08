import { test, expect } from "@playwright/test";
import { seededTickets, ticketById } from "../../src/content/curriculum";
import type { RunResult } from "../../src/types";

test("preserves typing and selection when the editor upgrades to Monaco", async ({
  page,
}) => {
  await page.route("**/src/components/CodeEditor.tsx*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.goto("/");
  await page.locator(".instant-input").fill("// typed while loading");
  await expect(page.locator(".instant-input")).toHaveCount(0, {
    timeout: 30000,
  });
  await page.waitForFunction(() =>
    Boolean(document.activeElement?.closest(".monaco-editor")),
  );
  await page.keyboard.type(" and after");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("ship-it.progress.v1")!).state.code[
        "TF-001"
      ]["src/tasks.js"] === "// typed while loading and after",
  );
  await page.keyboard.press("Control+Enter");
  await expect(page.locator(".test-failed")).not.toHaveCount(0, {
    timeout: 30000,
  });
  const attempts = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("ship-it.progress.v1")!).state.progress[
        "TF-001"
      ].attempts as number,
  );
  expect(attempts).toBe(1);
});

test("formats and saves code in a worker", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const modulePath = "/src/store.ts";
    const { useStore } = await import(modulePath);
    useStore
      .getState()
      .saveCode(
        "TF-001",
        "src/tasks.js",
        "export const greeting={title:'Ship it',done:false};",
      );
  });
  await page.getByRole("button", { name: /^Format/ }).click();
  await expect(page.locator(".toast")).toContainText("Formatted and saved.", {
    timeout: 30000,
  });
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("ship-it.progress.v1")!).state.code[
        "TF-001"
      ]["src/tasks.js"] as string,
  );
  expect(saved).toContain('title: "Ship it"');
  expect(saved).toContain("done: false");
});

test("workspace loads, fails usefully, passes, reviews, and persists", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Give a task its first breath" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Run tests", exact: false })
    .first()
    .click();
  await expect(page.locator(".test-failed")).not.toHaveCount(0, {
    timeout: 30000,
  });
  await page.evaluate(
    async ({ solution }) => {
      const modulePath = "/src/store.ts";
      const { useStore } = await import(modulePath);
      useStore.getState().saveCode("TF-001", "src/tasks.js", solution);
    },
    { solution: ticketById["TF-001"].solutionFiles["src/tasks.js"] },
  );
  await page
    .getByRole("button", { name: "Run tests", exact: false })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByText("Shipped. Now, a second perspective."),
  ).toBeVisible();
  await page.getByRole("button", { name: "My version is fine" }).click();
  await expect(page.locator(".xp-counter")).toContainText("100");
  await page.reload();
  await expect(page.locator(".xp-counter")).toContainText("100");
});
test("every reference runs in the actual browser sandbox", async ({ page }) => {
  test.setTimeout(240000);
  await page.goto("/");
  for (const ticket of seededTickets) {
    const result: RunResult = await page.evaluate(async (t) => {
      const modulePath = "/src/runner/client.ts";
      const { runTicket } = await import(modulePath);
      return await runTicket(t, t.solutionFiles).promise;
    }, ticket);
    expect(result.error, `${ticket.id} error`).toBeUndefined();
    expect(result.results.length, ticket.id).toBe(ticket.testNames!.length);
    expect(
      result.results.filter((r) => !r.passed),
      ticket.id,
    ).toEqual([]);
  }
});
test("worker timeout, cancellation, and network denial keep the host usable", async ({
  page,
}) => {
  await page.goto("/");
  const results = await page.evaluate(async (ticket) => {
    const modulePath = "/src/runner/client.ts";
    const { runTicket } = await import(modulePath);
    const timeout = await runTicket(
      { ...ticket, tests: "test('loop',()=>subject.loop());" },
      { "src/tasks.js": "export function loop(){while(true){}}" },
    ).promise;
    const network = await runTicket(
      {
        ...ticket,
        tests:
          "test('network',async()=>{await expect(()=>subject.request()).toReject('disabled');});",
      },
      {
        "src/tasks.js":
          'export async function request(){return fetch("https://example.com");}',
      },
    ).promise;
    const pending = runTicket(ticket, ticket.solutionFiles);
    pending.cancel();
    return { timeout, network, cancel: await pending.promise };
  }, ticketById["TF-001"]);
  expect(JSON.stringify(results.timeout)).toMatch(/timed out/);
  expect(results.network.results[0].passed).toBe(true);
  expect(results.cancel.error).toContain("cancelled");
  await expect(
    page.getByRole("heading", { name: "Give a task its first breath" }),
  ).toBeVisible();
});
test("mobile panels, command palette, board, and light mode work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "editor", exact: true }).click();
  await expect(page.locator(".editor-panel")).toBeVisible();
  await page.getByRole("tab", { name: "results", exact: true }).click();
  await expect(page.locator(".runner-panel")).toBeVisible();
  await page.getByRole("button", { name: "Jump to anything" }).click();
  await page.getByRole("combobox").fill("TF-031");
  await page.getByRole("combobox").press("Enter");
  await page.getByRole("tab", { name: "ticket", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your first piece of the interface" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Skills map", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Skills, earned in the code." }),
  ).toBeVisible();
});
test("CSP blocks dynamic imports and iframe access to the host document", async ({
  page,
}) => {
  await page.goto("/");
  const blocked: string[] = [],
    responses: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.url().startsWith("https://example.com"))
      blocked.push(request.failure()?.errorText ?? "unknown failure");
  });
  page.on("response", (response) => {
    if (response.url().startsWith("https://example.com"))
      responses.push(response.url());
  });
  const outcomes: { worker: RunResult; dom: RunResult } = await page.evaluate(
    async (ticket) => {
      const modulePath = "/src/runner/client.ts";
      const { runTicket } = await import(modulePath);
      const worker = await runTicket(
        {
          ...ticket,
          tests:
            "test('dynamic import denied', async()=>{await expect(()=>subject.request()).toReject();});",
        },
        {
          "src/tasks.js":
            'export async function request(){return new Function("return import(\\"https://example.com/probe.js\\")")();}',
        },
      ).promise;
      const dom = await runTicket(
        {
          ...ticket,
          runtime: "dom",
          tests:
            "test('host origin denied',()=>expect(()=>subject.host()).toThrow());",
        },
        {
          "src/tasks.js":
            "export function host(){return parent.document.body;}",
        },
      ).promise;
      return { worker, dom };
    },
    ticketById["TF-001"],
  );
  expect(outcomes.worker.results[0]?.passed).toBe(true);
  expect(outcomes.dom.results[0]?.passed).toBe(true);
  expect(blocked).toHaveLength(1);
  expect(blocked[0]).toMatch(/^(csp|net::ERR_BLOCKED_BY_CSP)$/);
  expect(responses).toEqual([]);
});

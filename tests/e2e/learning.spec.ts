import { test, expect } from "@playwright/test";
import { ticketById } from "../../src/content/curriculum";
const ticket = ticketById["TF-001"];

test("growth plan opens real engineering practice on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Your growth plan" }).click();
  await expect(
    page.getByRole("heading", {
      name: "From following steps to owning outcomes.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open lab", exact: true }),
  ).toHaveCount(6);
  await page
    .getByRole("button", { name: "Open lab", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Debug the edit that changes two screens",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.locator(".test-failed")).not.toHaveCount(0, {
    timeout: 30000,
  });
  await page.getByText("Plan before coding", { exact: true }).click();
  await page
    .getByLabel("Predict one failure", { exact: true })
    .fill("The array copy still refers to the original task.");
  await page.reload();
  await page.getByText("Plan before coding", { exact: true }).click();
  await expect(
    page.getByLabel("Predict one failure", { exact: true }),
  ).toHaveValue("The array copy still refers to the original task.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Your growth plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Engineering labs" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/growth-mobile.png",
    fullPage: true,
  });
});

test("review saves reasoning before revealing the reference and exports evidence", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.evaluate(async (t) => {
    const modulePath = "/src/store.ts";
    const { useStore } = await import(modulePath);
    for (const [file, code] of Object.entries(t.solutionFiles))
      useStore.getState().saveCode(t.id, file, code);
  }, ticket);
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".review-editor")).toHaveCount(0);
  await page
    .getByLabel("Explain your approach", { exact: true })
    .fill("Validate before calling trim so null cannot reach a string method.");
  await page
    .getByLabel("Show test evidence", { exact: true })
    .fill("Null throws; a padded title returns trimmed text.");
  await page
    .getByLabel("Defend a trade-off", { exact: true })
    .fill(
      "Duplicate IDs belong to the repository because this function has no existing-task context.",
    );
  await page
    .getByRole("button", { name: "Compare with a reference approach" })
    .click();
  await expect(page.locator(".review-editor .monaco-diff-editor")).toBeVisible({
    timeout: 45000,
  });
  await page.getByRole("button", { name: "My version is fine" }).click();
  await page.getByRole("button", { name: "Your growth plan" }).click();
  await expect(
    page.locator(".growth-metrics > div").nth(1).locator("strong"),
  ).toHaveText("1");
  await page
    .getByText("Write a decision another engineer can challenge", {
      exact: true,
    })
    .click();
  await page
    .locator("#field-design")
    .fill(
      "Compared version checks with last-write-wins. Peer review asked for a conflict recovery flow.",
    );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  expect((await download).suggestedFilename()).toBe(
    "my-engineering-evidence.md",
  );
  await page.reload();
  await page
    .getByText("Write a decision another engineer can challenge", {
      exact: true,
    })
    .click();
  await expect(page.locator("#field-design")).toHaveValue(/Peer review/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/growth-desktop.png",
    fullPage: true,
  });
});

test("due recall survives reload, verifies real code, and preserves the original draft", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async (t) => {
    const modulePath = "/src/store.ts";
    const { useStore } = await import(modulePath);
    const store = useStore.getState();
    store.recordRun(
      t.id,
      {
        results: t.testNames!.map((name) => ({
          name,
          passed: true,
          duration: 0,
        })),
        logs: [],
        duration: 1,
      },
      t.solutionFiles,
    );
    store.saveCode(t.id, "src/tasks.js", "// original work in progress");
    const progress = useStore.getState().progress;
    useStore.setState({
      progress: {
        ...progress,
        [t.id]: {
          ...progress[t.id],
          passedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      },
    });
  }, ticket);
  await page.getByRole("button", { name: "Your growth plan" }).click();
  await page.getByRole("button", { name: "Recall TF-001" }).click();
  await expect(page.locator(".recall-banner")).toContainText(
    "Rebuild from memory",
  );
  await expect(
    page.getByRole("button", { name: "Code review", exact: false }),
  ).toBeDisabled();
  await expect(page.locator(".hint-box")).toHaveCount(0);
  await page.evaluate(async (t) => {
    const modulePath = "/src/store.ts";
    const { useStore } = await import(modulePath);
    for (const [file, code] of Object.entries(t.solutionFiles))
      useStore.getState().saveCode(t.id, file, code);
  }, ticket);
  await page.reload();
  await expect(page.locator(".recall-banner")).toBeVisible();
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.locator(".recall-banner")).toContainText(
    "Spaced recall recorded.",
    { timeout: 30000 },
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "End recall" }).click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("ship-it.progress.v1")!).state,
  );
  expect(saved.code["TF-001"]["src/tasks.js"]).toBe(
    "// original work in progress",
  );
  expect(saved.learning["TF-001"].recalls).toBe(1);
  expect(saved.progress["TF-001"].attempts).toBe(1);
  expect(saved.earned["TF-001"]).toBe(100);
});

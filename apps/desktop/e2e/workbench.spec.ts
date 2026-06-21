import { expect, test } from "@playwright/test";

test("workbench session, settings, persistence, and inspector workflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByRole("heading", { name: "Desktop workbench", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sessions", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event timeline", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inspector", exact: true })).toBeVisible();
  await expect(page.getByLabel("Runner mode")).toContainText("Local fixture");
  await expect(page.getByLabel("Runner mode")).toContainText("Claude Code live");

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByLabel("UI language").selectOption("ko");
  await expect(page.getByRole("heading", { name: "세션", exact: true })).toBeVisible();

  await page.getByLabel("UI 언어").selectOption("en");
  await page.getByLabel("Model profile").selectOption("opus");
  await page.getByLabel("Routing mode").selectOption("auto");

  await expect(page.getByLabel("Model profile")).toHaveValue("opus");
  await expect(page.getByLabel("Routing mode")).toHaveValue("auto");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("geond-agent.workbench.session-defaults"))
  ).toContain("\"defaultModelAlias\":\"opus\"");

  await page.reload();
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByLabel("Model profile")).toHaveValue("opus");
  await expect(page.getByLabel("Routing mode")).toHaveValue("auto");

  await page.getByRole("button", { name: "New demo session" }).click();
  await expect(page.getByText("2 total")).toBeVisible();
  await expect(page.getByRole("button", { name: /Local demo session 2/ })).toBeVisible();
  await expect(page.getByText(/Appended 13 events/)).toBeVisible();

  await page.getByRole("tab", { name: "Selection" }).click();
  const selectionPanel = page.getByRole("tabpanel", { name: "Selection" });
  await expect(selectionPanel.getByText("opus alias -> GLM 5.2")).toBeVisible();
  await expect(selectionPanel.getByText("Auto")).toBeVisible();
  await expect(selectionPanel.getByText("System")).toBeVisible();

  await page.getByRole("tab", { name: "Terminal" }).click();
  const terminalPanel = page.getByRole("tabpanel", { name: "Terminal" });
  await expect(terminalPanel.getByText("cmd-build")).toBeVisible();
  await expect(terminalPanel.getByText("pnpm build")).toBeVisible();

  await page.getByRole("tab", { name: "Approvals" }).click();
  const approvalsPanel = page.getByRole("tabpanel", { name: "Approvals" });
  await expect(approvalsPanel.getByText("Review desktop scaffold")).toBeVisible();
  await expect(approvalsPanel.getByText("resolved / approved")).toBeVisible();

  expect(errors).toEqual([]);
});

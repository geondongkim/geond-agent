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
  await expect(page.getByRole("heading", { name: "Workspace panel", exact: true })).toHaveCount(0);
  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "Command menu" })).toBeVisible();
  await page.getByLabel("Search actions").fill("terminal");
  await page.getByRole("button", { name: /Open terminal inspector/ }).click();
  await expect(page.getByRole("heading", { name: "Workspace panel", exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Terminal" })).toBeVisible();
  await page.getByRole("button", { name: "Hide workspace panel" }).click();
  await expect(page.locator(".inspector-surface")).toHaveCount(0);
  await expect(page.locator(".workbench-shell")).toHaveCSS("background-color", "rgb(8, 10, 9)");
  await expect(page.locator(".workbench-frame")).toHaveCSS("background-color", "rgb(13, 17, 16)");
  await expect(page.locator(".session-rail, .timeline-surface")).toHaveCount(2);
  await expect(page.locator(".inspector-surface")).toHaveCount(0);
  await page.getByRole("button", { name: "Hide sessions" }).click();
  await expect(page.locator(".session-rail")).toHaveCount(0);
  await page.getByRole("button", { name: "Show sessions" }).click();
  await expect(page.getByRole("heading", { name: "Sessions", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/workbench-dark-smoke.png" });
  await page.getByRole("button", { name: "Show workspace panel" }).click();
  await expect(page.getByRole("heading", { name: "Workspace panel", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Review" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Browser" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Files" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Side chat" })).toBeVisible();
  await expect(page.locator(".session-rail, .timeline-surface, .inspector-surface")).toHaveCount(3);
  await page.screenshot({ path: "test-results/workbench-right-panel.png" });
  await page.getByRole("button", { name: "Hide workspace panel" }).click();
  await expect(page.locator(".inspector-surface")).toHaveCount(0);
  await page.getByRole("button", { name: "Show workspace panel" }).click();
  await expect(page.getByRole("button", { name: "Choose workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume session" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Unpin session" })).toBeVisible();
  await expect(page.getByText("Approval required")).toBeVisible();

  const reviewPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(reviewPanel.getByText("glm-4.7")).toBeVisible();
  await expect(reviewPanel.getByText("Source: Provider")).toBeVisible();
  await expect(reviewPanel.getByText("1,200")).toBeVisible();

  await page.getByLabel("Search sessions").fill("no matching session");
  await expect(page.getByText("No matching sessions.").first()).toBeVisible();
  await page.getByLabel("Search sessions").fill("local");
  await expect(page.getByRole("button", { name: /Local workbench session/ })).toBeVisible();

  await page.getByRole("button", { name: "Unpin session" }).click();
  await expect(page.getByRole("button", { name: "Pin session" })).toBeVisible();
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("geond-agent.workbench.pinned-session-ids"))
  ).toBe("[]");

  await page.getByRole("button", { name: "Pin session" }).click();
  await expect(page.getByRole("button", { name: "Unpin session" })).toBeVisible();

  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByLabel("Runner mode")).toContainText("Local fixture");
  await expect(page.getByLabel("Runner mode")).toContainText("Claude Code live");
  await expect(page.getByLabel("Runner mode")).toHaveValue("fixture");
  await expect(page.getByLabel("Backend")).toContainText("Claude Code external CLI/ACP candidate");
  await expect(page.getByLabel("Provider route")).toContainText("Z.ai Anthropic-compatible route");
  await expect(page.getByLabel("Model profile")).toContainText("opus alias -> GLM 5.2");
  await expect(page.getByLabel("Permission mode")).toHaveValue("plan");
  await expect(page.getByLabel("Follow-up policy")).toHaveValue("queue");
  await expect(page.getByLabel("Composer Enter behavior")).toHaveValue("modEnter");
  await expect(page.getByLabel("Review delivery")).toHaveValue("inline");
  await page.getByLabel("UI language").selectOption("ko");
  await expect(page.getByRole("heading", { name: "세션", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "워크스페이스 선택" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "브라우저" })).toBeVisible();

  await page.getByLabel("UI 언어").selectOption("en");
  await page.getByLabel("Model profile").selectOption("opus");
  await page.getByLabel("Routing mode").selectOption("auto");
  await page.getByLabel("Permission mode").selectOption("default");
  await page.getByLabel("Follow-up policy").selectOption("steer");
  await page.getByLabel("Composer Enter behavior").selectOption("enter");
  await page.getByLabel("Review delivery").selectOption("detached");

  await expect(page.getByLabel("Model profile")).toHaveValue("opus");
  await expect(page.getByLabel("Routing mode")).toHaveValue("auto");
  await expect(page.getByLabel("Permission mode")).toHaveValue("default");
  await expect(page.getByLabel("Follow-up policy")).toHaveValue("steer");
  await expect(page.getByLabel("Composer Enter behavior")).toHaveValue("enter");
  await expect(page.getByLabel("Review delivery")).toHaveValue("detached");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("geond-agent.workbench.session-defaults"))
  ).toContain("\"defaultModelAlias\":\"opus\"");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("geond-agent.workbench.session-defaults"))
  ).toContain("\"defaultPermissionMode\":\"default\"");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("geond-agent.workbench.session-defaults"))
  ).toContain("\"followUpPolicy\":\"steer\"");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("geond-agent.workbench.session-defaults"))
  ).toContain("\"composerEnterBehavior\":\"enter\"");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("geond-agent.workbench.session-defaults"))
  ).toContain("\"reviewDelivery\":\"detached\"");

  await page.reload();
  await page.getByRole("button", { name: "Show workspace panel" }).click();
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByLabel("Model profile")).toHaveValue("opus");
  await expect(page.getByLabel("Routing mode")).toHaveValue("auto");
  await expect(page.getByLabel("Permission mode")).toHaveValue("default");
  await expect(page.getByLabel("Follow-up policy")).toHaveValue("steer");
  await expect(page.getByLabel("Composer Enter behavior")).toHaveValue("enter");
  await expect(page.getByLabel("Review delivery")).toHaveValue("detached");

  await page.getByLabel("Agent command").fill("Inspect workbench event replay and keep the run local.");
  await expect(page.getByLabel("Agent command")).toHaveValue("Inspect workbench event replay and keep the run local.");
  await page.getByRole("button", { name: "Dispatch" }).click();
  await expect(page.getByText("2 total")).toBeVisible();
  await expect(page.getByRole("button", { name: /Local demo session 2/ })).toBeVisible();
  await expect(page.getByText(/Appended 15 events/)).toBeVisible();

  await page.getByRole("tab", { name: "Review" }).click();
  const updatedReviewPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(updatedReviewPanel.getByText("opus alias -> GLM 5.2")).toBeVisible();
  await expect(updatedReviewPanel.getByText("Auto")).toBeVisible();
  await expect(updatedReviewPanel.getByText("System")).toBeVisible();

  await page.getByRole("tab", { name: "Terminal" }).click();
  const terminalPanel = page.getByRole("tabpanel", { name: "Terminal" });
  await expect(terminalPanel.getByText("cmd-build")).toBeVisible();
  await expect(terminalPanel.getByText("pnpm build")).toBeVisible();

  await page.getByRole("tab", { name: "Review" }).click();
  const approvalsPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(approvalsPanel.getByText("Review desktop scaffold")).toBeVisible();
  await expect(approvalsPanel.getByText("Needs review")).toBeVisible();
  await expect(approvalsPanel.getByText("resolved / approved")).toBeVisible();
  await expect(approvalsPanel.getByText("Run verification command")).toBeVisible();
  await expect(approvalsPanel.getByText("High risk")).toBeVisible();
  await approvalsPanel.getByRole("button", { name: "View terminal" }).click();
  await expect(page.getByRole("tabpanel", { name: "Terminal" })).toBeVisible();
  await page.getByRole("tab", { name: "Review" }).click();
  await approvalsPanel.getByRole("group", { name: "Approval Run verification command" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Recorded approved for Run verification command.")).toBeVisible();

  await page.getByRole("button", { name: "Delete session" }).click();
  await expect(page.getByText("Deleted Local demo session 2.")).toBeVisible();
  await expect(page.getByText("1 total")).toBeVisible();
  await expect(page.getByRole("button", { name: /Local demo session 2/ })).toHaveCount(0);

  expect(errors).toEqual([]);
});

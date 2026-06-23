import { expect, test } from "@playwright/test";

import {
  collectConsoleErrors,
  expectLocalStorage,
  resetWorkbench,
  showWorkspacePanel
} from "./workbench-helpers";

test("Claude live runner blocks before launch when route readiness is missing", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await resetWorkbench(page);
  await showWorkspacePanel(page);

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByLabel("Runner mode").selectOption("claude-live");
  await expectLocalStorage(page, "geond-agent.workbench.runner-mode", "claude-live", "equals");

  await page.getByLabel("Agent command").fill("Run a local readiness smoke check.");
  await page.getByRole("button", { name: "Dispatch" }).click();

  await expect(
    page.locator(".run-status-strip").filter({
      hasText: "Claude Code live run is blocked before process launch"
    })
  ).toBeVisible();

  await page.getByRole("tab", { name: "Review" }).click();
  const reviewPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(reviewPanel.getByText("Mode: claude-live")).toBeVisible();
  await expect(reviewPanel.getByText("failed").first()).toBeVisible();
  await expect(reviewPanel.getByText("Route readiness", { exact: true })).toBeVisible();
  await expect(reviewPanel.getByText("Blocked", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Terminal" }).click();
  const terminalPanel = page.getByRole("tabpanel", { name: "Terminal" });
  await expect(terminalPanel.getByText("claude-code-live-prelude")).toBeVisible();
  await expect(
    terminalPanel.getByText("Claude Code live run is blocked before process launch")
  ).toBeVisible();

  expect(errors).toEqual([]);
});

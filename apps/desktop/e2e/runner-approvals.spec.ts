import { expect, test } from "@playwright/test";

import {
  collectConsoleErrors,
  dispatchFixtureRun,
  resetWorkbench,
  showWorkspacePanel
} from "./workbench-helpers";

test("runner dispatch and approval keyboard paths remain reviewable", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await resetWorkbench(page);
  await showWorkspacePanel(page);

  await dispatchFixtureRun(page, "Inspect workbench event replay and keep the run local.");
  // First dispatch creates the first session
  await expect(page.getByText("1 total")).toBeVisible();
  await expect(page.getByRole("button", { name: /Local demo session 1/ })).toBeVisible();
  await expect(page.locator(".run-status-strip").filter({ hasText: /Appended 16 events/ })).toBeVisible();

  await page.getByRole("tab", { name: "Review" }).click();
  const updatedReviewPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(updatedReviewPanel.getByRole("heading", { name: "Run attempts" })).toBeVisible();
  await expect(updatedReviewPanel.getByText("Mode: fixture")).toBeVisible();
  await expect(updatedReviewPanel.getByText("succeeded").first()).toBeVisible();
  await updatedReviewPanel.getByRole("button", { name: "Queue run follow-up" }).click();
  await page.getByRole("tab", { name: "Side chat" }).click();
  const runAttemptDraftsPanel = page.getByRole("tabpanel", { name: "Side chat" });
  await expect(runAttemptDraftsPanel.getByText("Review the run attempt")).toBeVisible();
  await runAttemptDraftsPanel
    .locator(".side-chat-draft-card")
    .filter({ hasText: "Review the run attempt" })
    .getByRole("button", { name: "Remove" })
    .click();
  await page.getByRole("tab", { name: "Review" }).click();
  await expect(updatedReviewPanel.getByText("glm-4.7")).toBeVisible();
  await expect(updatedReviewPanel.getByText("Manual", { exact: true })).toBeVisible();
  await expect(updatedReviewPanel.getByText("System")).toBeVisible();

  await page.getByRole("tab", { name: "Terminal" }).click();
  const terminalPanel = page.getByRole("tabpanel", { name: "Terminal" });
  await expect(terminalPanel.getByText("cmd-build")).toBeVisible();
  await expect(terminalPanel.getByText("pnpm build")).toBeVisible();
  await terminalPanel.getByRole("button", { name: "Queue terminal follow-up" }).first().click();
  await page.getByRole("tab", { name: "Side chat" }).click();
  const sideChatPanel = page.getByRole("tabpanel", { name: "Side chat" });
  await expect(sideChatPanel.getByText("Review the terminal output")).toBeVisible();
  await sideChatPanel
    .locator(".side-chat-draft-card")
    .filter({ hasText: "cmd-build" })
    .getByRole("button", { name: "Remove" })
    .click();

  await page.getByRole("tab", { name: "Review" }).click();
  const approvalsPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(approvalsPanel.getByText("Review desktop scaffold")).toBeVisible();
  await expect(approvalsPanel.getByText("Needs review")).toBeVisible();
  await expect(approvalsPanel.getByText("resolved / approved")).toBeVisible();
  await expect(approvalsPanel.getByText("Run verification command")).toBeVisible();
  await expect(approvalsPanel.getByText("High risk")).toBeVisible();
  await approvalsPanel.getByRole("button", { name: "Queue follow-up" }).first().click();
  await page.getByRole("tab", { name: "Side chat" }).click();
  await expect(sideChatPanel.getByText("Review the approval request")).toBeVisible();
  await sideChatPanel
    .locator(".side-chat-draft-card")
    .filter({ hasText: "Run verification command" })
    .getByRole("button", { name: "Remove" })
    .click();
  await page.getByRole("tab", { name: "Review" }).click();
  await approvalsPanel.getByRole("button", { name: "View terminal" }).click();
  await expect(page.getByRole("tabpanel", { name: "Terminal" })).toBeVisible();
  await page.getByRole("tab", { name: "Review" }).click();

  await approvalsPanel.getByRole("group", { name: "Approval Run verification command" }).focus();
  await page.keyboard.press("Escape");
  await expect(
    page.locator(".run-status-strip").filter({
      hasText: "Recorded rejected for Run verification command."
    })
  ).toBeVisible();

  await dispatchFixtureRun(page, "Run another local fixture so approval can be accepted by keyboard.");
  // Second dispatch creates a new session (not continuing the first)
  await expect(page.getByText("2 total")).toBeVisible();
  await page.getByRole("tab", { name: "Review" }).click();
  await page.getByRole("group", { name: "Approval Run verification command" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".run-status-strip").filter({
      hasText: "Recorded approved for Run verification command."
    })
  ).toBeVisible();

  await page.getByRole("button", { name: "Delete session" }).first().click();
  // After deletion, we should have 1 total session left
  await expect(page.getByText("1 total")).toBeVisible();
  // The deleted session button should no longer be visible
  await expect(page.getByRole("button", { name: /Local demo session 2/ })).toHaveCount(0);

  expect(errors).toEqual([]);
});

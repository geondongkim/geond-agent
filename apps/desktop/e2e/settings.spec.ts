import { expect, test } from "@playwright/test";

import {
  collectConsoleErrors,
  expectLocalStorage,
  resetWorkbench,
  showWorkspacePanel
} from "./workbench-helpers";

test("settings and pinned session preferences persist across reload", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await resetWorkbench(page);
  await showWorkspacePanel(page);

  await expect(page.getByRole("button", { name: "Choose workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume session" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Unpin session" })).toBeVisible();
  await expect(page.getByText("Approval required")).toBeVisible();
  await expect(page.locator(".timeline-message-assistant").first()).toBeVisible();
  await expect(page.locator(".timeline-message-assistant .timeline-markdown").first()).toBeVisible();
  await expect(page.locator(".timeline-activity-command").first()).toBeVisible();
  await expect(page.locator(".timeline-approval-inline").first()).toBeVisible();

  const reviewPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(reviewPanel.getByText("glm-4.7")).toBeVisible();
  await expect(reviewPanel.getByText("Source: Provider")).toBeVisible();
  await expect(reviewPanel.getByText("1,200")).toBeVisible();
  await expect(reviewPanel.getByRole("button", { name: "Queue follow-up" }).first()).toBeVisible();

  await page.getByLabel("Search sessions").fill("no matching session");
  await expect(page.getByText("No matching sessions.").first()).toBeVisible();
  await page.getByLabel("Search sessions").fill("local");
  await expect(page.getByRole("button", { name: /Local workbench session/ })).toBeVisible();

  await page.getByRole("button", { name: "Unpin session" }).click();
  await expect(page.getByRole("button", { name: "Pin session" })).toBeVisible();
  await expectLocalStorage(page, "geond-agent.workbench.pinned-session-ids", "[]", "equals");

  await page.getByRole("button", { name: "Pin session" }).click();
  await expect(page.getByRole("button", { name: "Unpin session" })).toBeVisible();

  await page.getByRole("tab", { name: "Settings" }).click();
  const settingsPanel = page.getByRole("tabpanel", { name: "Settings" });
  await expect(settingsPanel.getByRole("heading", { name: "First-run checklist" })).toBeVisible();
  await expect(settingsPanel.getByText("Runner mode", { exact: true }).first()).toBeVisible();
  await expect(settingsPanel.getByText("Bridge command", { exact: true }).first()).toBeVisible();
  await expect(settingsPanel.getByText("Claude CLI probe", { exact: true }).first()).toBeVisible();
  await expect(settingsPanel.getByText("Persistence boundary", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Language", { exact: true })).toBeVisible();
  await expect(page.getByText("Backend and model route", { exact: true })).toBeVisible();
  await expect(page.getByText("Composer and review", { exact: true })).toBeVisible();
  await expect(page.getByText("Safety and persistence", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Runner mode")).toContainText("Local fixture");
  await expect(page.getByLabel("Runner mode")).toContainText("Claude Code live");
  await expect(page.getByLabel("Runner mode")).toHaveValue("fixture");
  await expect(page.getByLabel("Backend")).toContainText("Claude Code external CLI/ACP candidate");
  await expect(page.getByLabel("Backend")).toContainText("Codex CLI metadata candidate");
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
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"defaultModelAlias\":\"opus\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"defaultPermissionMode\":\"default\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"followUpPolicy\":\"steer\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"composerEnterBehavior\":\"enter\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"reviewDelivery\":\"detached\"");
  await expectLocalStorage(page, "geond-agent.workbench.layout", "\"inspectorTab\":\"settings\"");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Workspace panel", exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Model profile")).toHaveValue("opus");
  await expect(page.getByLabel("Routing mode")).toHaveValue("auto");
  await expect(page.getByLabel("Permission mode")).toHaveValue("default");
  await expect(page.getByLabel("Follow-up policy")).toHaveValue("steer");
  await expect(page.getByLabel("Composer Enter behavior")).toHaveValue("enter");
  await expect(page.getByLabel("Review delivery")).toHaveValue("detached");

  expect(errors).toEqual([]);
});

import { expect, test } from "@playwright/test";

import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectWidePaneOrder,
  openCommandPaletteAction,
  resetWorkbench,
  showWorkspacePanel
} from "./workbench-helpers";

test("workbench layout and command palette expose docked surfaces", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await resetWorkbench(page);

  await expect(page.getByRole("heading", { name: "Desktop workbench", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sessions", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspaces", exact: true })).toBeVisible();
  await expect(page.locator("#workspace-filter")).toHaveCount(0);
  await expect(page.locator(".workspace-session-group")).toHaveCount(1);
  await expect(page.locator(".agent-backend-icon-claude")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Event timeline", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspace panel", exact: true })).toHaveCount(0);

  await openCommandPaletteAction(page, "terminal", /Open terminal inspector/);
  await expect(page.getByRole("heading", { name: "Workspace panel", exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Terminal" })).toBeVisible();

  await page.getByRole("button", { name: "Hide workspace panel" }).click();
  await expect(page.locator(".inspector-surface")).toHaveCount(0);
  await expect(page.locator(".workbench-shell")).toHaveCSS("background-color", "rgb(8, 10, 9)");
  await expect(page.locator(".workbench-frame")).toHaveCSS("background-color", "rgb(13, 17, 16)");
  await expect(page.locator(".session-rail, .timeline-surface")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Attach workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Route settings" })).toBeVisible();
  await expect(page.locator(".composer-toolbar")).toBeVisible();
  await expect(page.locator(".composer-tool-pill").filter({ hasText: "sonnet" })).toBeVisible();

  await page.getByRole("button", { name: "Hide sessions" }).click();
  await expect(page.locator(".session-rail")).toHaveCount(0);
  await page.getByRole("button", { name: "Show sessions" }).click();
  await expect(page.getByRole("heading", { name: "Sessions", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/workbench-dark-smoke.png" });

  await showWorkspacePanel(page);
  await expect(page.getByText("Tools", { exact: true })).toBeVisible();
  await expect(page.locator(".tool-tab-grid")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Review" })).toBeVisible();
  const reviewPanel = page.getByRole("tabpanel", { name: "Review" });
  await expect(reviewPanel.getByRole("heading", { name: "Session review" })).toBeVisible();
  await reviewPanel.getByRole("button", { name: "Queue session review" }).click();
  await expect(page.getByRole("tab", { name: "Browser" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Files" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Side chat" })).toBeVisible();
  await expect(page.locator(".session-rail, .timeline-surface, .inspector-surface")).toHaveCount(3);

  await openCommandPaletteAction(page, "browser", /Open browser inspector/);
  await expect(page.getByRole("tabpanel", { name: "Browser" })).toBeVisible();
  await openCommandPaletteAction(page, "side chat", /Open side chat inspector/);
  const sideChatPanel = page.getByRole("tabpanel", { name: "Side chat" });
  await expect(sideChatPanel).toBeVisible();
  await expect(sideChatPanel.getByText("Review the current workbench session")).toBeVisible();

  expect(errors).toEqual([]);
});

test("workbench compact and wide viewport layout guards stay stable @layout", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const viewports = [
    { name: "compact", width: 760, height: 900 },
    { name: "wide", width: 1600, height: 1000 }
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await resetWorkbench(page);
    await showWorkspacePanel(page);
    await expect(page.locator(".workbench-shell")).toBeVisible();
    await expect(page.locator(".timeline-surface")).toBeVisible();
    await expect(page.locator(".inspector-surface")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/workbench-${viewport.name}-layout.png` });

    if (viewport.name === "wide") {
      await expectWidePaneOrder(page);
    }
  }

  expect(errors).toEqual([]);
});

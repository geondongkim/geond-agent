import { expect, test } from "@playwright/test";

import {
  collectConsoleErrors,
  expectSideChatStorage,
  openCommandPaletteAction,
  resetWorkbench,
  showWorkspacePanel
} from "./workbench-helpers";

test("file evidence, provider prompt disclosure, browser check, and side chat drafts", async ({
  page
}) => {
  const errors = collectConsoleErrors(page);
  await resetWorkbench(page);
  await showWorkspacePanel(page);

  await openCommandPaletteAction(page, "context", /Attach workspace context/);
  await page.keyboard.press("Control+K");
  await page.getByLabel("Search actions").fill("file");
  await expect(page.getByRole("button", { name: /Attach file evidence/ })).toBeVisible();
  await page.keyboard.press("Escape");

  const filesPanel = page.getByRole("tabpanel", { name: "Files" });
  await expect(filesPanel).toBeVisible();
  await expect(filesPanel.getByText("Evidence preview")).toBeVisible();
  await expect(filesPanel.getByText("Evidence detail")).toBeVisible();
  await expect(filesPanel.getByText("Recent context")).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Attach workspace" })).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Attach file" })).toBeVisible();
  await expect(filesPanel.getByRole("heading", { name: "Changed files" })).toBeVisible();
  await expect(filesPanel.getByText("Privacy boundary").first()).toBeVisible();
  await expect(filesPanel.getByText("When you dispatch a run")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export evidence bundle" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/local-workbench-session-evidence\.md$/);
  await filesPanel.getByRole("button", { name: "Queue evidence bundle" }).click();
  await expectSideChatStorage(page, "Workbench evidence bundle (metadata only).");
  await page.getByRole("tab", { name: "Side chat" }).click();
  const earlySideChatPanel = page.getByRole("tabpanel", { name: "Side chat" });
  await expect(earlySideChatPanel.getByText("Workbench evidence bundle")).toBeVisible();
  await earlySideChatPanel
    .locator(".side-chat-draft-card")
    .filter({ hasText: "Workbench evidence bundle" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expectSideChatStorage(page, "[]", "equals");
  await page.getByRole("tab", { name: "Files" }).click();
  await filesPanel.getByRole("button", { name: "Queue report" }).click();
  await expectSideChatStorage(page, "Workbench dogfood report");
  await page.getByRole("tab", { name: "Side chat" }).click();
  await earlySideChatPanel
    .locator(".side-chat-draft-card")
    .filter({ hasText: "Workbench dogfood report" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expectSideChatStorage(page, "[]", "equals");
  await page.getByRole("tab", { name: "Files" }).click();
  await expect(
    filesPanel.getByRole("button", { name: /apps\/desktop\/src\/app\.tsx/ })
  ).toBeVisible();

  await filesPanel.getByRole("button", { name: /apps\/desktop\/src\/app\.tsx/ }).click();
  await expect(filesPanel.getByLabel("Evidence detail")).toContainText(
    "apps/desktop/src/app.tsx"
  );
  await filesPanel.getByRole("button", { name: "Queue evidence follow-up" }).click();
  await expectSideChatStorage(page, "apps/desktop/src/app.tsx");
  await expectSideChatStorage(page, "\"sessionId\":\"local-session-1\"");
  await expect(filesPanel.getByRole("heading", { name: "Attached context" })).toBeVisible();
  await expect(filesPanel.getByText("Metadata only", { exact: true }).first()).toBeVisible();
  await expect(filesPanel.getByText("Workspace path attached as metadata only")).toBeVisible();
  await expect(page.locator(".context-chip").filter({ hasText: "geond-agent" }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Side chat" }).click();
  const sideChatPanel = page.getByRole("tabpanel", { name: "Side chat" });
  await expect(sideChatPanel.getByText("Side chat draft queue")).toBeVisible();
  await expect(sideChatPanel.getByText("Follow-up policy: Queue follow-ups")).toBeVisible();
  await expect(sideChatPanel.getByText("Review the changed file evidence")).toBeVisible();
  await sideChatPanel
    .locator(".side-chat-draft-card")
    .filter({ hasText: "apps/desktop/src/app.tsx" })
    .getByRole("button", { name: "Use in composer" })
    .click();
  await expect(page.getByLabel("Agent command")).toHaveValue(
    /Review the changed file evidence for apps\/desktop\/src\/app\.tsx/
  );
  await expectSideChatStorage(page, "[]", "equals");

  await sideChatPanel.getByLabel("Draft").fill("Check the evidence preview before dispatching.");
  await sideChatPanel.getByRole("button", { name: "Queue draft" }).click();
  await expectSideChatStorage(page, "Check the evidence preview before dispatching.");
  await expect(sideChatPanel.getByText("Queued drafts")).toBeVisible();
  await expect(sideChatPanel.getByText("Check the evidence preview before dispatching.")).toBeVisible();
  await sideChatPanel.getByRole("button", { name: "Use in composer" }).click();
  await expect(page.getByLabel("Agent command")).toHaveValue(
    "Check the evidence preview before dispatching."
  );
  await expectSideChatStorage(page, "[]", "equals");

  await page.getByRole("tab", { name: "Browser" }).click();
  const browserPanel = page.getByRole("tabpanel", { name: "Browser" });
  await expect(browserPanel.getByText("Local browser check")).toBeVisible();
  await expect(browserPanel.getByText("Local-only surface")).toBeVisible();
  await expect(browserPanel.getByText("apps/desktop/src/app.tsx")).toHaveCount(0);
  await browserPanel.getByRole("button", { name: "Queue browser check" }).click();
  await page.getByRole("tab", { name: "Side chat" }).click();
  await expect(sideChatPanel.getByText("Review browser/local validation")).toBeVisible();
  await expectSideChatStorage(page, "\"sessionId\":\"local-session-1\"");
  await sideChatPanel
    .locator(".side-chat-draft-card")
    .filter({ hasText: "Review browser/local validation" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expectSideChatStorage(page, "[]", "equals");
  await page.screenshot({ path: "test-results/workbench-right-panel.png" });

  expect(errors).toEqual([]);
});

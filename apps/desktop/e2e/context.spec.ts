import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  collectConsoleErrors,
  expectSideChatStorage,
  openCommandPaletteAction,
  resetWorkbench,
  showWorkspacePanel
} from "./workbench-helpers";

test("file evidence export package and capture boundary stay metadata-only", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const filesPanel = await openFilesPanelWithWorkspaceContext(page);

  await expect(filesPanel.getByText("Evidence preview")).toBeVisible();
  await expect(filesPanel.getByText("Evidence detail")).toBeVisible();
  await expect(filesPanel.getByText("Recent context")).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Attach workspace" })).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Attach file" })).toBeVisible();
  await expect(filesPanel.getByRole("heading", { name: "Export package" })).toBeVisible();
  await expect(filesPanel.getByRole("heading", { name: "Export scope" })).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Attention sessions" })).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "All sessions" })).toBeVisible();
  await expect(filesPanel.getByLabel(/Include session/).first()).toBeChecked();
  await expect(filesPanel.getByRole("heading", { name: "Capture boundary" })).toBeVisible();
  await expect(filesPanel.getByText("Screenshot bundle")).toBeVisible();
  await expect(filesPanel.getByText("Structured trace bundle")).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Export screenshot manifest" })).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Export structured trace" })).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Export multi-session trace bundle" })).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Export visual capture policy" })).toBeVisible();
  await expect(filesPanel.getByText("Visual capture review")).toBeVisible();
  await expect(filesPanel.getByLabel("Explicit per-export consent is confirmed.")).not.toBeChecked();
  await filesPanel.getByLabel("Explicit per-export consent is confirmed.").check();
  await filesPanel.getByLabel("Visible secrets, account state, and private local files were reviewed.").check();
  await filesPanel.getByLabel("A user-selected storage path is required before raw capture.").check();
  await filesPanel
    .getByLabel("Terminal, browser, and workspace surfaces were reviewed for private content.")
    .check();
  await expect(filesPanel.getByText("Policy reviewed")).toBeVisible();
  await expect(filesPanel.getByText("Explicit consent required").first()).toBeVisible();
  await expect(filesPanel.getByRole("heading", { name: "Changed files" })).toBeVisible();
  await expect(filesPanel.getByText("Privacy boundary").first()).toBeVisible();
  await expect(filesPanel.getByText("When you dispatch a run")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export evidence bundle" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/local-workbench-session-evidence\.md$/);

  const workspaceDownloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export workspace report" }).click();
  const workspaceDownload = await workspaceDownloadPromise;
  expect(workspaceDownload.suggestedFilename()).toMatch(/workbench-workspace-report\.md$/);

  await filesPanel.getByRole("button", { name: "Attention sessions" }).click();
  await expect(filesPanel.getByRole("button", { name: "Export multi-session trace bundle" })).toBeEnabled();

  const multiSessionReportDownloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export multi-session report" }).click();
  const multiSessionReportDownload = await multiSessionReportDownloadPromise;
  expect(multiSessionReportDownload.suggestedFilename()).toMatch(
    /workbench-multi-session-issue-report\.md$/
  );

  const manifestDownloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export manifest", exact: true }).click();
  const manifestDownload = await manifestDownloadPromise;
  expect(manifestDownload.suggestedFilename()).toMatch(/workbench-export-manifest\.md$/);

  const screenshotManifestDownloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export screenshot manifest" }).click();
  const screenshotManifestDownload = await screenshotManifestDownloadPromise;
  expect(screenshotManifestDownload.suggestedFilename()).toMatch(
    /local-session-1-screenshot-manifest\.json$/
  );

  const traceDownloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export structured trace" }).click();
  const traceDownload = await traceDownloadPromise;
  expect(traceDownload.suggestedFilename()).toMatch(/local-session-1-structured-trace\.json$/);

  const traceBundleDownloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export multi-session trace bundle" }).click();
  const traceBundleDownload = await traceBundleDownloadPromise;
  expect(traceBundleDownload.suggestedFilename()).toMatch(
    /workbench-multi-session-trace-bundle\.json$/
  );

  const visualPolicyDownloadPromise = page.waitForEvent("download");
  await filesPanel.getByRole("button", { name: "Export visual capture policy" }).click();
  const visualPolicyDownload = await visualPolicyDownloadPromise;
  expect(visualPolicyDownload.suggestedFilename()).toMatch(
    /workbench-visual-capture-policy\.json$/
  );

  await queueAndClearDraft(page, filesPanel, "Queue evidence bundle", "Workbench evidence bundle");
  await queueAndClearDraft(page, filesPanel, "Queue report", "Workbench dogfood report");
  await queueAndClearDraft(
    page,
    filesPanel,
    "Queue workspace report",
    "Workbench workspace report"
  );
  await queueAndClearDraft(
    page,
    filesPanel,
    "Queue multi-session report",
    "Workbench multi-session issue report"
  );
  await queueAndClearDraft(
    page,
    filesPanel,
    "Queue export manifest",
    "Workbench export manifest"
  );

  await page.getByRole("tab", { name: "Files" }).click();
  await filesPanel.getByRole("button", { name: "Mark as favorite" }).first().click();
  await expect(filesPanel.getByRole("heading", { name: "Favorite context" })).toBeVisible();
  await expect(filesPanel.getByRole("heading", { name: "geond-agent" }).first()).toBeVisible();
  await expect(filesPanel.getByRole("button", { name: "Remove from favorites" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("file evidence follow-ups, side chat drafts, and browser checks remain queued", async ({
  page
}) => {
  const errors = collectConsoleErrors(page);
  const filesPanel = await openFilesPanelWithWorkspaceContext(page);

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
  await expect(
    page.locator(".context-chip").filter({ hasText: "geond-agent" }).first()
  ).toBeVisible();

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

async function openFilesPanelWithWorkspaceContext(page: Page) {
  await resetWorkbench(page);
  await showWorkspacePanel(page);

  await openCommandPaletteAction(page, "context", /Attach workspace context/);
  await page.keyboard.press("Control+K");
  await page.getByLabel("Search actions").fill("file");
  await expect(page.getByRole("button", { name: /Attach file evidence/ })).toBeVisible();
  await page.keyboard.press("Escape");

  const filesPanel = page.getByRole("tabpanel", { name: "Files" });
  await expect(filesPanel).toBeVisible();
  return filesPanel;
}

async function queueAndClearDraft(
  page: Page,
  filesPanel: Locator,
  buttonName: string,
  expectedDraftText: string
): Promise<void> {
  await page.getByRole("tab", { name: "Files" }).click();
  await filesPanel.getByRole("button", { name: buttonName }).click();
  await expectSideChatStorage(page, expectedDraftText);
  await page.evaluate(() => {
    window.localStorage.setItem("geond-agent.workbench.side-chat-drafts", "[]");
  });
}

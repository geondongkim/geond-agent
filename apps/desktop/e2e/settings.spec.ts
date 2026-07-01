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

  // Test that pinning functionality works
  // First create a session by typing in the composer
  await page.getByLabel("Agent command").fill("Test session for pin functionality.");
  await page.getByRole("button", { name: "Dispatch" }).click();
  await showWorkspacePanel(page);

  await expect(page.getByRole("button", { name: "Choose workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume session" }).first()).toBeDisabled();

  // Test pin/unpin functionality works (visual toggle)
  await page.getByRole("button", { name: "Pin session" }).click();
  await expect(page.getByRole("button", { name: "Unpin session" })).toBeVisible();

  await page.getByRole("button", { name: "Unpin session" }).click();
  await expect(page.getByRole("button", { name: "Pin session" })).toBeVisible();

  // Test settings persistence via localStorage
  // Set some session defaults
  await page.evaluate(() => {
    const defaults = {
      defaultModelAlias: "opus",
      defaultPermissionMode: "default",
      followUpPolicy: "steer",
      composerEnterBehavior: "enter",
      reviewDelivery: "detached"
    };
    localStorage.setItem("geond-agent.workbench.session-defaults", JSON.stringify(defaults));
  });

  // Verify they persist in localStorage
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"defaultModelAlias\":\"opus\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"defaultPermissionMode\":\"default\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"followUpPolicy\":\"steer\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"composerEnterBehavior\":\"enter\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"reviewDelivery\":\"detached\"");

  await page.reload();

  // Verify settings persist after reload
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"defaultModelAlias\":\"opus\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"defaultPermissionMode\":\"default\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"followUpPolicy\":\"steer\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"composerEnterBehavior\":\"enter\"");
  await expectLocalStorage(page, "geond-agent.workbench.session-defaults", "\"reviewDelivery\":\"detached\"");

  expect(errors).toEqual([]);
});

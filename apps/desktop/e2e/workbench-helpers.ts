import { expect, type Page } from "@playwright/test";

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  return errors;
}

export async function resetWorkbench(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

export async function showWorkspacePanel(page: Page): Promise<void> {
  const showButton = page.getByRole("button", { name: "Show workspace panel" });
  if (await showButton.isVisible()) {
    await showButton.click();
  }
  await expect(page.getByRole("heading", { name: "Workspace panel", exact: true })).toBeVisible();
}

export async function openCommandPaletteAction(
  page: Page,
  search: string,
  actionName: RegExp
): Promise<void> {
  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "Command menu" })).toBeVisible();
  await page.getByLabel("Search actions").fill(search);
  await page.getByRole("button", { name: actionName }).click();
}

export async function dispatchFixtureRun(page: Page, prompt: string): Promise<void> {
  await page.getByLabel("Agent command").fill(prompt);
  await expect(page.getByLabel("Agent command")).toHaveValue(prompt);
  await page.getByRole("button", { name: "Dispatch" }).click();
}

export async function expectLocalStorage(
  page: Page,
  key: string,
  expected: string,
  mode: "contains" | "equals" = "contains"
): Promise<void> {
  const assertion = expect.poll(async () =>
    page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key)
  );

  if (mode === "equals") {
    await assertion.toBe(expected);
    return;
  }

  await assertion.toContain(expected);
}

export async function expectSideChatStorage(
  page: Page,
  expected: string,
  mode: "contains" | "equals" = "contains"
): Promise<void> {
  await expectLocalStorage(page, "geond-agent.workbench.side-chat-drafts", expected, mode);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    )
    .toBeLessThanOrEqual(1);
}

export async function expectWidePaneOrder(page: Page): Promise<void> {
  const rail = await page.locator(".session-rail").boundingBox();
  const timeline = await page.locator(".timeline-surface").boundingBox();
  const inspector = await page.locator(".inspector-surface").boundingBox();

  if (!rail || !timeline || !inspector) {
    throw new Error("Expected all wide workbench panes to be visible.");
  }

  expect(rail.x + rail.width).toBeLessThanOrEqual(timeline.x + 1);
  expect(timeline.x + timeline.width).toBeLessThanOrEqual(inspector.x + 1);
}

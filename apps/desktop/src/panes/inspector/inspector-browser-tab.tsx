import type { UiI18n } from "@geond-agent/ui-workbench";
import { Files, Globe2, MessageSquarePlus, Terminal } from "lucide-react";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import type { InspectorSessionReadModel } from "../../lib/inspector-read-model.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorBrowserTab({
  activeSession,
  commandOutputs,
  enqueueSideChatDraft,
  i18n,
  setInspectorTab
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly commandOutputs?: InspectorSessionReadModel["commandOutputs"];
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly i18n: UiI18n;
  readonly setInspectorTab: (tab: string) => void;
}) {
  const outputs = commandOutputs ?? activeSession?.commandOutputs ?? [];
  const contextCount = activeSession?.contextAttachments.length ?? 0;
  const changedFileCount =
    activeSession?.diffs.reduce((count, diff) => count + diff.files.length, 0) ?? 0;

  function queueBrowserCheck() {
    if (!activeSession) {
      return;
    }

    enqueueSideChatDraft(createBrowserFollowUpDraft(activeSession, outputs), activeSession.title);
  }

  return (
    <TabsContent value="browser" className="border-0 bg-transparent p-0">
      <section className="side-chat-panel">
        <div className="flex min-w-0 items-start gap-3">
          <span className="side-chat-icon">
            <Globe2 size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{i18n.t("workbench.browser.title")}</h3>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
              {i18n.t("workbench.browser.detail")}
            </p>
            <p className="mt-2 inline-flex rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-[color:var(--ink-soft)]">
              {i18n.t("workbench.browser.localOnly")}
            </p>
          </div>
        </div>

        {activeSession ? (
          <>
            <dl className="file-evidence-details">
              <BrowserMetric
                label={i18n.t("workbench.browser.workspace")}
                value={activeSession.workspacePath ?? i18n.t("workbench.workspace.all")}
              />
              <BrowserMetric
                label={i18n.t("workbench.files.attachedContext")}
                value={String(contextCount)}
              />
              <BrowserMetric
                label={i18n.t("workbench.files.changedFiles")}
                value={String(changedFileCount)}
              />
              <BrowserMetric
                label={i18n.t("workbench.terminal.title")}
                value={String(outputs.length)}
              />
            </dl>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Button className="gap-2" onClick={queueBrowserCheck}>
                <MessageSquarePlus size={14} />
                {i18n.t("workbench.browser.queueCheck")}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setInspectorTab("terminal")}
              >
                <Terminal size={14} />
                {i18n.t("workbench.browser.openTerminal")}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setInspectorTab("files")}
              >
                <Files size={14} />
                {i18n.t("workbench.browser.openFiles")}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-3">
            <EmptyState text={i18n.t("workbench.browser.empty")} />
          </div>
        )}
      </section>
    </TabsContent>
  );
}

function BrowserMetric({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function createBrowserFollowUpDraft(
  activeSession: ProjectedActiveSession,
  outputs: InspectorSessionReadModel["commandOutputs"]
): string {
  return [
    `Review browser/local validation for ${activeSession.title}.`,
    `Workspace: ${activeSession.workspacePath ?? "All workspaces"}.`,
    `Attached context: ${activeSession.contextAttachments.length}.`,
    `Changed files: ${activeSession.diffs.reduce((count, diff) => count + diff.files.length, 0)}.`,
    `Terminal outputs available: ${outputs.length}.`,
    "Check the UI state, file evidence, terminal output, and pending approvals before dispatching a follow-up."
  ].join("\n");
}

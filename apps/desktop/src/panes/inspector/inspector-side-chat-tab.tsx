import type { UiI18n } from "@geond-agent/ui-workbench";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";

interface SideChatDraft {
  readonly id: string;
  readonly sourceLabel?: string;
  readonly text: string;
}

export function InspectorSideChatTab({
  drafts,
  enqueueSideChatDraft,
  followUpPolicy,
  i18n,
  removeSideChatDraft,
  setComposerPrompt
}: {
  readonly drafts: readonly SideChatDraft[];
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly followUpPolicy: string;
  readonly i18n: UiI18n;
  readonly removeSideChatDraft: (draftId: string) => void;
  readonly setComposerPrompt: (prompt: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const trimmedDraft = draft.trim();

  function queueDraft() {
    if (!trimmedDraft) {
      return;
    }

    enqueueSideChatDraft(trimmedDraft);
    setDraft("");
  }

  return (
    <TabsContent value="chat" className="border-0 bg-transparent p-0">
      <section className="side-chat-panel">
        <div className="flex min-w-0 items-start gap-3">
          <span className="side-chat-icon">
            <MessageSquare size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{i18n.t("workbench.sideChat.title")}</h3>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
              {i18n.t("workbench.sideChat.detail")}
            </p>
            <p className="mt-2 inline-flex text-[11px] text-[color:var(--ink-soft)]">
              {i18n.t("workbench.sideChat.followUpPolicy")}:{" "}
              {formatFollowUpPolicy(i18n, followUpPolicy)}
            </p>
          </div>
        </div>
        <label className="mt-3 block">
          <span className="muted-meta">{i18n.t("workbench.sideChat.draftLabel")}</span>
          <textarea
            className="side-chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={i18n.t("workbench.sideChat.placeholder")}
          />
        </label>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button className="gap-2" onClick={queueDraft} disabled={!trimmedDraft}>
            <MessageSquare size={14} />
            {i18n.t("workbench.sideChat.queueDraft")}
          </Button>
        </div>
      </section>

      <section className="side-chat-panel mt-3">
        <div className="review-section-heading">
          <h3>{i18n.t("workbench.sideChat.queuedDrafts")}</h3>
          <span className="metric-pill">{drafts.length}</span>
        </div>
        {drafts.length ? (
          <div className="space-y-2">
            {drafts.map((item) => (
              <article key={item.id} className="side-chat-draft-card">
                {item.sourceLabel ? (
                  <p className="muted-meta mb-2">{item.sourceLabel}</p>
                ) : null}
                <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink-soft)]">
                  {item.text}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => removeSideChatDraft(item.id)}
                  >
                    <Trash2 size={14} />
                    {i18n.t("workbench.sideChat.removeDraft")}
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={() => {
                      setComposerPrompt(item.text);
                      removeSideChatDraft(item.id);
                    }}
                  >
                    <Send size={14} />
                    {i18n.t("workbench.sideChat.useInComposer")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text={i18n.t("workbench.sideChat.empty")} />
        )}
      </section>
    </TabsContent>
  );
}

function formatFollowUpPolicy(i18n: UiI18n, policy: string): string {
  switch (policy) {
    case "steer":
      return i18n.t("settings.selection.followUpPolicy.steer");
    case "interrupt":
      return i18n.t("settings.selection.followUpPolicy.interrupt");
    default:
      return i18n.t("settings.selection.followUpPolicy.queue");
  }
}

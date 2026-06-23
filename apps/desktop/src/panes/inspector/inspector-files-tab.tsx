import type { UiI18n } from "@geond-agent/ui-workbench";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  FileDiff,
  FilePlus,
  FileText,
  FolderOpen,
  MessageSquarePlus,
  ShieldCheck
} from "lucide-react";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { cn } from "../../lib/cn.js";
import {
  createEvidenceFollowUpDraft,
  createFileEvidencePreviewModel,
  findFileEvidenceSelection,
  formatDiffStat,
  formatEvidenceRange,
  getFileEvidenceSelectionId,
  type FileEvidenceChangedFileItem,
  type FileEvidenceContextItem,
  type FileEvidenceSelection
} from "../../lib/file-evidence.js";
import type { InspectorSessionReadModel } from "../../lib/inspector-read-model.js";
import { formatContextKindLabel } from "../../lib/workbench-format.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorFilesTab({
  activeSession,
  attachFileContext,
  enqueueSideChatDraft,
  inspectorData,
  i18n
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly attachFileContext: () => void;
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly i18n: UiI18n;
}) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const model = createFileEvidencePreviewModel({ activeSession, inspectorData });
  const hasEvidence = model.contextCount > 0 || model.changedFileCount > 0;
  const selectedEvidence = findFileEvidenceSelection(model, selectedEvidenceId);
  const resolvedSelectedEvidenceId = getFileEvidenceSelectionId(selectedEvidence);

  function queueSelectedEvidenceFollowUp() {
    if (!selectedEvidence) {
      return;
    }

    const sourceLabel =
      selectedEvidence.type === "changed-file"
        ? selectedEvidence.item.path
        : selectedEvidence.item.title;
    enqueueSideChatDraft(createEvidenceFollowUpDraft(selectedEvidence), sourceLabel);
  }

  return (
    <TabsContent value="files" className="border-0 bg-transparent p-0">
      <div className="file-evidence-hero">
        <div className="flex min-w-0 items-start gap-3">
          <span className="file-evidence-hero-icon">
            <FolderOpen size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{i18n.t("workbench.files.evidenceTitle")}</p>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
              {i18n.t("workbench.files.evidenceDetail")}
            </p>
          </div>
        </div>
        <div className="file-evidence-metrics">
          <EvidenceMetric
            label={i18n.t("workbench.files.attachedContext")}
            value={String(model.contextCount)}
          />
          <EvidenceMetric
            label={i18n.t("workbench.files.changedFiles")}
            value={String(model.changedFileCount)}
          />
          <EvidenceMetric
            label={i18n.t("workbench.files.privacyBoundary")}
            value={i18n.t("workbench.context.metadataOnly")}
          />
        </div>
        <p className="mt-3 rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 text-xs leading-5 text-[color:var(--ink-soft)]">
          {i18n.t("workbench.files.providerPromptBoundary")}
        </p>
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void attachFileContext()}
            disabled={!activeSession}
          >
            <FilePlus size={14} />
            {i18n.t("workbench.context.attachFile")}
          </Button>
        </div>
      </div>

      {hasEvidence ? (
        <div className="mt-3 space-y-3">
          <EvidencePreviewCard
            i18n={i18n}
            onQueueFollowUp={queueSelectedEvidenceFollowUp}
            selection={selectedEvidence}
          />

          <EvidenceSection
            count={model.changedFileCount}
            title={i18n.t("workbench.files.changedFiles")}
          >
            {model.changedFileItems.length ? (
              <div className="space-y-2">
                {model.changedFileItems.map((item) => (
                  <ChangedFileCard
                    key={item.id}
                    i18n={i18n}
                    item={item}
                    onSelect={() => setSelectedEvidenceId(item.id)}
                    selected={resolvedSelectedEvidenceId === item.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState text={i18n.t("workbench.files.noChangedFiles")} />
            )}
          </EvidenceSection>

          <EvidenceSection
            count={model.contextCount}
            title={i18n.t("workbench.files.attachedContext")}
          >
            {model.contextItems.length ? (
              <div className="space-y-2">
                {model.contextItems.map((item) => (
                  <ContextEvidenceCard
                    key={item.id}
                    i18n={i18n}
                    item={item}
                    onSelect={() => setSelectedEvidenceId(item.id)}
                    selected={resolvedSelectedEvidenceId === item.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState text={i18n.t("workbench.context.empty")} />
            )}
          </EvidenceSection>
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState text={i18n.t("workbench.files.noEvidence")} />
        </div>
      )}
    </TabsContent>
  );
}

function EvidencePreviewCard({
  i18n,
  onQueueFollowUp,
  selection
}: {
  readonly i18n: UiI18n;
  readonly onQueueFollowUp: () => void;
  readonly selection?: FileEvidenceSelection;
}) {
  if (!selection) {
    return (
      <section className="file-evidence-preview-card">
        <div className="review-section-heading">
          <h3>{i18n.t("workbench.files.previewTitle")}</h3>
        </div>
        <EmptyState text={i18n.t("workbench.files.noEvidence")} />
      </section>
    );
  }

  const title =
    selection.type === "changed-file" ? selection.item.path : selection.item.title;
  const eyebrow =
    selection.type === "changed-file"
      ? selection.item.changeKind
      : formatContextKindLabel(i18n, selection.item.kind);

  return (
    <section
      className="file-evidence-preview-card"
      aria-label={i18n.t("workbench.files.previewTitle")}
    >
      <div className="review-section-heading">
        <h3>{i18n.t("workbench.files.previewTitle")}</h3>
      </div>
      <div className="file-evidence-preview-header">
        <div className="min-w-0">
          <p className="muted-meta">{eyebrow}</p>
          <h3 className="truncate text-sm font-semibold text-[color:var(--ink)]">{title}</h3>
        </div>
        <span className="status-pill status-neutral">
          {selection.type === "changed-file"
            ? formatDiffStat(selection.item)
            : formatContentState(i18n, selection.item.contentState)}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
        {i18n.t("workbench.files.previewDetail")}
      </p>
      <dl className="file-evidence-details">
        {selection.type === "changed-file" ? (
          <>
            <EvidenceDetail
              label={i18n.t("workbench.files.diffSource")}
              value={selection.item.diffTitle ?? selection.item.diffId}
            />
            {selection.item.diffSummary ? (
              <EvidenceDetail
                label={i18n.t("workbench.context.summary")}
                value={selection.item.diffSummary}
              />
            ) : null}
          </>
        ) : (
          <>
            {selection.item.path ? (
              <EvidenceDetail
                label={i18n.t("workbench.context.path")}
                value={selection.item.path}
              />
            ) : null}
            {selection.item.range ? (
              <EvidenceDetail
                label={i18n.t("workbench.context.range")}
                value={formatEvidenceRange(selection.item.range)}
              />
            ) : null}
            <EvidenceDetail
              label={i18n.t("workbench.context.provenance")}
              value={selection.item.provenance}
            />
            {selection.item.summary ? (
              <EvidenceDetail
                label={i18n.t("workbench.context.summary")}
                value={selection.item.summary}
              />
            ) : null}
          </>
        )}
        <EvidenceDetail
          label={i18n.t("workbench.files.privacyBoundary")}
          value={i18n.t("workbench.files.rawContentBoundary")}
        />
      </dl>
      <div className="mt-3 flex justify-end">
        <Button className="gap-2" onClick={onQueueFollowUp}>
          <MessageSquarePlus size={14} />
          {i18n.t("workbench.files.queueFollowUp")}
        </Button>
      </div>
    </section>
  );
}

function EvidenceSection({
  children,
  count,
  title
}: {
  readonly children: ReactNode;
  readonly count: number;
  readonly title: string;
}) {
  return (
    <section className="file-evidence-section">
      <div className="review-section-heading">
        <h3>{title}</h3>
        <span className="metric-pill">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ChangedFileCard({
  i18n,
  item,
  onSelect,
  selected
}: {
  readonly i18n: UiI18n;
  readonly item: FileEvidenceChangedFileItem;
  readonly onSelect: () => void;
  readonly selected: boolean;
}) {
  return (
    <button
      type="button"
      className={cn("file-evidence-card", selected && "file-evidence-card-selected")}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon file-evidence-icon-diff">
          <FileDiff size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{item.changeKind}</p>
          <h4 className="truncate font-mono text-sm font-semibold">{item.path}</h4>
        </div>
        <span className="status-pill status-neutral">
          {formatDiffStat({ additions: item.additions, deletions: item.deletions })}
        </span>
      </div>
      <dl className="file-evidence-details">
        <EvidenceDetail
          label={i18n.t("workbench.files.diffSource")}
          value={item.diffTitle ?? item.diffId}
        />
        {item.diffSummary ? (
          <EvidenceDetail label={i18n.t("workbench.context.summary")} value={item.diffSummary} />
        ) : null}
      </dl>
    </button>
  );
}

function ContextEvidenceCard({
  i18n,
  item,
  onSelect,
  selected
}: {
  readonly i18n: UiI18n;
  readonly item: FileEvidenceContextItem;
  readonly onSelect: () => void;
  readonly selected: boolean;
}) {
  return (
    <button
      type="button"
      className={cn("file-evidence-card", selected && "file-evidence-card-selected")}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon">
          <FileText size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{formatContextKindLabel(i18n, item.kind)}</p>
          <h4 className="truncate text-sm font-semibold">{item.title}</h4>
        </div>
        <span className="status-pill status-neutral">{formatContentState(i18n, item.contentState)}</span>
      </div>
      <dl className="file-evidence-details">
        {item.path ? <EvidenceDetail label={i18n.t("workbench.context.path")} value={item.path} /> : null}
        {item.range ? (
          <EvidenceDetail
            label={i18n.t("workbench.context.range")}
            value={formatEvidenceRange(item.range)}
          />
        ) : null}
        <EvidenceDetail label={i18n.t("workbench.context.provenance")} value={item.provenance} />
        {item.summary ? (
          <EvidenceDetail label={i18n.t("workbench.context.summary")} value={item.summary} />
        ) : null}
      </dl>
    </button>
  );
}

function EvidenceMetric({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="file-evidence-metric">
      <ShieldCheck size={14} />
      <div className="min-w-0">
        <p className="muted-meta">{label}</p>
        <p className="truncate text-xs font-semibold text-[color:var(--ink)]">{value}</p>
      </div>
    </div>
  );
}

function EvidenceDetail({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt className="muted-meta">{label}</dt>
      <dd className="mt-1 break-words font-mono text-[color:var(--ink-soft)]">{value}</dd>
    </div>
  );
}

function formatContentState(i18n: UiI18n, value: string): string {
  switch (value) {
    case "metadata-only":
      return i18n.t("workbench.context.metadataOnly");
    case "redacted":
      return i18n.t("workbench.files.redacted");
    case "external-reference":
      return i18n.t("workbench.files.externalReference");
    default:
      return value;
  }
}

import type { UiI18n } from "@geond-agent/ui-workbench";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Download,
  FileDiff,
  FilePlus,
  FileText,
  FolderOpen,
  MessageSquarePlus,
  Paperclip,
  ShieldCheck,
  Star
} from "lucide-react";

import { Button } from "../../components/ui/button.js";
import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import { cn } from "../../lib/cn.js";
import {
  createEvidenceBundleDraft,
  createEvidenceBundleFileName,
  createEvidenceExportManifestDraft,
  createEvidenceExportManifestFileName,
  createEvidenceReportDraft,
  createEvidenceReportFileName,
  createWorkspaceEvidenceReportDraft,
  createWorkspaceEvidenceReportFileName,
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
import {
  groupRecentContextByWorkspace,
  type RecentContextItem,
  type RecentContextWorkspaceGroup
} from "../../lib/recent-context.js";
import { exportMarkdownFile } from "../../lib/text-export.js";
import { formatContextKindLabel } from "../../lib/workbench-format.js";
import type { ProjectedActiveSession, ProjectedSessionListItem } from "../../lib/workbench-types.js";

export function InspectorFilesTab({
  activeSession,
  attachRecentContext,
  attachFileContext,
  attachWorkspaceContext,
  enqueueSideChatDraft,
  inspectorData,
  i18n,
  projectedSessions,
  recentContextItems,
  setRunnerStatus,
  toggleRecentContextFavorite
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly attachRecentContext: (item: RecentContextItem) => void;
  readonly attachFileContext: () => void;
  readonly attachWorkspaceContext: () => void;
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly i18n: UiI18n;
  readonly projectedSessions: readonly ProjectedSessionListItem[];
  readonly recentContextItems: readonly RecentContextItem[];
  readonly setRunnerStatus: (status: string) => void;
  readonly toggleRecentContextFavorite: (itemId: string) => void;
}) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const model = createFileEvidencePreviewModel({ activeSession, inspectorData });
  const hasEvidence = model.contextCount > 0 || model.changedFileCount > 0;
  const favoriteContextItems = recentContextItems.filter((item) => item.favorite);
  const nonFavoriteContextItems = recentContextItems.filter((item) => !item.favorite);
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

  function queueEvidenceBundle() {
    if (!activeSession) {
      return;
    }

    enqueueSideChatDraft(
      createEvidenceBundleDraft({ activeSession, inspectorData }),
      activeSession.title
    );
  }

  function queueEvidenceReport() {
    if (!activeSession) {
      return;
    }

    enqueueSideChatDraft(
      createEvidenceReportDraft({ activeSession, inspectorData }),
      i18n.t("workbench.files.issueReport")
    );
  }

  async function exportEvidenceReport() {
    if (!activeSession) {
      return;
    }

    const result = await exportMarkdownFile({
      fileName: createEvidenceReportFileName({ activeSession }),
      text: createEvidenceReportDraft({ activeSession, inspectorData }),
      title: i18n.t("workbench.files.exportIssueReport")
    });
    setRunnerStatus(
      result === "saved"
        ? i18n.t("workbench.files.issueReportExportSaved")
        : result === "downloaded"
          ? i18n.t("workbench.files.issueReportExportDownloaded")
          : i18n.t("workbench.files.issueReportExportCancelled")
    );
  }

  function queueWorkspaceReport() {
    enqueueSideChatDraft(
      createWorkspaceEvidenceReportDraft({
        activeSession,
        inspectorData,
        sessions: projectedSessions
      }),
      i18n.t("workbench.files.workspaceReport")
    );
  }

  function queueEvidenceManifest() {
    enqueueSideChatDraft(
      createEvidenceExportManifestDraft({
        activeSession,
        inspectorData,
        recentContextItems,
        sessions: projectedSessions
      }),
      i18n.t("workbench.files.exportManifest")
    );
  }

  async function exportEvidenceManifest() {
    const result = await exportMarkdownFile({
      fileName: createEvidenceExportManifestFileName(),
      text: createEvidenceExportManifestDraft({
        activeSession,
        inspectorData,
        recentContextItems,
        sessions: projectedSessions
      }),
      title: i18n.t("workbench.files.exportManifest")
    });
    setRunnerStatus(
      result === "saved"
        ? i18n.t("workbench.files.exportManifestSaved")
        : result === "downloaded"
          ? i18n.t("workbench.files.exportManifestDownloaded")
          : i18n.t("workbench.files.exportManifestCancelled")
    );
  }

  async function exportWorkspaceReport() {
    const result = await exportMarkdownFile({
      fileName: createWorkspaceEvidenceReportFileName(),
      text: createWorkspaceEvidenceReportDraft({
        activeSession,
        inspectorData,
        sessions: projectedSessions
      }),
      title: i18n.t("workbench.files.exportWorkspaceReport")
    });
    setRunnerStatus(
      result === "saved"
        ? i18n.t("workbench.files.workspaceReportExportSaved")
        : result === "downloaded"
          ? i18n.t("workbench.files.workspaceReportExportDownloaded")
          : i18n.t("workbench.files.workspaceReportExportCancelled")
    );
  }

  async function exportEvidenceBundle() {
    if (!activeSession) {
      return;
    }

    const result = await exportMarkdownFile({
      fileName: createEvidenceBundleFileName({ activeSession }),
      text: createEvidenceBundleDraft({ activeSession, inspectorData }),
      title: i18n.t("workbench.files.exportEvidenceBundle")
    });
    setRunnerStatus(
      result === "saved"
        ? i18n.t("workbench.files.exportSaved")
        : result === "downloaded"
          ? i18n.t("workbench.files.exportDownloaded")
          : i18n.t("workbench.files.exportCancelled")
    );
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
        <p className="mt-3 border-t border-white/[0.055] px-1 pt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
          {i18n.t("workbench.files.providerPromptBoundary")}
        </p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void attachWorkspaceContext()}
            disabled={!activeSession}
          >
            <Paperclip size={14} />
            {i18n.t("workbench.context.attachWorkspace")}
          </Button>
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

      <EvidenceExportSection
        activeSession={activeSession}
        exportEvidenceBundle={() => void exportEvidenceBundle()}
        exportEvidenceManifest={() => void exportEvidenceManifest()}
        exportEvidenceReport={() => void exportEvidenceReport()}
        exportWorkspaceReport={() => void exportWorkspaceReport()}
        i18n={i18n}
        queueEvidenceBundle={queueEvidenceBundle}
        queueEvidenceManifest={queueEvidenceManifest}
        queueEvidenceReport={queueEvidenceReport}
        queueWorkspaceReport={queueWorkspaceReport}
      />

      {favoriteContextItems.length > 0 ? (
        <RecentContextSection
          attachRecentContext={attachRecentContext}
          count={favoriteContextItems.length}
          i18n={i18n}
          items={favoriteContextItems}
          title={i18n.t("workbench.files.favoriteContext")}
          toggleRecentContextFavorite={toggleRecentContextFavorite}
          workspaceHints={recentContextItems}
        />
      ) : null}

      {recentContextItems.length > 0 ? (
        <RecentContextSection
          attachRecentContext={attachRecentContext}
          count={nonFavoriteContextItems.length}
          i18n={i18n}
          items={nonFavoriteContextItems}
          title={i18n.t("workbench.files.recentContext")}
          toggleRecentContextFavorite={toggleRecentContextFavorite}
          workspaceHints={recentContextItems}
        />
      ) : null}

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

function EvidenceExportSection({
  activeSession,
  exportEvidenceBundle,
  exportEvidenceManifest,
  exportEvidenceReport,
  exportWorkspaceReport,
  i18n,
  queueEvidenceBundle,
  queueEvidenceManifest,
  queueEvidenceReport,
  queueWorkspaceReport
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly exportEvidenceBundle: () => void;
  readonly exportEvidenceManifest: () => void;
  readonly exportEvidenceReport: () => void;
  readonly exportWorkspaceReport: () => void;
  readonly i18n: UiI18n;
  readonly queueEvidenceBundle: () => void;
  readonly queueEvidenceManifest: () => void;
  readonly queueEvidenceReport: () => void;
  readonly queueWorkspaceReport: () => void;
}) {
  return (
    <EvidenceSection count={4} title={i18n.t("workbench.files.exportPackage")}>
      <div className="grid gap-2">
        <ExportActionCard
          disabled={!activeSession}
          icon={<FileText size={15} />}
          i18n={i18n}
          onExport={exportEvidenceBundle}
          onQueue={queueEvidenceBundle}
          primaryLabel={i18n.t("workbench.files.queueEvidenceBundle")}
          secondaryLabel={i18n.t("workbench.files.exportEvidenceBundle")}
          title={i18n.t("workbench.files.evidenceBundle")}
        />
        <ExportActionCard
          disabled={!activeSession}
          icon={<FileText size={15} />}
          i18n={i18n}
          onExport={exportEvidenceReport}
          onQueue={queueEvidenceReport}
          primaryLabel={i18n.t("workbench.files.queueIssueReport")}
          secondaryLabel={i18n.t("workbench.files.exportIssueReport")}
          title={i18n.t("workbench.files.issueReport")}
        />
        <ExportActionCard
          icon={<FolderOpen size={15} />}
          i18n={i18n}
          onExport={exportWorkspaceReport}
          onQueue={queueWorkspaceReport}
          primaryLabel={i18n.t("workbench.files.queueWorkspaceReport")}
          secondaryLabel={i18n.t("workbench.files.exportWorkspaceReport")}
          title={i18n.t("workbench.files.workspaceReport")}
        />
        <ExportActionCard
          icon={<ShieldCheck size={15} />}
          i18n={i18n}
          onExport={exportEvidenceManifest}
          onQueue={queueEvidenceManifest}
          primaryLabel={i18n.t("workbench.files.queueExportManifest")}
          secondaryLabel={i18n.t("workbench.files.exportManifest")}
          title={i18n.t("workbench.files.exportManifest")}
        />
      </div>
    </EvidenceSection>
  );
}

function ExportActionCard({
  disabled = false,
  icon,
  i18n,
  onExport,
  onQueue,
  primaryLabel,
  secondaryLabel,
  title
}: {
  readonly disabled?: boolean;
  readonly icon: ReactNode;
  readonly i18n: UiI18n;
  readonly onExport: () => void;
  readonly onQueue: () => void;
  readonly primaryLabel: string;
  readonly secondaryLabel: string;
  readonly title: string;
}) {
  return (
    <div className="file-evidence-card">
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{i18n.t("workbench.context.metadataOnly")}</p>
          <h4 className="truncate text-sm font-semibold">{title}</h4>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" className="gap-2" onClick={onQueue} disabled={disabled}>
          <MessageSquarePlus size={14} />
          {primaryLabel}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onExport} disabled={disabled}>
          <Download size={14} />
          {secondaryLabel}
        </Button>
      </div>
    </div>
  );
}

function RecentContextSection({
  attachRecentContext,
  count,
  i18n,
  items,
  title,
  toggleRecentContextFavorite,
  workspaceHints
}: {
  readonly attachRecentContext: (item: RecentContextItem) => void;
  readonly count: number;
  readonly i18n: UiI18n;
  readonly items: readonly RecentContextItem[];
  readonly title: string;
  readonly toggleRecentContextFavorite: (itemId: string) => void;
  readonly workspaceHints: readonly RecentContextItem[];
}) {
  if (!items.length) {
    return null;
  }

  const groups = groupRecentContextByWorkspace(items, workspaceHints);

  return (
    <EvidenceSection count={count} title={title}>
      <div className="space-y-3">
        {groups.map((group) => (
          <RecentContextWorkspaceGroupBlock
            attachRecentContext={attachRecentContext}
            group={group}
            i18n={i18n}
            key={group.id}
            toggleRecentContextFavorite={toggleRecentContextFavorite}
          />
        ))}
      </div>
    </EvidenceSection>
  );
}

function RecentContextWorkspaceGroupBlock({
  attachRecentContext,
  group,
  i18n,
  toggleRecentContextFavorite
}: {
  readonly attachRecentContext: (item: RecentContextItem) => void;
  readonly group: RecentContextWorkspaceGroup;
  readonly i18n: UiI18n;
  readonly toggleRecentContextFavorite: (itemId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h4 className="truncate text-xs font-semibold text-[color:var(--ink)]">{group.label}</h4>
          <p className="truncate text-[11px] text-[color:var(--ink-muted)]">{group.path}</p>
        </div>
        <span className="metric-pill">{group.items.length}</span>
      </div>
      <div className="space-y-2">
        {group.items.map((item) => (
          <RecentContextCard
            key={item.id}
            i18n={i18n}
            item={item}
            onAttach={() => attachRecentContext(item)}
            onToggleFavorite={() => toggleRecentContextFavorite(item.id)}
          />
        ))}
      </div>
    </div>
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

function RecentContextCard({
  i18n,
  item,
  onAttach,
  onToggleFavorite
}: {
  readonly i18n: UiI18n;
  readonly item: RecentContextItem;
  readonly onAttach: () => void;
  readonly onToggleFavorite: () => void;
}) {
  return (
    <div className="file-evidence-card">
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon">
          {item.kind === "workspace" ? <FolderOpen size={15} /> : <FileText size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{formatRecentContextKindLabel(i18n, item.kind)}</p>
          <h4 className="truncate text-sm font-semibold">{item.label}</h4>
        </div>
        <span className="status-pill status-neutral">
          {i18n.t("workbench.context.metadataOnly")}
        </span>
      </div>
      <dl className="file-evidence-details">
        <EvidenceDetail label={i18n.t("workbench.context.path")} value={item.path} />
      </dl>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={onToggleFavorite}
          aria-label={
            item.favorite
              ? i18n.t("workbench.files.unmarkFavorite")
              : i18n.t("workbench.files.markFavorite")
          }
        >
          <Star size={14} fill={item.favorite ? "currentColor" : "none"} />
          {item.favorite
            ? i18n.t("workbench.files.favorited")
            : i18n.t("workbench.files.favorite")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onAttach}>
          <Paperclip size={14} />
          {i18n.t("workbench.files.attachRecentContext")}
        </Button>
      </div>
    </div>
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

function formatRecentContextKindLabel(i18n: UiI18n, value: RecentContextItem["kind"]): string {
  return value === "workspace"
    ? i18n.t("workbench.context.kind.workspace")
    : i18n.t("workbench.context.kind.file");
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

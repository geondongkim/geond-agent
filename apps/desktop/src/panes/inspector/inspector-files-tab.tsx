import type { UiI18n } from "@geond-agent/ui-workbench";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Camera,
  Download,
  FileDiff,
  FilePlus,
  FileText,
  FolderOpen,
  ListChecks,
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
  createEvidenceCaptureReadiness,
  type EvidenceCaptureReadiness
} from "../../lib/evidence-capture.js";
import {
  createDogfoodWorkflowSummary,
  type DogfoodWorkflowAction,
  type DogfoodWorkflowSummary
} from "../../lib/dogfood-workflow-summary.js";
import {
  createMultiSessionTraceBundleArtifact,
  createScreenshotManifestArtifact,
  createStructuredTraceArtifact,
  createVisualCapturePolicyArtifact,
  type EvidenceCaptureArtifact,
  type EvidenceCaptureArtifactKind,
  type VisualCaptureReviewState
} from "../../lib/evidence-capture-export.js";
import {
  createEvidenceBundleDraft,
  createEvidenceBundleFileName,
  createEvidenceExportManifestDraft,
  createEvidenceExportManifestFileName,
  createEvidenceReportDraft,
  createEvidenceReportFileName,
  createLiveDogfoodRunbookDraft,
  createLiveDogfoodRunbookFileName,
  createMultiSessionIssueReportDraft,
  createMultiSessionIssueReportFileName,
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
  createLiveDogfoodRunbook,
  type LiveDogfoodRunbook,
  type LiveDogfoodRunbookStep,
  type LiveDogfoodRunbookStepStatus
} from "../../lib/live-dogfood-runbook.js";
import {
  createRawVisualCaptureFileName,
  createRawVisualCaptureReadiness,
  exportRawVisualCapturePng,
  type RawVisualCaptureExportResult
} from "../../lib/raw-visual-capture-export.js";
import {
  groupRecentContextByWorkspace,
  type RecentContextItem,
  type RecentContextWorkspaceGroup
} from "../../lib/recent-context.js";
import type { EvidenceExportPreferences } from "../../lib/evidence-export-preferences.js";
import {
  exportJsonArtifact,
  exportMarkdownFile,
  type TextExportResult
} from "../../lib/text-export.js";
import { formatContextKindLabel } from "../../lib/workbench-format.js";
import type { ProjectedActiveSession, ProjectedSessionListItem } from "../../lib/workbench-types.js";

export function InspectorFilesTab({
  activeSession,
  attachRecentContext,
  attachFileContext,
  attachWorkspaceContext,
  enqueueSideChatDraft,
  evidenceExportPreferences,
  inspectorData,
  i18n,
  projectedSessions,
  recentContextItems,
  setRunnerStatus,
  toggleRecentContextFavorite,
  updateEvidenceExportPreferences
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly attachRecentContext: (item: RecentContextItem) => void;
  readonly attachFileContext: () => void;
  readonly attachWorkspaceContext: () => void;
  readonly enqueueSideChatDraft: (text: string, sourceLabel?: string) => void;
  readonly evidenceExportPreferences: EvidenceExportPreferences;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly i18n: UiI18n;
  readonly projectedSessions: readonly ProjectedSessionListItem[];
  readonly recentContextItems: readonly RecentContextItem[];
  readonly setRunnerStatus: (status: string) => void;
  readonly toggleRecentContextFavorite: (itemId: string) => void;
  readonly updateEvidenceExportPreferences: (
    patch: Partial<EvidenceExportPreferences>
  ) => void;
}) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | undefined>();
  const visualReview = evidenceExportPreferences.visualReview;
  const model = createFileEvidencePreviewModel({ activeSession, inspectorData });
  const hasEvidence = model.contextCount > 0 || model.changedFileCount > 0;
  const favoriteContextItems = recentContextItems.filter((item) => item.favorite);
  const nonFavoriteContextItems = recentContextItems.filter((item) => !item.favorite);
  const selectedEvidence = findFileEvidenceSelection(model, selectedEvidenceId);
  const resolvedSelectedEvidenceId = getFileEvidenceSelectionId(selectedEvidence);
  const captureReadiness = createEvidenceCaptureReadiness();
  const allExportSessionIds = projectedSessions.map((session) => session.id);
  const attentionExportSessionIds = projectedSessions
    .filter(
      (session) =>
        session.errorCount > 0 ||
        session.warningCount > 0 ||
        session.pendingApprovalCount > 0 ||
        session.resumable
    )
    .map((session) => session.id);
  const validExportSessionIds = new Set(allExportSessionIds);
  const requestedExportSessionIds =
    evidenceExportPreferences.exportScopeMode === "custom"
      ? evidenceExportPreferences.selectedSessionIds
      : evidenceExportPreferences.exportScopeMode === "attention"
        ? attentionExportSessionIds
        : allExportSessionIds;
  const resolvedSelectedExportSessionIds = requestedExportSessionIds.filter((sessionId) =>
    validExportSessionIds.has(sessionId)
  );
  const selectedExportSessionSet = new Set(resolvedSelectedExportSessionIds);
  const selectedExportSessions = projectedSessions.filter((session) =>
    selectedExportSessionSet.has(session.id)
  );
  const selectedExportSessionCount = selectedExportSessions.length;
  const dogfoodWorkflowSummary = createDogfoodWorkflowSummary({
    activeSession,
    inspectorData,
    selectedSessions: selectedExportSessions,
    sessions: projectedSessions,
    visualReview
  });
  const liveDogfoodRunbook = createLiveDogfoodRunbook({
    activeSession,
    inspectorData,
    projectedSessions,
    selectedSessions: selectedExportSessions,
    visualReview
  });
  const rawVisualCaptureReadiness = createRawVisualCaptureReadiness({
    activeSession,
    visualReview
  });

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

  function queueMultiSessionReport() {
    enqueueSideChatDraft(
      createMultiSessionIssueReportDraft({
        activeSession,
        inspectorData,
        sessions: selectedExportSessions
      }),
      i18n.t("workbench.files.multiSessionIssueReport")
    );
  }

  async function exportMultiSessionReport() {
    const result = await exportMarkdownFile({
      fileName: createMultiSessionIssueReportFileName(),
      text: createMultiSessionIssueReportDraft({
        activeSession,
        inspectorData,
        sessions: selectedExportSessions
      }),
      title: i18n.t("workbench.files.exportMultiSessionIssueReport")
    });
    setRunnerStatus(
      result === "saved"
        ? i18n.t("workbench.files.multiSessionReportExportSaved")
        : result === "downloaded"
          ? i18n.t("workbench.files.multiSessionReportExportDownloaded")
          : i18n.t("workbench.files.multiSessionReportExportCancelled")
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

  function queueLiveDogfoodRunbook() {
    enqueueSideChatDraft(
      createLiveDogfoodRunbookDraft({
        activeSession,
        inspectorData,
        sessions: selectedExportSessions
      }),
      i18n.t("workbench.files.liveDogfoodRunbook")
    );
  }

  async function exportLiveDogfoodRunbook() {
    const result = await exportMarkdownFile({
      fileName: createLiveDogfoodRunbookFileName(),
      text: createLiveDogfoodRunbookDraft({
        activeSession,
        inspectorData,
        sessions: selectedExportSessions
      }),
      title: i18n.t("workbench.files.exportLiveDogfoodRunbook")
    });
    setRunnerStatus(
      result === "saved"
        ? i18n.t("workbench.files.liveDogfoodRunbookExportSaved")
        : result === "downloaded"
          ? i18n.t("workbench.files.liveDogfoodRunbookExportDownloaded")
          : i18n.t("workbench.files.liveDogfoodRunbookExportCancelled")
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

  async function exportScreenshotManifest() {
    const artifact = createScreenshotManifestArtifact({
      activeSession,
      inspectorData,
      projectedSessions
    });
    const result = await exportCaptureArtifact(
      artifact,
      i18n.t("workbench.files.exportScreenshotManifest")
    );
    setRunnerStatus(formatCaptureExportStatus(i18n, "screenshot-manifest", result));
  }

  async function exportStructuredTrace() {
    const artifact = createStructuredTraceArtifact({
      activeSession,
      inspectorData,
      projectedSessions
    });
    const result = await exportCaptureArtifact(
      artifact,
      i18n.t("workbench.files.exportStructuredTrace")
    );
    setRunnerStatus(formatCaptureExportStatus(i18n, "structured-trace", result));
  }

  async function exportMultiSessionTraceBundle() {
    const artifact = createMultiSessionTraceBundleArtifact({
      activeSession,
      inspectorData,
      projectedSessions: selectedExportSessions
    });
    const result = await exportCaptureArtifact(
      artifact,
      i18n.t("workbench.files.exportMultiSessionTraceBundle")
    );
    setRunnerStatus(formatCaptureExportStatus(i18n, "multi-session-trace-bundle", result));
  }

  async function exportVisualCapturePolicy() {
    const artifact = createVisualCapturePolicyArtifact({
      activeSession,
      inspectorData,
      projectedSessions,
      visualReview
    });
    const result = await exportCaptureArtifact(
      artifact,
      i18n.t("workbench.files.exportVisualCapturePolicy")
    );
    setRunnerStatus(formatCaptureExportStatus(i18n, "visual-capture-policy", result));
  }

  async function exportRawVisualCapture() {
    const result = await exportRawVisualCapturePng({
      activeSession,
      fileName: createRawVisualCaptureFileName({ activeSession }),
      title: i18n.t("workbench.files.exportRawVisualCapturePng"),
      visualReview
    });
    setRunnerStatus(formatRawVisualCaptureExportStatus(i18n, result));
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

      <MultiSessionExportScopeSection
        i18n={i18n}
        onReset={() =>
          updateEvidenceExportPreferences({
            exportScopeMode: "all",
            selectedSessionIds: []
          })
        }
        onSelectAll={() =>
          updateEvidenceExportPreferences({
            exportScopeMode: "all",
            selectedSessionIds: []
          })
        }
        onSelectAttention={() =>
          updateEvidenceExportPreferences({
            exportScopeMode: "attention",
            selectedSessionIds: attentionExportSessionIds
          })
        }
        onToggleSession={(sessionId) => {
          const next = selectedExportSessionSet.has(sessionId)
            ? resolvedSelectedExportSessionIds.filter((id) => id !== sessionId)
            : [...resolvedSelectedExportSessionIds, sessionId];
          updateEvidenceExportPreferences({
            exportScopeMode: "custom",
            selectedSessionIds: next
          });
        }}
        selectedSessionIds={selectedExportSessionSet}
        selectedSessionCount={selectedExportSessionCount}
        scopeMode={evidenceExportPreferences.exportScopeMode}
        sessions={projectedSessions}
      />

      <DogfoodWorkflowSection
        exportRunbook={() => void exportLiveDogfoodRunbook()}
        i18n={i18n}
        queueRunbook={queueLiveDogfoodRunbook}
        runbook={liveDogfoodRunbook}
        summary={dogfoodWorkflowSummary}
      />

      <EvidenceExportSection
        activeSession={activeSession}
        exportEvidenceBundle={() => void exportEvidenceBundle()}
        exportEvidenceManifest={() => void exportEvidenceManifest()}
        exportEvidenceReport={() => void exportEvidenceReport()}
        exportMultiSessionReport={() => void exportMultiSessionReport()}
        exportWorkspaceReport={() => void exportWorkspaceReport()}
        i18n={i18n}
        queueEvidenceBundle={queueEvidenceBundle}
        queueEvidenceManifest={queueEvidenceManifest}
        queueEvidenceReport={queueEvidenceReport}
        queueMultiSessionReport={queueMultiSessionReport}
        queueWorkspaceReport={queueWorkspaceReport}
      />

      <EvidenceCaptureBoundarySection
        disabled={!activeSession}
        exportMultiSessionTraceBundle={() => void exportMultiSessionTraceBundle()}
        exportRawVisualCapture={() => void exportRawVisualCapture()}
        exportScreenshotManifest={() => void exportScreenshotManifest()}
        exportStructuredTrace={() => void exportStructuredTrace()}
        exportVisualCapturePolicy={() => void exportVisualCapturePolicy()}
        i18n={i18n}
        items={captureReadiness}
        onToggleVisualReview={(key) =>
          updateEvidenceExportPreferences({
            visualReview: { ...visualReview, [key]: !visualReview[key] },
            visualReviewUpdatedAt: new Date().toISOString()
          })
        }
        onResetVisualReview={() =>
          updateEvidenceExportPreferences({
            visualReview: {
              explicitConsent: false,
              redactionReview: false,
              storagePathSelected: false,
              visibleContentReviewed: false
            },
            visualReviewUpdatedAt: undefined
          })
        }
        traceBundleDisabled={selectedExportSessions.length === 0}
        rawVisualCaptureDisabled={!rawVisualCaptureReadiness.canRequestCapture}
        visualReviewUpdatedAt={evidenceExportPreferences.visualReviewUpdatedAt}
        visualReview={visualReview}
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

function EvidenceCaptureBoundarySection({
  disabled,
  exportMultiSessionTraceBundle,
  exportRawVisualCapture,
  exportScreenshotManifest,
  exportStructuredTrace,
  exportVisualCapturePolicy,
  i18n,
  items,
  onToggleVisualReview,
  onResetVisualReview,
  rawVisualCaptureDisabled,
  traceBundleDisabled,
  visualReviewUpdatedAt,
  visualReview
}: {
  readonly disabled: boolean;
  readonly exportMultiSessionTraceBundle: () => void;
  readonly exportRawVisualCapture: () => void;
  readonly exportScreenshotManifest: () => void;
  readonly exportStructuredTrace: () => void;
  readonly exportVisualCapturePolicy: () => void;
  readonly i18n: UiI18n;
  readonly items: readonly EvidenceCaptureReadiness[];
  readonly onToggleVisualReview: (key: keyof VisualCaptureReviewState) => void;
  readonly onResetVisualReview: () => void;
  readonly rawVisualCaptureDisabled: boolean;
  readonly traceBundleDisabled: boolean;
  readonly visualReviewUpdatedAt?: string;
  readonly visualReview: VisualCaptureReviewState;
}) {
  return (
    <EvidenceSection count={items.length} title={i18n.t("workbench.files.captureBoundary")}>
      <p className="mb-3 px-1 text-xs leading-5 text-[color:var(--ink-soft)]">
        {i18n.t("workbench.files.captureBoundaryDetail")}
      </p>
      <div className="grid gap-2">
        {items.map((item) => (
          <EvidenceCaptureBoundaryCard
            disabled={disabled}
            exportScreenshotManifest={exportScreenshotManifest}
            exportStructuredTrace={exportStructuredTrace}
            i18n={i18n}
            item={item}
            key={item.kind}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        <CaptureExportAction
          disabled={traceBundleDisabled}
          icon={<FileText size={15} />}
          label={i18n.t("workbench.files.exportMultiSessionTraceBundle")}
          metaLabel={i18n.t("workbench.context.metadataOnly")}
          onExport={exportMultiSessionTraceBundle}
          title={i18n.t("workbench.files.multiSessionTraceBundle")}
        />
        <CaptureExportAction
          disabled={false}
          icon={<ShieldCheck size={15} />}
          label={i18n.t("workbench.files.exportVisualCapturePolicy")}
          metaLabel={i18n.t("workbench.context.metadataOnly")}
          onExport={exportVisualCapturePolicy}
          title={i18n.t("workbench.files.visualCapturePolicy")}
        />
        <CaptureExportAction
          disabled={disabled || rawVisualCaptureDisabled}
          icon={<Camera size={15} />}
          label={i18n.t("workbench.files.exportRawVisualCapturePng")}
          metaLabel={i18n.t("workbench.files.rawVisualCaptureStorage")}
          onExport={exportRawVisualCapture}
          title={i18n.t("workbench.files.rawVisualCapturePng")}
        />
      </div>
      <VisualCaptureReviewSection
        i18n={i18n}
        onToggle={onToggleVisualReview}
        onReset={onResetVisualReview}
        review={visualReview}
        updatedAt={visualReviewUpdatedAt}
      />
    </EvidenceSection>
  );
}

function MultiSessionExportScopeSection({
  i18n,
  onSelectAll,
  onSelectAttention,
  onReset,
  onToggleSession,
  scopeMode,
  selectedSessionCount,
  selectedSessionIds,
  sessions
}: {
  readonly i18n: UiI18n;
  readonly onSelectAll: () => void;
  readonly onSelectAttention: () => void;
  readonly onReset: () => void;
  readonly onToggleSession: (sessionId: string) => void;
  readonly scopeMode: EvidenceExportPreferences["exportScopeMode"];
  readonly selectedSessionCount: number;
  readonly selectedSessionIds: ReadonlySet<string>;
  readonly sessions: readonly ProjectedSessionListItem[];
}) {
  if (!sessions.length) {
    return null;
  }

  return (
    <EvidenceSection count={selectedSessionCount} title={i18n.t("workbench.files.exportScope")}>
      <p className="mb-3 px-1 text-xs leading-5 text-[color:var(--ink-soft)]">
        {i18n.t("workbench.files.exportScopeDetail")}
      </p>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <span className="status-pill status-neutral">
          {i18n.t("workbench.files.savedLocalPreference")}: {scopeMode}
        </span>
        <Button variant="ghost" className="gap-2" onClick={onSelectAttention}>
          <ShieldCheck size={14} />
          {i18n.t("workbench.files.selectAttentionSessions")}
        </Button>
        <Button variant="outline" className="gap-2" onClick={onSelectAll}>
          <FolderOpen size={14} />
          {i18n.t("workbench.files.selectAllSessions")}
        </Button>
        <Button variant="ghost" className="gap-2" onClick={onReset}>
          {i18n.t("workbench.files.resetExportScope")}
        </Button>
      </div>
      <div className="grid gap-2">
        {sessions.map((session) => (
          <label className="file-evidence-card" key={session.id}>
            <div className="file-evidence-card-header">
              <input
                aria-label={`${i18n.t("workbench.files.includeSession")} ${session.title}`}
                checked={selectedSessionIds.has(session.id)}
                className="accent-[color:var(--accent)]"
                onChange={() => onToggleSession(session.id)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1">
                <p className="muted-meta">{session.lifecycle}</p>
                <h4 className="truncate text-sm font-semibold">{session.title}</h4>
              </div>
              <span className="status-pill status-neutral">
                {session.errorCount > 0 || session.warningCount > 0
                  ? i18n.t("workbench.files.attention")
                  : i18n.t("workbench.status.ready")}
              </span>
            </div>
            <dl className="file-evidence-details">
              <EvidenceDetail label={i18n.t("workbench.files.sessionId")} value={session.id} />
              <EvidenceDetail
                label={i18n.t("workbench.files.sessionSignals")}
                value={`approvals=${session.pendingApprovalCount} warnings=${session.warningCount} errors=${session.errorCount} resumable=${session.resumable ? "yes" : "no"}`}
              />
            </dl>
          </label>
        ))}
      </div>
    </EvidenceSection>
  );
}

function DogfoodWorkflowSection({
  exportRunbook,
  i18n,
  queueRunbook,
  runbook,
  summary
}: {
  readonly exportRunbook: () => void;
  readonly i18n: UiI18n;
  readonly queueRunbook: () => void;
  readonly runbook: LiveDogfoodRunbook;
  readonly summary: DogfoodWorkflowSummary;
}) {
  return (
    <EvidenceSection
      count={summary.recommendedActions.length}
      title={i18n.t("workbench.files.dogfoodWorkflow")}
    >
      <p className="mb-3 px-1 text-xs leading-5 text-[color:var(--ink-soft)]">
        {i18n.t("workbench.files.dogfoodWorkflowDetail")}
      </p>
      <div className="usage-grid">
        <EvidenceMetric
          label={i18n.t("workbench.files.dogfoodSelectedSessions")}
          value={`${summary.selectedSessionCount}/${summary.sessionCount}`}
        />
        <EvidenceMetric
          label={i18n.t("workbench.files.dogfoodAttentionSessions")}
          value={String(summary.attentionSessionCount)}
        />
        <EvidenceMetric
          label={i18n.t("workbench.files.dogfoodRunAttempts")}
          value={String(summary.runAttemptCount)}
        />
        <EvidenceMetric
          label={i18n.t("workbench.files.dogfoodSuccesses")}
          value={String(summary.liveSucceededCount)}
        />
        <EvidenceMetric
          label={i18n.t("workbench.files.dogfoodFailures")}
          value={String(summary.liveFailedCount + summary.liveCancelledCount)}
        />
        <EvidenceMetric
          label={i18n.t("workbench.files.dogfoodRouteSwitchCandidates")}
          value={String(summary.routeSwitchCandidateCount)}
        />
        <EvidenceMetric
          label={i18n.t("workbench.files.dogfoodVisualReview")}
          value={
            summary.visualReviewReady
              ? i18n.t("workbench.status.ready")
              : i18n.t("workbench.files.captureRequired")
          }
        />
        <EvidenceMetric
          label={i18n.t("workbench.issue.retryable")}
          value={String(summary.retryableIssueCount)}
        />
      </div>
      <div className="mt-3 file-evidence-card">
        <p className="muted-meta">{i18n.t("workbench.files.dogfoodNextActions")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[color:var(--ink-soft)]">
          {summary.recommendedActions.map((action) => (
            <li key={action}>{formatDogfoodActionLabel(i18n, action)}</li>
          ))}
        </ul>
      </div>
      <div className="mt-3 file-evidence-card">
        <div className="file-evidence-card-header">
          <span className="file-evidence-icon">
            <ListChecks size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="muted-meta">{i18n.t("workbench.files.liveDogfoodRunbook")}</p>
            <h4 className="truncate text-sm font-semibold">
              {i18n.t("workbench.files.liveDogfoodRunbookDetail")}
            </h4>
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          {runbook.steps.map((step) => (
            <LiveDogfoodStepCard i18n={i18n} key={step.id} step={step} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" className="gap-2" onClick={queueRunbook}>
            <MessageSquarePlus size={14} />
            {i18n.t("workbench.files.queueLiveDogfoodRunbook")}
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportRunbook}>
            <Download size={14} />
            {i18n.t("workbench.files.exportLiveDogfoodRunbook")}
          </Button>
        </div>
      </div>
    </EvidenceSection>
  );
}

function LiveDogfoodStepCard({
  i18n,
  step
}: {
  readonly i18n: UiI18n;
  readonly step: LiveDogfoodRunbookStep;
}) {
  return (
    <div className="rounded-md border border-white/[0.055] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {formatLiveDogfoodStepTitle(i18n, step.id)}
          </p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
            {formatLiveDogfoodStepDetail(i18n, step.id)}
          </p>
        </div>
        <span className={cn("status-pill", liveDogfoodStepStatusTone(step.status))}>
          {formatLiveDogfoodStepStatus(i18n, step.status)}
        </span>
      </div>
    </div>
  );
}

function VisualCaptureReviewSection({
  i18n,
  onReset,
  onToggle,
  review,
  updatedAt
}: {
  readonly i18n: UiI18n;
  readonly onReset: () => void;
  readonly onToggle: (key: keyof VisualCaptureReviewState) => void;
  readonly review: VisualCaptureReviewState;
  readonly updatedAt?: string;
}) {
  const ready =
    review.explicitConsent &&
    review.redactionReview &&
    review.storagePathSelected &&
    review.visibleContentReviewed;
  const items: readonly {
    readonly key: keyof VisualCaptureReviewState;
    readonly label: string;
  }[] = [
    { key: "explicitConsent", label: i18n.t("workbench.files.visualConsentCheck") },
    { key: "redactionReview", label: i18n.t("workbench.files.visualRedactionCheck") },
    { key: "storagePathSelected", label: i18n.t("workbench.files.visualStorageCheck") },
    {
      key: "visibleContentReviewed",
      label: i18n.t("workbench.files.visualVisibleContentCheck")
    }
  ];

  return (
    <div className="mt-3 file-evidence-card">
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon">
          <Camera size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{i18n.t("workbench.files.visualCaptureReview")}</p>
          <h4 className="truncate text-sm font-semibold">
            {ready
              ? i18n.t("workbench.files.visualPolicyReviewed")
              : i18n.t("workbench.files.visualPolicyBlocked")}
          </h4>
        </div>
        <span className="status-pill status-neutral">
          {i18n.t("workbench.files.captureDeferred")}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
        {i18n.t("workbench.files.visualCaptureReviewDetail")}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="muted-meta">
          {updatedAt
            ? `${i18n.t("workbench.files.savedLocalPreference")}: ${updatedAt}`
            : i18n.t("workbench.files.savedLocalPreference")}
        </span>
        <Button variant="ghost" className="gap-2" onClick={onReset}>
          {i18n.t("workbench.files.resetVisualReview")}
        </Button>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <label
            className="flex items-start gap-2 rounded-md border border-white/[0.055] px-3 py-2 text-xs text-[color:var(--ink-soft)]"
            key={item.key}
          >
            <input
              aria-label={item.label}
              checked={review[item.key]}
              className="mt-0.5 accent-[color:var(--accent)]"
              onChange={() => onToggle(item.key)}
              type="checkbox"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function formatDogfoodActionLabel(i18n: UiI18n, action: DogfoodWorkflowAction): string {
  switch (action) {
    case "manual_route_switch_review":
      return i18n.t("workbench.files.dogfoodActionRouteSwitch");
    case "retry_resume_review":
      return i18n.t("workbench.files.dogfoodActionRetryResume");
    case "multi_session_issue_report":
      return i18n.t("workbench.files.dogfoodActionMultiSessionReport");
    case "visual_capture_policy_review":
      return i18n.t("workbench.files.dogfoodActionVisualPolicy");
    case "continue_dogfood":
      return i18n.t("workbench.files.dogfoodActionContinue");
  }
}

function formatLiveDogfoodStepTitle(
  i18n: UiI18n,
  id: LiveDogfoodRunbookStep["id"]
): string {
  switch (id) {
    case "route_switch":
      return i18n.t("workbench.files.liveDogfoodStepRouteSwitch");
    case "retry":
      return i18n.t("workbench.files.liveDogfoodStepRetry");
    case "cancel":
      return i18n.t("workbench.files.liveDogfoodStepCancel");
    case "resume":
      return i18n.t("workbench.files.liveDogfoodStepResume");
    case "evidence_export":
      return i18n.t("workbench.files.liveDogfoodStepEvidenceExport");
    case "raw_visual_capture":
      return i18n.t("workbench.files.liveDogfoodStepRawVisualCapture");
  }
}

function formatLiveDogfoodStepDetail(
  i18n: UiI18n,
  id: LiveDogfoodRunbookStep["id"]
): string {
  switch (id) {
    case "route_switch":
      return i18n.t("workbench.files.liveDogfoodStepRouteSwitchDetail");
    case "retry":
      return i18n.t("workbench.files.liveDogfoodStepRetryDetail");
    case "cancel":
      return i18n.t("workbench.files.liveDogfoodStepCancelDetail");
    case "resume":
      return i18n.t("workbench.files.liveDogfoodStepResumeDetail");
    case "evidence_export":
      return i18n.t("workbench.files.liveDogfoodStepEvidenceExportDetail");
    case "raw_visual_capture":
      return i18n.t("workbench.files.liveDogfoodStepRawVisualCaptureDetail");
  }
}

function formatLiveDogfoodStepStatus(
  i18n: UiI18n,
  status: LiveDogfoodRunbookStepStatus
): string {
  switch (status) {
    case "observed":
      return i18n.t("workbench.files.liveDogfoodStatusObserved");
    case "ready":
      return i18n.t("workbench.files.liveDogfoodStatusReady");
    case "attention":
      return i18n.t("workbench.files.liveDogfoodStatusAttention");
    case "blocked":
      return i18n.t("workbench.files.liveDogfoodStatusBlocked");
    case "pending":
      return i18n.t("workbench.files.liveDogfoodStatusPending");
  }
}

function liveDogfoodStepStatusTone(status: LiveDogfoodRunbookStepStatus): string {
  switch (status) {
    case "observed":
    case "ready":
      return "status-ok";
    case "attention":
      return "status-warn";
    case "blocked":
      return "status-danger";
    case "pending":
      return "status-neutral";
  }
}

function CaptureExportAction({
  disabled,
  icon,
  label,
  metaLabel,
  onExport,
  title
}: {
  readonly disabled: boolean;
  readonly icon: ReactNode;
  readonly label: string;
  readonly metaLabel: string;
  readonly onExport: () => void;
  readonly title: string;
}) {
  return (
    <div className="file-evidence-card">
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{metaLabel}</p>
          <h4 className="truncate text-sm font-semibold">{title}</h4>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="outline" className="gap-2" disabled={disabled} onClick={onExport}>
          <Download size={14} />
          {label}
        </Button>
      </div>
    </div>
  );
}

function EvidenceCaptureBoundaryCard({
  disabled,
  exportScreenshotManifest,
  exportStructuredTrace,
  i18n,
  item
}: {
  readonly disabled: boolean;
  readonly exportScreenshotManifest: () => void;
  readonly exportStructuredTrace: () => void;
  readonly i18n: UiI18n;
  readonly item: EvidenceCaptureReadiness;
}) {
  return (
    <div className="file-evidence-card">
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon">
          {item.kind === "screenshot" ? <Camera size={15} /> : <FileText size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{formatCaptureStatus(i18n, item)}</p>
          <h4 className="truncate text-sm font-semibold">
            {item.kind === "screenshot"
              ? i18n.t("workbench.files.screenshotBundle")
              : i18n.t("workbench.files.structuredTraceBundle")}
          </h4>
        </div>
        <span className="status-pill status-neutral">
          {i18n.t("workbench.files.captureDeferred")}
        </span>
      </div>
      <dl className="file-evidence-details">
        <EvidenceDetail
          label={i18n.t("workbench.files.captureConsentRequired")}
          value={item.consentGranted ? i18n.t("workbench.status.ready") : i18n.t("workbench.files.captureRequired")}
        />
        <EvidenceDetail
          label={i18n.t("workbench.files.captureRedactionRequired")}
          value={item.redactionConfigured ? i18n.t("workbench.status.ready") : i18n.t("workbench.files.captureRequired")}
        />
        <EvidenceDetail
          label={i18n.t("workbench.files.captureRawPolicy")}
          value={item.rawStoragePolicy}
        />
      </dl>
      <div className="mt-3 flex justify-end">
        <Button
          variant="outline"
          className="gap-2"
          disabled={disabled}
          onClick={item.kind === "screenshot" ? exportScreenshotManifest : exportStructuredTrace}
        >
          <Download size={14} />
          {item.kind === "screenshot"
            ? i18n.t("workbench.files.exportScreenshotManifest")
            : i18n.t("workbench.files.exportStructuredTrace")}
        </Button>
      </div>
    </div>
  );
}

async function exportCaptureArtifact(
  artifact: EvidenceCaptureArtifact,
  title: string
): Promise<TextExportResult> {
  return exportJsonArtifact({
    fileName: artifact.fileName,
    kind: artifact.kind,
    text: artifact.text,
    title
  });
}

function formatCaptureExportStatus(
  i18n: UiI18n,
  kind: EvidenceCaptureArtifactKind,
  result: TextExportResult
): string {
  if (kind === "screenshot-manifest") {
    return result === "saved"
      ? i18n.t("workbench.files.screenshotManifestExportSaved")
      : result === "downloaded"
        ? i18n.t("workbench.files.screenshotManifestExportDownloaded")
        : i18n.t("workbench.files.screenshotManifestExportCancelled");
  }
  if (kind === "multi-session-trace-bundle") {
    return result === "saved"
      ? i18n.t("workbench.files.multiSessionTraceExportSaved")
      : result === "downloaded"
        ? i18n.t("workbench.files.multiSessionTraceExportDownloaded")
        : i18n.t("workbench.files.multiSessionTraceExportCancelled");
  }
  if (kind === "visual-capture-policy") {
    return result === "saved"
      ? i18n.t("workbench.files.visualCapturePolicyExportSaved")
      : result === "downloaded"
        ? i18n.t("workbench.files.visualCapturePolicyExportDownloaded")
        : i18n.t("workbench.files.visualCapturePolicyExportCancelled");
  }

  return result === "saved"
    ? i18n.t("workbench.files.structuredTraceExportSaved")
    : result === "downloaded"
      ? i18n.t("workbench.files.structuredTraceExportDownloaded")
      : i18n.t("workbench.files.structuredTraceExportCancelled");
}

function formatRawVisualCaptureExportStatus(
  i18n: UiI18n,
  result: RawVisualCaptureExportResult
): string {
  switch (result) {
    case "saved":
      return i18n.t("workbench.files.rawVisualCaptureSaved");
    case "cancelled":
      return i18n.t("workbench.files.rawVisualCaptureCancelled");
    case "blocked":
      return i18n.t("workbench.files.rawVisualCaptureBlocked");
    case "unsupported":
      return i18n.t("workbench.files.rawVisualCaptureUnsupported");
    case "failed":
      return i18n.t("workbench.files.rawVisualCaptureFailed");
  }
}

function EvidenceExportSection({
  activeSession,
  exportEvidenceBundle,
  exportEvidenceManifest,
  exportEvidenceReport,
  exportMultiSessionReport,
  exportWorkspaceReport,
  i18n,
  queueEvidenceBundle,
  queueEvidenceManifest,
  queueEvidenceReport,
  queueMultiSessionReport,
  queueWorkspaceReport
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly exportEvidenceBundle: () => void;
  readonly exportEvidenceManifest: () => void;
  readonly exportEvidenceReport: () => void;
  readonly exportMultiSessionReport: () => void;
  readonly exportWorkspaceReport: () => void;
  readonly i18n: UiI18n;
  readonly queueEvidenceBundle: () => void;
  readonly queueEvidenceManifest: () => void;
  readonly queueEvidenceReport: () => void;
  readonly queueMultiSessionReport: () => void;
  readonly queueWorkspaceReport: () => void;
}) {
  return (
    <EvidenceSection count={5} title={i18n.t("workbench.files.exportPackage")}>
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
          icon={<FileDiff size={15} />}
          i18n={i18n}
          onExport={exportMultiSessionReport}
          onQueue={queueMultiSessionReport}
          primaryLabel={i18n.t("workbench.files.queueMultiSessionReport")}
          secondaryLabel={i18n.t("workbench.files.exportMultiSessionIssueReport")}
          title={i18n.t("workbench.files.multiSessionIssueReport")}
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

function formatCaptureStatus(i18n: UiI18n, item: EvidenceCaptureReadiness): string {
  switch (item.status) {
    case "ready-for-export":
      return i18n.t("workbench.files.captureReady");
    case "redaction-not-configured":
      return i18n.t("workbench.files.captureRedactionRequired");
    case "requires-explicit-consent":
    default:
      return i18n.t("workbench.files.captureConsentRequired");
  }
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

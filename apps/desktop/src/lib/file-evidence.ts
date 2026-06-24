import { redactSensitiveTextContent } from "@geond-agent/claude-code-bridge";

import {
  createEvidenceCaptureReadiness,
  formatEvidenceCaptureReadinessForManifest
} from "./evidence-capture.js";
import {
  createDogfoodWorkflowSummary,
  formatDogfoodWorkflowSummaryForReport
} from "./dogfood-workflow-summary.js";
import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import {
  createLiveDogfoodRunbook,
  formatLiveDogfoodRunbookForReport
} from "./live-dogfood-runbook.js";
import { groupRecentContextByWorkspace, type RecentContextItem } from "./recent-context.js";
import type { ProjectedActiveSession, ProjectedSessionListItem } from "./workbench-types.js";

export interface FileEvidencePreviewModel {
  readonly contextCount: number;
  readonly changedFileCount: number;
  readonly contextItems: readonly FileEvidenceContextItem[];
  readonly changedFileItems: readonly FileEvidenceChangedFileItem[];
}

export type FileEvidenceSelection =
  | {
      readonly type: "changed-file";
      readonly item: FileEvidenceChangedFileItem;
    }
  | {
      readonly type: "context";
      readonly item: FileEvidenceContextItem;
    };

export interface FileEvidenceContextItem {
  readonly id: string;
  readonly kind: ProjectedActiveSession["contextAttachments"][number]["kind"];
  readonly title: string;
  readonly provenance: ProjectedActiveSession["contextAttachments"][number]["provenance"];
  readonly contentState: ProjectedActiveSession["contextAttachments"][number]["contentState"];
  readonly path?: string;
  readonly language?: string;
  readonly range?: ProjectedActiveSession["contextAttachments"][number]["range"];
  readonly summary?: string;
}

export interface FileEvidenceChangedFileItem {
  readonly id: string;
  readonly diffId: string;
  readonly diffTitle?: string;
  readonly diffSummary?: string;
  readonly path: string;
  readonly changeKind: string;
  readonly additions: number;
  readonly deletions: number;
}

export function createFileEvidencePreviewModel({
  activeSession,
  inspectorData
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
}): FileEvidencePreviewModel {
  const contextAttachments =
    inspectorData?.contextAttachments ?? activeSession?.contextAttachments ?? [];
  const diffs = inspectorData?.diffs ?? activeSession?.diffs ?? [];

  return {
    contextCount: contextAttachments.length,
    changedFileCount: diffs.reduce((count, diff) => count + diff.files.length, 0),
    contextItems: contextAttachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      title: attachment.title,
      provenance: attachment.provenance,
      contentState: attachment.contentState,
      path: attachment.path,
      language: attachment.language,
      range: attachment.range,
      summary: attachment.summary
    })),
    changedFileItems: diffs.flatMap((diff) =>
      diff.files.map((file, index) => ({
        id: `${diff.id}:${file.path}:${index}`,
        diffId: diff.id,
        diffTitle: diff.title,
        diffSummary: diff.summary,
        path: file.path,
        changeKind: file.changeKind,
        additions: file.additions ?? 0,
        deletions: file.deletions ?? 0
      }))
    )
  };
}

export function formatEvidenceRange(
  range: ProjectedActiveSession["contextAttachments"][number]["range"]
): string {
  if (!range) {
    return "";
  }

  const start = `${range.startLine}${range.startColumn ? `:${range.startColumn}` : ""}`;
  const end = range.endLine
    ? `${range.endLine}${range.endColumn ? `:${range.endColumn}` : ""}`
    : undefined;

  return end ? `L${start}-L${end}` : `L${start}`;
}

export function formatDiffStat({
  additions,
  deletions
}: {
  readonly additions: number;
  readonly deletions: number;
}): string {
  return `+${additions} / -${deletions}`;
}

export function findFileEvidenceSelection(
  model: FileEvidencePreviewModel,
  selectionId: string | undefined
): FileEvidenceSelection | undefined {
  const changedFile = model.changedFileItems.find((item) => item.id === selectionId);
  if (changedFile) {
    return { type: "changed-file", item: changedFile };
  }

  const contextItem = model.contextItems.find((item) => item.id === selectionId);
  if (contextItem) {
    return { type: "context", item: contextItem };
  }

  if (model.changedFileItems[0]) {
    return { type: "changed-file", item: model.changedFileItems[0] };
  }

  if (model.contextItems[0]) {
    return { type: "context", item: model.contextItems[0] };
  }

  return undefined;
}

export function getFileEvidenceSelectionId(
  selection: FileEvidenceSelection | undefined
): string | undefined {
  return selection?.item.id;
}

export function createEvidenceFollowUpDraft(selection: FileEvidenceSelection): string {
  if (selection.type === "changed-file") {
    const item = selection.item;
    return [
      `Review the changed file evidence for ${item.path}.`,
      `Change: ${item.changeKind} ${formatDiffStat(item)}.`,
      item.diffSummary ? `Summary: ${item.diffSummary}` : undefined
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }

  const item = selection.item;
  return [
    `Review the attached context evidence for ${item.title}.`,
    item.path ? `Path: ${item.path}` : undefined,
    item.range ? `Range: ${formatEvidenceRange(item.range)}` : undefined,
    item.summary ? `Summary: ${item.summary}` : undefined
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function createEvidenceBundleDraft({
  activeSession,
  inspectorData
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
}): string {
  const model = createFileEvidencePreviewModel({ activeSession, inspectorData });
  const sessionTitle = safeText(activeSession?.title ?? inspectorData?.sessionId ?? "current session");
  const workspacePath = safeText(activeSession?.workspacePath ?? "unknown workspace");
  const source = inspectorData?.source ?? "projection";
  const commandOutputs = inspectorData?.commandOutputs ?? activeSession?.commandOutputs ?? [];
  const runAttempts = inspectorData?.runAttempts ?? activeSession?.runAttempts ?? [];
  const selection = activeSession?.selection;

  return [
    "Workbench evidence bundle (metadata only).",
    "Raw private file contents, raw Claude logs, API keys, and provider account state are excluded.",
    "",
    `Session: ${sessionTitle}`,
    `Workspace: ${workspacePath}`,
    `Evidence source: ${source}`,
    selection
      ? `Route: backend=${safeText(selection.backendAdapterId)} provider=${safeText(selection.providerRouteId ?? "unknown")} model=${safeText(selection.modelProfileId ?? "unknown")} routing=${safeText(selection.routingMode)}`
      : "Route: no selection snapshot projected yet.",
    "",
    `Attached context (${model.contextCount})`,
    ...formatContextBundleItems(model.contextItems),
    "",
    `Changed files (${model.changedFileCount})`,
    ...formatChangedFileBundleItems(model.changedFileItems),
    "",
    `Command outputs (${commandOutputs.length})`,
    ...formatCommandOutputBundleItems(commandOutputs),
    "",
    `Run attempts (${runAttempts.length})`,
    ...formatRunAttemptBundleItems(runAttempts)
  ].join("\n");
}

export function createEvidenceReportDraft({
  activeSession,
  inspectorData
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
}): string {
  const sessionTitle = safeText(activeSession?.title ?? inspectorData?.sessionId ?? "current session");
  const bundle = createEvidenceBundleDraft({ activeSession, inspectorData });

  return [
    `Workbench dogfood report for ${sessionTitle}`,
    "",
    "Scope",
    "- Capture the issue, regression, or review question this evidence should support.",
    "- Keep provider/account secrets, raw Claude logs, and raw private file content out of the report.",
    "",
    "Suggested checks",
    "- Can another agent understand the workspace/session state from metadata alone?",
    "- Are approvals, terminal output summaries, diffs, and route metadata enough to reproduce the concern?",
    "- Does this need a follow-up run, manual retry, resume, or route switch?",
    "",
    bundle,
    "",
    "Next action",
    "- Decide whether to file an issue, queue a follow-up prompt, or export this report for local debugging."
  ].join("\n");
}

export function createWorkspaceEvidenceReportDraft({
  activeSession,
  inspectorData,
  sessions
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly sessions: readonly ProjectedSessionListItem[];
}): string {
  const activeSessionId = activeSession?.id ?? inspectorData?.sessionId;
  const activeBundle = createEvidenceBundleDraft({ activeSession, inspectorData });
  const workflowSummary = createDogfoodWorkflowSummary({
    activeSession,
    inspectorData,
    sessions
  });

  return [
    "Workbench workspace report (metadata only).",
    "Raw private file contents, raw Claude logs, API keys, provider account state, and local session files are excluded.",
    "",
    `Session count: ${sessions.length}`,
    activeSessionId ? `Active session: ${safeText(activeSessionId)}` : "Active session: none",
    "",
    "Session index",
    ...formatSessionIndexReportItems(sessions),
    "",
    "Dogfood workflow summary",
    ...formatDogfoodWorkflowSummaryForReport(workflowSummary),
    "",
    "Live Claude dogfood runbook",
    ...formatLiveDogfoodRunbookForReport(
      createLiveDogfoodRunbook({
        activeSession,
        inspectorData,
        projectedSessions: sessions
      })
    ),
    "",
    "Active session evidence",
    activeBundle,
    "",
    "Dogfood review prompts",
    "- Which sessions need retry, resume, or a route switch?",
    "- Which sessions produced enough evidence for a follow-up issue/report?",
    "- Are warning/error counts explainable without raw logs?"
  ].join("\n");
}

export function createMultiSessionIssueReportDraft({
  activeSession,
  inspectorData,
  sessions
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly sessions: readonly ProjectedSessionListItem[];
}): string {
  const activeSessionId = activeSession?.id ?? inspectorData?.sessionId;
  const activeBundle = createEvidenceBundleDraft({ activeSession, inspectorData });
  const attentionSessions = sessions.filter(
    (session) =>
      session.errorCount > 0 ||
      session.warningCount > 0 ||
      session.pendingApprovalCount > 0 ||
      session.resumable
  );
  const workflowSummary = createDogfoodWorkflowSummary({
    activeSession,
    inspectorData,
    selectedSessions: sessions,
    sessions
  });
  const liveDogfoodRunbook = createLiveDogfoodRunbook({
    activeSession,
    inspectorData,
    projectedSessions: sessions,
    selectedSessions: sessions
  });

  return [
    "Workbench multi-session issue report (metadata only).",
    "Raw private file contents, raw Claude logs, API keys, provider account state, local session files, and visual payloads are excluded.",
    "",
    "Scope",
    "- Use this report when several sessions or trace artifacts need one local issue/review bundle.",
    "- Attach separate structured trace JSON artifacts only after explicit metadata export.",
    "- Capture raw visuals only through the separate visual consent/redaction policy.",
    "",
    `Session count: ${sessions.length}`,
    `Attention session count: ${attentionSessions.length}`,
    activeSessionId ? `Active session: ${safeText(activeSessionId)}` : "Active session: none",
    "",
    "Dogfood workflow summary",
    ...formatDogfoodWorkflowSummaryForReport(workflowSummary),
    "",
    "Live Claude dogfood runbook",
    ...formatLiveDogfoodRunbookForReport(liveDogfoodRunbook),
    "",
    "Attention sessions",
    ...formatSessionIndexReportItems(attentionSessions),
    "",
    "All sessions",
    ...formatSessionIndexReportItems(sessions),
    "",
    "Active session evidence",
    activeBundle,
    "",
    "Trace/export checklist",
    "- Export the multi-session trace bundle for session index and route metadata.",
    "- Export per-session structured traces for sessions that need deeper replay evidence.",
    "- Keep visual capture disabled unless a human explicitly approves a redacted visual artifact.",
    "",
    "Decision prompts",
    "- Is this a provider route issue, tool runner issue, workbench replay issue, or UX issue?",
    "- Which session is the canonical reproduction path?",
    "- Which follow-up should be queued before filing or sharing the report?"
  ].join("\n");
}

export function createEvidenceExportManifestDraft({
  activeSession,
  inspectorData,
  recentContextItems = [],
  sessions
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly recentContextItems?: readonly RecentContextItem[];
  readonly sessions: readonly ProjectedSessionListItem[];
}): string {
  const activeSessionId = activeSession?.id ?? inspectorData?.sessionId;
  const activeSessionTitle = activeSession?.title ?? activeSessionId ?? "none";
  const model = createFileEvidencePreviewModel({ activeSession, inspectorData });
  const commandOutputs = inspectorData?.commandOutputs ?? activeSession?.commandOutputs ?? [];
  const runAttempts = inspectorData?.runAttempts ?? activeSession?.runAttempts ?? [];
  const favoriteContextItems = recentContextItems.filter((item) => item.favorite);
  const workspaceGroups = groupRecentContextByWorkspace(favoriteContextItems, recentContextItems);
  const warningSessionCount = sessions.filter((session) => session.warningCount > 0).length;
  const errorSessionCount = sessions.filter((session) => session.errorCount > 0).length;
  const resumableSessionCount = sessions.filter((session) => session.resumable).length;
  const source = inspectorData?.source ?? "projection";
  const selection = activeSession?.selection;
  const captureReadiness = createEvidenceCaptureReadiness();
  const workflowSummary = createDogfoodWorkflowSummary({
    activeSession,
    inspectorData,
    sessions
  });
  const liveDogfoodRunbook = createLiveDogfoodRunbook({
    activeSession,
    inspectorData,
    projectedSessions: sessions
  });

  return [
    "Workbench export manifest (metadata only).",
    "Purpose: describe the safe evidence package before exporting, sharing, or filing a dogfood report.",
    "Privacy boundary: raw private file contents, raw Claude logs, API keys, provider account state, and local session files are excluded.",
    "",
    "Active session",
    `- id: ${activeSessionId ? safeText(activeSessionId) : "none"}`,
    `- title: ${safeText(activeSessionTitle)}`,
    `- workspace: ${safeText(activeSession?.workspacePath ?? "unknown workspace")}`,
    `- evidence source: ${safeText(source)}`,
    selection
      ? `- route: backend=${safeText(selection.backendAdapterId)} provider=${safeText(selection.providerRouteId ?? "unknown")} model=${safeText(selection.modelProfileId ?? "unknown")} routing=${safeText(selection.routingMode)}`
      : "- route: no selection snapshot projected yet.",
    "",
    "Included metadata sources",
    "- session index and lifecycle metadata",
    "- backend/model selection snapshot",
    "- context attachment metadata and summaries",
    "- normalized diff file paths, summaries, and stats",
    "- command output status, exit codes, chunk counts, and redacted previews",
    "- run attempt status, trigger, model, and failure kind metadata",
    "- recent/favorite context labels, paths, and timestamps",
    "",
    "Excluded data classes",
    "- raw private file contents",
    "- raw Claude Code stream-json logs",
    "- API keys, tokens, provider account state, and local session files",
    "- screenshots and structured traces until explicit capture/export consent exists",
    "",
    "Evidence counts",
    `- sessions: ${sessions.length}`,
    `- resumable sessions: ${resumableSessionCount}`,
    `- sessions with warnings: ${warningSessionCount}`,
    `- sessions with errors: ${errorSessionCount}`,
    `- attached context items: ${model.contextCount}`,
    `- changed files: ${model.changedFileCount}`,
    `- command outputs: ${commandOutputs.length}`,
    `- run attempts: ${runAttempts.length}`,
    `- favorite context items: ${favoriteContextItems.length}`,
    "",
    "Dogfood workflow summary",
    ...formatDogfoodWorkflowSummaryForReport(workflowSummary),
    "",
    "Live Claude dogfood runbook",
    ...formatLiveDogfoodRunbookForReport(liveDogfoodRunbook),
    "",
    "Favorite context by workspace",
    ...formatRecentContextWorkspaceGroups(workspaceGroups),
    "",
    "Capture consent and redaction readiness",
    ...formatEvidenceCaptureReadinessForManifest(captureReadiness),
    "",
    "Export-ready documents",
    "- active session evidence bundle: ready",
    "- workspace report: ready",
    "- issue/report draft: ready",
    "- screenshot bundle: requires explicit consent and redaction configuration",
    "- structured trace bundle: requires explicit consent and redaction configuration",
    "- multi-session trace bundle: ready as metadata-only JSON",
    "- visual capture policy: ready as metadata-only JSON",
    "",
    "Review prompts",
    "- Is the active session evidence enough to reproduce the concern without raw logs?",
    "- Does a failed run need retry, resume, route health review, or a manual provider switch?",
    "- Should screenshots or structured traces be captured in a later explicit-consent export?"
  ].join("\n");
}

export function createLiveDogfoodRunbookDraft({
  activeSession,
  inspectorData,
  sessions
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly sessions: readonly ProjectedSessionListItem[];
}): string {
  const runbook = createLiveDogfoodRunbook({
    activeSession,
    inspectorData,
    projectedSessions: sessions
  });

  return [
    "Live Claude dogfood runbook (metadata only).",
    "Use this before and after real route switching, retry, cancel, and resume checks. Do not attach raw Claude logs, provider keys, private file contents, local session files, or raw visual payloads.",
    "",
    ...formatLiveDogfoodRunbookForReport(runbook),
    "",
    "Operator notes",
    "- Route switch: record only provider route id, model alias, run attempt status, and issue kind.",
    "- Retry: compare parent attempt id, follow-up attempt id, trigger, route, and final status.",
    "- Cancel: confirm the UI labels cancellation as local/user initiated rather than provider failure.",
    "- Resume: confirm external session continuity without exporting raw Claude session files.",
    "- Raw visual capture: keep blocked until the dedicated consent/redaction/storage implementation is enabled."
  ].join("\n");
}

export function createEvidenceBundleFileName({
  activeSession,
  now = new Date()
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly now?: Date;
}): string {
  const title = activeSession?.title ?? activeSession?.id ?? "workbench-session";
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workbench-session";
  const date = now.toISOString().slice(0, 10);
  return `${date}-${slug}-evidence.md`;
}

export function createEvidenceReportFileName({
  activeSession,
  now = new Date()
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly now?: Date;
}): string {
  const title = activeSession?.title ?? activeSession?.id ?? "workbench-session";
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workbench-session";
  const date = now.toISOString().slice(0, 10);
  return `${date}-${slug}-report.md`;
}

export function createWorkspaceEvidenceReportFileName({
  now = new Date()
}: {
  readonly now?: Date;
} = {}): string {
  return `${now.toISOString().slice(0, 10)}-workbench-workspace-report.md`;
}

export function createMultiSessionIssueReportFileName({
  now = new Date()
}: {
  readonly now?: Date;
} = {}): string {
  return `${now.toISOString().slice(0, 10)}-workbench-multi-session-issue-report.md`;
}

export function createEvidenceExportManifestFileName({
  now = new Date()
}: {
  readonly now?: Date;
} = {}): string {
  return `${now.toISOString().slice(0, 10)}-workbench-export-manifest.md`;
}

export function createLiveDogfoodRunbookFileName({
  now = new Date()
}: {
  readonly now?: Date;
} = {}): string {
  return `${now.toISOString().slice(0, 10)}-live-claude-dogfood-runbook.md`;
}

function formatContextBundleItems(
  items: readonly FileEvidenceContextItem[]
): readonly string[] {
  if (!items.length) {
    return ["- none"];
  }

  return items.map((item) =>
    [
      `- ${safeText(item.title)}: ${safeText(item.kind)} / ${safeText(item.contentState)}`,
      item.path ? `path=${safeText(item.path)}` : undefined,
      item.range ? `range=${formatEvidenceRange(item.range)}` : undefined,
      item.summary ? `summary=${safeText(item.summary)}` : undefined
    ]
      .filter((part): part is string => Boolean(part))
      .join(" | ")
  );
}

function formatChangedFileBundleItems(
  items: readonly FileEvidenceChangedFileItem[]
): readonly string[] {
  if (!items.length) {
    return ["- none"];
  }

  return items.map((item) =>
    [
      `- ${safeText(item.path)}: ${safeText(item.changeKind)} ${formatDiffStat(item)}`,
      item.diffSummary ? `summary=${safeText(item.diffSummary)}` : undefined
    ]
      .filter((part): part is string => Boolean(part))
      .join(" | ")
  );
}

function formatCommandOutputBundleItems(
  items: ProjectedActiveSession["commandOutputs"]
): readonly string[] {
  if (!items.length) {
    return ["- none"];
  }

  return items.map((item) =>
    [
      `- ${safeText(item.id)}: ${safeText(item.status)}`,
      typeof item.exitCode === "number" ? `exit=${item.exitCode}` : undefined,
      `chunks=${item.chunkCount}`,
      item.preview ? `preview=${safeText(item.preview)}` : undefined
    ]
      .filter((part): part is string => Boolean(part))
      .join(" | ")
  );
}

function formatRunAttemptBundleItems(
  items: ProjectedActiveSession["runAttempts"]
): readonly string[] {
  if (!items.length) {
    return ["- none"];
  }

  return items.map((item) =>
    [
      `- ${safeText(item.id)}: ${safeText(item.status)} / ${safeText(item.mode)}`,
      item.modelProfileId ? `model=${safeText(item.modelProfileId)}` : undefined,
      item.trigger ? `trigger=${safeText(item.trigger)}` : undefined,
      item.failureKind ? `failure=${safeText(item.failureKind)}` : undefined,
      item.errorMessage ? `error=${safeText(item.errorMessage)}` : undefined
    ]
      .filter((part): part is string => Boolean(part))
      .join(" | ")
  );
}

function formatSessionIndexReportItems(
  sessions: readonly ProjectedSessionListItem[]
): readonly string[] {
  if (!sessions.length) {
    return ["- none"];
  }

  return sessions.map((session) =>
    [
      `- ${safeText(session.title)} (${safeText(session.id)}): ${safeText(session.lifecycle)}`,
      session.workspacePath ? `workspace=${safeText(session.workspacePath)}` : undefined,
      session.backendAdapterId ? `backend=${safeText(session.backendAdapterId)}` : undefined,
      session.backendLabel ? `backendLabel=${safeText(session.backendLabel)}` : undefined,
      `resumable=${session.resumable ? "yes" : "no"}`,
      `approvals=${session.pendingApprovalCount}`,
      `warnings=${session.warningCount}`,
      `errors=${session.errorCount}`,
      session.updatedAt ? `updated=${safeText(session.updatedAt)}` : undefined
    ]
      .filter((part): part is string => Boolean(part))
      .join(" | ")
  );
}

function formatRecentContextWorkspaceGroups(
  groups: ReturnType<typeof groupRecentContextByWorkspace>
): readonly string[] {
  if (!groups.length) {
    return ["- none"];
  }

  return groups.flatMap((group) => [
    `- ${safeText(group.label)}: path=${safeText(group.path)} items=${group.items.length} favorites=${group.favoriteCount}`,
    ...group.items.map(
      (item) =>
        `  - ${safeText(item.label)}: ${safeText(item.kind)} | path=${safeText(item.path)} | updated=${safeText(item.updatedAt)}`
    )
  ]);
}

function safeText(value: string): string {
  return redactSensitiveTextContent(value);
}

import { redactSensitiveTextContent } from "@geond-agent/claude-code-bridge";

import type { InspectorSessionReadModel } from "./inspector-read-model.js";
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
    "Active session evidence",
    activeBundle,
    "",
    "Dogfood review prompts",
    "- Which sessions need retry, resume, or a route switch?",
    "- Which sessions produced enough evidence for a follow-up issue/report?",
    "- Are warning/error counts explainable without raw logs?"
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

export function createWorkspaceEvidenceReportFileName({
  now = new Date()
}: {
  readonly now?: Date;
} = {}): string {
  return `${now.toISOString().slice(0, 10)}-workbench-workspace-report.md`;
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

function safeText(value: string): string {
  return redactSensitiveTextContent(value);
}

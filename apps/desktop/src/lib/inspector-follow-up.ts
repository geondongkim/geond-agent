import type {
  SelectionReadinessItem,
  WorkbenchApprovalSnapshot
} from "@geond-agent/ui-workbench";

import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export function createDiffFollowUpDraft(
  diff: ProjectedActiveSession["diffs"][number]
): string {
  return [
    `Review the diff evidence for ${diff.title ?? diff.id}.`,
    diff.summary ? `Summary: ${diff.summary}` : undefined,
    diff.files.length ? `Files:\n${diff.files.map(formatDiffFile).join("\n")}` : undefined
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function createApprovalFollowUpDraft(approval: WorkbenchApprovalSnapshot): string {
  return [
    `Review the approval request for ${approval.title}.`,
    `Kind: ${approval.kind}.`,
    approval.subject ? `Subject: ${approval.subject}` : undefined,
    approval.reason ? `Reason: ${approval.reason}` : undefined
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function createTerminalFollowUpDraft(
  output: InspectorSessionReadModel["commandOutputs"][number]
): string {
  return [
    `Review the terminal output for ${output.id}.`,
    `Status: ${output.status}${output.exitCode !== undefined ? ` / ${output.exitCode}` : ""}.`,
    output.preview ? `Preview:\n${output.preview}` : undefined
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function createRunAttemptFollowUpDraft(
  attempt: InspectorSessionReadModel["runAttempts"][number]
): string {
  return [
    `Review the run attempt ${attempt.id}.`,
    `Status: ${attempt.status}.`,
    `Mode: ${attempt.mode}.`,
    attempt.modelProfileId ? `Model: ${attempt.modelProfileId}.` : undefined,
    attempt.providerRouteId ? `Provider route: ${attempt.providerRouteId}.` : undefined,
    attempt.externalSessionId ? `External session: ${attempt.externalSessionId}.` : undefined,
    attempt.exitCode !== undefined ? `Exit code: ${attempt.exitCode}.` : undefined,
    attempt.eventCount !== undefined ? `Normalized events: ${attempt.eventCount}.` : undefined,
    attempt.ignoredRecordCount !== undefined
      ? `Ignored records: ${attempt.ignoredRecordCount}.`
      : undefined,
    attempt.parseWarningCount !== undefined
      ? `Parse warnings: ${attempt.parseWarningCount}.`
      : undefined,
    attempt.promptSummary ? `Previous prompt summary: ${attempt.promptSummary}` : undefined,
    attempt.commandPreview ? `Command preview: ${attempt.commandPreview}` : undefined,
    attempt.errorMessage ? `Error: ${attempt.errorMessage}` : undefined,
    getRunAttemptInstruction(attempt.status)
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function createSessionReviewFollowUpDraft({
  activeSession,
  inspectorData
}: {
  readonly activeSession: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
}): string {
  const diffs = inspectorData?.diffs ?? activeSession.diffs;
  const commandOutputs = inspectorData?.commandOutputs ?? activeSession.commandOutputs;
  const runAttempts = inspectorData?.runAttempts ?? activeSession.runAttempts;
  const usageReports = inspectorData?.usageReports ?? activeSession.usageReports;
  const latestUsage = usageReports[usageReports.length - 1];
  const pendingApprovals = activeSession.approvals.filter(
    (approval) => approval.status === "pending"
  );
  const nonReadyItems =
    activeSession.selection?.readiness?.items.filter((item) => item.level !== "ready") ?? [];

  return [
    "Review the current workbench session and propose the safest next action.",
    `Session: ${activeSession.title} (${activeSession.id}).`,
    activeSession.workspacePath ? `Workspace: ${activeSession.workspacePath}.` : undefined,
    activeSession.selection
      ? `Route: ${activeSession.selection.backendAdapterId} / ${activeSession.selection.providerRouteId ?? "unknown provider"} / ${activeSession.selection.modelProfileId ?? "unknown model"}.`
      : undefined,
    activeSession.selection?.readiness
      ? `Route readiness: ${activeSession.selection.readiness.level}. ${activeSession.selection.readiness.summary}`
      : undefined,
    nonReadyItems.length
      ? `Readiness items:\n${nonReadyItems.map(formatReadinessItem).join("\n")}`
      : undefined,
    `Pending approvals: ${pendingApprovals.length}.`,
    pendingApprovals.length
      ? `Approval subjects:\n${pendingApprovals.map(formatApprovalSubject).join("\n")}`
      : undefined,
    runAttempts.length
      ? `Run attempts:\n${runAttempts.slice(0, 3).map(formatRunAttempt).join("\n")}`
      : undefined,
    diffs.length
      ? `Diff evidence:\n${diffs.slice(0, 3).map(formatDiffSummary).join("\n")}`
      : undefined,
    commandOutputs.length
      ? `Terminal evidence:\n${commandOutputs.slice(0, 3).map(formatTerminalOutput).join("\n")}`
      : undefined,
    latestUsage
      ? `Latest usage: ${latestUsage.model ?? "unknown model"} input=${latestUsage.inputTokens ?? "n/a"} output=${latestUsage.outputTokens ?? "n/a"} cost=${latestUsage.costUsd ?? "n/a"}.`
      : undefined,
    [
      "Instruction: decide whether this session needs implementation, recovery,",
      "verification, or cleanup. Preserve completed work and do not expose secrets,",
      "raw Claude logs, or private local files."
    ].join(" ")
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function formatDiffFile(file: ProjectedActiveSession["diffs"][number]["files"][number]): string {
  return `- ${file.path}: ${file.changeKind} +${file.additions ?? 0} / -${file.deletions ?? 0}`;
}

function formatReadinessItem(item: SelectionReadinessItem): string {
  return `- ${item.label}: ${item.level}${item.reason ? ` - ${item.reason}` : ""}`;
}

function formatApprovalSubject(approval: WorkbenchApprovalSnapshot): string {
  return `- ${approval.title}: ${approval.subject ?? approval.reason ?? approval.kind}`;
}

function formatRunAttempt(
  attempt: InspectorSessionReadModel["runAttempts"][number]
): string {
  return [
    `- ${attempt.id}: ${attempt.status}`,
    attempt.mode,
    attempt.modelProfileId,
    attempt.exitCode !== undefined ? `exit=${attempt.exitCode}` : undefined,
    attempt.parseWarningCount !== undefined ? `parseWarnings=${attempt.parseWarningCount}` : undefined
  ]
    .filter((value): value is string => Boolean(value))
    .join(" / ");
}

function formatDiffSummary(diff: ProjectedActiveSession["diffs"][number]): string {
  return `- ${diff.title ?? diff.id}: ${diff.files.length} file(s)${
    diff.summary ? ` - ${diff.summary}` : ""
  }`;
}

function formatTerminalOutput(
  output: InspectorSessionReadModel["commandOutputs"][number]
): string {
  return `- ${output.id}: ${output.status}${
    output.exitCode !== undefined ? ` / exit=${output.exitCode}` : ""
  }`;
}

function getRunAttemptInstruction(status: string): string {
  if (status === "failed" || status === "cancelled") {
    return [
      "Diagnose the failed or cancelled run, preserve completed work,",
      "and continue from the safest next step without exposing secrets or raw local files."
    ].join(" ");
  }

  return [
    "Review whether the run needs a follow-up, preserve useful context,",
    "and avoid repeating completed work."
  ].join(" ");
}

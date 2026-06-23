import type { WorkbenchApprovalSnapshot } from "@geond-agent/ui-workbench";

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

function formatDiffFile(file: ProjectedActiveSession["diffs"][number]["files"][number]): string {
  return `- ${file.path}: ${file.changeKind} +${file.additions ?? 0} / -${file.deletions ?? 0}`;
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

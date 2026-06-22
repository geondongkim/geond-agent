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

function formatDiffFile(file: ProjectedActiveSession["diffs"][number]["files"][number]): string {
  return `- ${file.path}: ${file.changeKind} +${file.additions ?? 0} / -${file.deletions ?? 0}`;
}

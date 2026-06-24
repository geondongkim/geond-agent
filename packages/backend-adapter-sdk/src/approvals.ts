import type { WorkbenchApprovalSnapshot } from "./events.js";

export type ApprovalCorrelationKey =
  | `diff:${string}`
  | `tool:${string}`
  | `command:${string}`
  | `subject:${string}`
  | `approval:${string}`;

export function createApprovalCorrelationKey(
  approval: Pick<
    WorkbenchApprovalSnapshot,
    "id" | "kind" | "diffId" | "toolCallId" | "commandId" | "subject"
  >
): ApprovalCorrelationKey {
  if (approval.diffId) {
    return `diff:${approval.diffId}`;
  }

  if (approval.toolCallId) {
    return `tool:${approval.toolCallId}`;
  }

  if (approval.commandId) {
    return `command:${approval.commandId}`;
  }

  const subject = approval.subject?.trim();
  if (subject) {
    return `subject:${approval.kind}:${subject}`;
  }

  return `approval:${approval.id}`;
}

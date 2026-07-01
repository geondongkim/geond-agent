import type { WorkbenchEvent } from "./events.js";

export function workbenchEventIdentity(event: WorkbenchEvent): string {
  switch (event.type) {
    case "session.lifecycle":
      return [
        event.type,
        event.sessionId,
        event.lifecycle,
        event.at ?? "",
        event.title ?? "",
        event.workspacePath ?? ""
      ].join(":");
    case "selection.snapshot.updated":
      return [event.type, event.sessionId, event.at ?? "", event.selection.backendAdapterId].join(":");
    case "session.adapter.linked":
      return [
        event.type,
        event.sessionId,
        event.adapterId,
        event.externalSessionId,
        event.resumedFromExternalSessionId ?? "",
        event.at ?? ""
      ].join(":");
    case "context.attached":
      return [
        event.type,
        event.sessionId,
        event.attachment.id,
        event.attachment.kind,
        event.attachment.path ?? "",
        event.at ?? ""
      ].join(":");
    case "user.message":
      return [
        event.type,
        event.sessionId,
        event.messageId ?? "",
        event.at ?? "",
        event.text
      ].join(":");
    case "assistant.text.delta":
      return [event.type, event.sessionId, event.messageId, event.at ?? "", event.text].join(":");
    case "assistant.text.completed":
      return [event.type, event.sessionId, event.messageId, event.at ?? "", event.text ?? ""].join(":");
    case "plan.updated":
      return [
        event.type,
        event.sessionId,
        event.at ?? "",
        event.items.map((item) => `${item.id}/${item.status}/${item.title}`).join("|")
      ].join(":");
    case "tool.call.started":
      return [event.type, event.sessionId, event.toolCall.id, event.at ?? ""].join(":");
    case "tool.call.updated":
      return [event.type, event.sessionId, event.toolCallId, event.status ?? "", event.at ?? ""].join(":");
    case "command.output":
      return [
        event.type,
        event.sessionId,
        event.commandId,
        event.stream,
        event.status ?? "",
        event.exitCode ?? "",
        event.at ?? "",
        event.text
      ].join(":");
    case "diff.emitted":
      return [event.type, event.sessionId, event.diff.id, event.at ?? ""].join(":");
    case "usage.reported":
      return [event.type, event.sessionId, event.usage.id, event.at ?? ""].join(":");
    case "artifact.emitted":
      return [event.type, event.sessionId, event.artifact.id, event.artifact.contentState, event.at ?? ""].join(":");
    case "run.attempt.started":
      return [event.type, event.sessionId, event.attempt.id, event.at ?? ""].join(":");
    case "run.attempt.updated":
      return [
        event.type,
        event.sessionId,
        event.attemptId,
        event.status,
        event.at ?? "",
        event.exitCode ?? "",
        event.eventCount ?? "",
        event.ignoredRecordCount ?? "",
        event.parseWarningCount ?? "",
        event.failureKind ?? "",
        event.errorMessage ?? ""
      ].join(":");
    case "runner.issue.detected":
      return [
        event.type,
        event.sessionId,
        event.issue.id,
        event.issue.kind,
        event.issue.providerRouteId ?? "",
        event.issue.modelProfileId ?? "",
        event.at ?? "",
        event.issue.message
      ].join(":");
    case "approval.requested":
      return [event.type, event.sessionId, event.approval.id, event.at ?? ""].join(":");
    case "approval.resolved":
      return [event.type, event.sessionId, event.approvalId, event.decision, event.at ?? ""].join(":");
    case "warning":
    case "error":
      return [event.type, event.sessionId, event.id, event.at ?? "", event.message].join(":");
  }
}

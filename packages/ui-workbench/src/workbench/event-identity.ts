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
    case "approval.requested":
      return [event.type, event.sessionId, event.approval.id, event.at ?? ""].join(":");
    case "approval.resolved":
      return [event.type, event.sessionId, event.approvalId, event.decision, event.at ?? ""].join(":");
    case "warning":
    case "error":
      return [event.type, event.sessionId, event.id, event.at ?? "", event.message].join(":");
  }
}

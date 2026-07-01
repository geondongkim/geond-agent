import type { WorkbenchSelectionSnapshot } from "./selection.js";

export type WorkbenchSessionLifecycle =
  | "created"
  | "started"
  | "resumed"
  | "paused"
  | "completed"
  | "failed";

export type PlanItemStatus = "pending" | "in_progress" | "completed" | "failed";

export interface WorkbenchPlanItemSnapshot {
  readonly id: string;
  readonly title: string;
  readonly status: PlanItemStatus;
}

export type WorkbenchToolCallStatus = "pending" | "running" | "succeeded" | "failed";

export interface WorkbenchToolCallSnapshot {
  readonly id: string;
  readonly name: string;
  readonly status: WorkbenchToolCallStatus;
  readonly inputSummary?: string;
  readonly outputSummary?: string;
}

export type CommandOutputStream = "stdout" | "stderr" | "status";
export type CommandStatus = "running" | "succeeded" | "failed" | "interrupted";

export interface WorkbenchDiffFileSnapshot {
  readonly path: string;
  readonly changeKind: "added" | "modified" | "deleted" | "renamed";
  readonly additions?: number;
  readonly deletions?: number;
}

export interface WorkbenchDiffSnapshot {
  readonly id: string;
  readonly title?: string;
  readonly files: readonly WorkbenchDiffFileSnapshot[];
  readonly summary?: string;
}

export interface WorkbenchUsageSnapshot {
  readonly id: string;
  readonly source: "backend" | "provider" | "model";
  readonly model?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly thinkingTokens?: number;
  readonly reasoningTokens?: number;
  readonly cacheCreationInputTokens?: number;
  readonly cacheReadInputTokens?: number;
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly costUsd?: number;
  readonly serviceTier?: string;
  readonly note?: string;
}

export type WorkbenchRunAttemptStatus = "running" | "succeeded" | "failed" | "cancelled";
export type WorkbenchRunAttemptTrigger =
  | "manual"
  | "manual_resume"
  | "approval_follow_up"
  | "readiness_blocked";
export type WorkbenchStreamQuality = "pending" | "clean" | "warning" | "failed" | "cancelled";
export type WorkbenchRunnerIssueKind =
  | "route_reached"
  | "provider_overloaded"
  | "provider_auth"
  | "provider_quota"
  | "provider_model"
  | "provider_timeout"
  | "retry_exhausted"
  | "readiness_blocked"
  | "runner_process"
  | "runner_timeout"
  | "runner_cancelled"
  | "unknown";
export type WorkbenchRunnerIssueSeverity = "info" | "warning" | "error";
export type WorkbenchRunnerIssueSuggestedAction =
  | "retry_later"
  | "switch_route"
  | "lower_model"
  | "check_key"
  | "inspect_terminal";
export type WorkbenchProviderRouteHealthStatus =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown";

export interface WorkbenchRunAttemptSnapshot {
  readonly id: string;
  readonly mode: "fixture" | "claude-live" | "codex-live";
  readonly status: WorkbenchRunAttemptStatus;
  readonly backendAdapterId?: string;
  readonly providerRouteId?: string;
  readonly modelProfileId?: string;
  readonly routingMode?: "manual" | "auto";
  readonly permissionMode?: string;
  readonly externalSessionId?: string;
  readonly resumedFromExternalSessionId?: string;
  readonly parentRunAttemptId?: string;
  readonly followUpReason?: string;
  readonly commandPreview?: string;
  readonly promptSummary?: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly exitCode?: number;
  readonly eventCount?: number;
  readonly ignoredRecordCount?: number;
  readonly parseWarningCount?: number;
  readonly errorMessage?: string;
  readonly failureKind?: WorkbenchRunnerIssueKind;
  readonly trigger?: WorkbenchRunAttemptTrigger;
  readonly sourceApprovalId?: string;
}

export interface WorkbenchRunnerIssueSnapshot {
  readonly id: string;
  readonly kind: WorkbenchRunnerIssueKind;
  readonly severity: WorkbenchRunnerIssueSeverity;
  readonly title: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly suggestedAction: WorkbenchRunnerIssueSuggestedAction;
  readonly backendAdapterId?: string;
  readonly providerRouteId?: string;
  readonly modelProfileId?: string;
  readonly attemptId?: string;
  readonly routeHealth?: WorkbenchProviderRouteHealthStatus;
  readonly detectedAt?: string;
}

export interface WorkbenchAdapterSessionLinkSnapshot {
  readonly adapterId: string;
  readonly externalSessionId: string;
  readonly resumedFromExternalSessionId?: string;
  readonly linkedAt?: string;
}

export type WorkbenchContextAttachmentKind = "workspace" | "file" | "selection" | "note";
export type WorkbenchContextAttachmentProvenance = "desktop" | "ide-plugin" | "manual" | "backend";
export type WorkbenchContextAttachmentContentState =
  | "metadata-only"
  | "redacted"
  | "external-reference";

export interface WorkbenchContextAttachmentRange {
  readonly startLine: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface WorkbenchContextAttachmentSnapshot {
  readonly id: string;
  readonly kind: WorkbenchContextAttachmentKind;
  readonly title: string;
  readonly provenance: WorkbenchContextAttachmentProvenance;
  readonly contentState: WorkbenchContextAttachmentContentState;
  readonly path?: string;
  readonly language?: string;
  readonly range?: WorkbenchContextAttachmentRange;
  readonly summary?: string;
  readonly attachedAt?: string;
}

export type ApprovalKind = "command" | "diff" | "filesystem" | "network" | "mcp";
export type ApprovalDecision = "approved" | "rejected" | "cancelled";

export interface WorkbenchApprovalSnapshot {
  readonly id: string;
  readonly kind: ApprovalKind;
  readonly title: string;
  readonly reason?: string;
  readonly status: "pending" | "resolved";
  readonly requestedAt?: string;
  readonly resolvedAt?: string;
  readonly decision?: ApprovalDecision;
  readonly subject?: string;
  readonly diffId?: string;
  readonly toolCallId?: string;
  readonly commandId?: string;
}

export type WorkbenchArtifactKind =
  | "structured-trace"
  | "visual-capture"
  | "report"
  | "patch"
  | "unknown";
export type WorkbenchArtifactContentState =
  | "metadata-only"
  | "external-reference"
  | "redacted";

export interface WorkbenchArtifactSnapshot {
  readonly id: string;
  readonly kind: WorkbenchArtifactKind;
  readonly title: string;
  readonly contentState: WorkbenchArtifactContentState;
  readonly path?: string;
  readonly mediaType?: string;
  readonly summary?: string;
  readonly sourceEventId?: string;
  readonly createdAt?: string;
}

export type WorkbenchEvent =
  | {
      readonly type: "session.lifecycle";
      readonly sessionId: string;
      readonly lifecycle: WorkbenchSessionLifecycle;
      readonly at?: string;
      readonly title?: string;
      readonly workspacePath?: string;
      readonly selection?: WorkbenchSelectionSnapshot;
    }
  | {
      readonly type: "selection.snapshot.updated";
      readonly sessionId: string;
      readonly selection: WorkbenchSelectionSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "session.adapter.linked";
      readonly sessionId: string;
      readonly adapterId: string;
      readonly externalSessionId: string;
      readonly resumedFromExternalSessionId?: string;
      readonly at?: string;
    }
  | {
      readonly type: "context.attached";
      readonly sessionId: string;
      readonly attachment: WorkbenchContextAttachmentSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "user.message";
      readonly sessionId: string;
      readonly messageId?: string;
      readonly text: string;
      readonly at?: string;
    }
  | {
      readonly type: "assistant.text.delta";
      readonly sessionId: string;
      readonly messageId: string;
      readonly text: string;
      readonly at?: string;
    }
  | {
      readonly type: "assistant.text.completed";
      readonly sessionId: string;
      readonly messageId: string;
      readonly text?: string;
      readonly at?: string;
    }
  | {
      readonly type: "plan.updated";
      readonly sessionId: string;
      readonly items: readonly WorkbenchPlanItemSnapshot[];
      readonly at?: string;
    }
  | {
      readonly type: "tool.call.started";
      readonly sessionId: string;
      readonly toolCall: WorkbenchToolCallSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "tool.call.updated";
      readonly sessionId: string;
      readonly toolCallId: string;
      readonly status?: WorkbenchToolCallStatus;
      readonly outputSummary?: string;
      readonly at?: string;
    }
  | {
      readonly type: "command.output";
      readonly sessionId: string;
      readonly commandId: string;
      readonly stream: CommandOutputStream;
      readonly text: string;
      readonly status?: CommandStatus;
      readonly exitCode?: number;
      readonly at?: string;
    }
  | {
      readonly type: "diff.emitted";
      readonly sessionId: string;
      readonly diff: WorkbenchDiffSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "usage.reported";
      readonly sessionId: string;
      readonly usage: WorkbenchUsageSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "artifact.emitted";
      readonly sessionId: string;
      readonly artifact: WorkbenchArtifactSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "run.attempt.started";
      readonly sessionId: string;
      readonly attempt: WorkbenchRunAttemptSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "run.attempt.updated";
      readonly sessionId: string;
      readonly attemptId: string;
      readonly status: WorkbenchRunAttemptStatus;
      readonly finishedAt?: string;
      readonly exitCode?: number;
      readonly eventCount?: number;
      readonly ignoredRecordCount?: number;
      readonly parseWarningCount?: number;
      readonly errorMessage?: string;
      readonly failureKind?: WorkbenchRunnerIssueKind;
      readonly at?: string;
    }
  | {
      readonly type: "runner.issue.detected";
      readonly sessionId: string;
      readonly issue: WorkbenchRunnerIssueSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "approval.requested";
      readonly sessionId: string;
      readonly approval: WorkbenchApprovalSnapshot;
      readonly at?: string;
    }
  | {
      readonly type: "approval.resolved";
      readonly sessionId: string;
      readonly approvalId: string;
      readonly decision: ApprovalDecision;
      readonly at?: string;
    }
  | {
      readonly type: "warning";
      readonly sessionId: string;
      readonly id: string;
      readonly message: string;
      readonly at?: string;
    }
  | {
      readonly type: "error";
      readonly sessionId: string;
      readonly id: string;
      readonly message: string;
      readonly at?: string;
    };

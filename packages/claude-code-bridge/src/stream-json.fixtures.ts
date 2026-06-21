export const CLAUDE_CODE_SANITIZED_STREAM_JSON_FIXTURE = [
  {
    type: "session.started",
    session_id: "claude-workbench-1",
    timestamp: "2026-06-21T01:00:00.000Z",
    title: "Desktop shell first slice",
    cwd: "/workspace/geond-agent",
    backend_id: "claude-code.external-cli-acp",
    provider_route_id: "zai.anthropic-compatible",
    model_profile_id: "sonnet",
    routing_mode: "manual",
    ui_language: "ko",
    agent_language: "en"
  },
  {
    type: "assistant.message.delta",
    session_id: "claude-workbench-1",
    message_id: "assistant-1",
    timestamp: "2026-06-21T01:00:01.000Z",
    delta: "Inspecting desktop shell boundaries."
  },
  {
    type: "plan.updated",
    session_id: "claude-workbench-1",
    timestamp: "2026-06-21T01:00:02.000Z",
    items: [
      { id: "read", title: "Read workbench docs", status: "completed" },
      { id: "scaffold", title: "Add renderer shell", status: "in_progress" },
      { id: "verify", title: "Run pnpm verify", status: "pending" }
    ]
  },
  {
    type: "tool.started",
    session_id: "claude-workbench-1",
    tool_call_id: "tool-1",
    tool_name: "read-files",
    timestamp: "2026-06-21T01:00:03.000Z",
    input_summary: "apps/desktop and packages/ui-workbench",
    status: "running"
  },
  {
    type: "tool.completed",
    session_id: "claude-workbench-1",
    tool_call_id: "tool-1",
    timestamp: "2026-06-21T01:00:04.000Z",
    output_summary: "Renderer scaffold was minimal and adapter-neutral.",
    status: "succeeded"
  },
  {
    type: "command.output",
    session_id: "claude-workbench-1",
    command_id: "cmd-build",
    timestamp: "2026-06-21T01:00:05.000Z",
    stream: "stdout",
    text: "pnpm build",
    status: "running"
  },
  {
    type: "diff.emitted",
    session_id: "claude-workbench-1",
    diff_id: "diff-1",
    timestamp: "2026-06-21T01:00:06.000Z",
    title: "Workbench desktop shell",
    files: [
      {
        path: "apps/desktop/src/app.tsx",
        change_kind: "added",
        additions: 220,
        deletions: 0
      }
    ],
    summary: "Added the first 3-pane workbench renderer."
  },
  {
    type: "approval.requested",
    session_id: "claude-workbench-1",
    approval_id: "approval-1",
    approval_kind: "diff",
    timestamp: "2026-06-21T01:00:07.000Z",
    title: "Review desktop scaffold",
    reason: "3-pane shell touches the user-facing workbench surface.",
    subject: "apps/desktop/**"
  },
  {
    type: "approval.resolved",
    session_id: "claude-workbench-1",
    approval_id: "approval-1",
    timestamp: "2026-06-21T01:00:08.000Z",
    decision: "approved"
  },
  {
    type: "approval.requested",
    session_id: "claude-workbench-1",
    approval_id: "approval-2",
    approval_kind: "command",
    timestamp: "2026-06-21T01:00:08.500Z",
    title: "Run verification command",
    reason: "Approval policy requires explicit confirmation for local command execution.",
    subject: "pnpm verify"
  },
  {
    type: "warning",
    session_id: "claude-workbench-1",
    id: "warning-sanitized-fixture",
    timestamp: "2026-06-21T01:00:09.000Z",
    message: "Fixture is sanitized and does not include raw Claude logs."
  },
  {
    type: "assistant.message.completed",
    session_id: "claude-workbench-1",
    message_id: "assistant-1",
    timestamp: "2026-06-21T01:00:10.000Z"
  },
  {
    type: "session.completed",
    session_id: "claude-workbench-1",
    timestamp: "2026-06-21T01:00:11.000Z",
    status: "succeeded"
  },
  {
    type: "unknown.record",
    session_id: "claude-workbench-1",
    timestamp: "2026-06-21T01:00:12.000Z"
  }
] as const;

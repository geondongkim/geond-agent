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
    type: "usage.reported",
    session_id: "claude-workbench-1",
    id: "usage-fixture-1",
    timestamp: "2026-06-21T01:00:05.500Z",
    source: "provider",
    model: "glm-4.7",
    usage: {
      input_tokens: 1200,
      output_tokens: 220,
      cache_read_input_tokens: 180,
      service_tier: "standard"
    }
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

export const CLAUDE_CODE_REAL_STREAM_JSON_FIXTURE = [
  {
    type: "system",
    subtype: "init",
    session_id: "real-claude-session-1",
    cwd: "/workspace/geond-agent",
    tools: ["Read"],
    model: "glm-5.2",
    permissionMode: "plan",
    claude_code_version: "2.1.183"
  },
  {
    type: "system",
    subtype: "status",
    session_id: "real-claude-session-1",
    status: "requesting"
  },
  {
    type: "stream_event",
    session_id: "real-claude-session-1",
    event: {
      type: "message_start",
      message: {
        id: "msg-real-text-1",
        type: "message",
        role: "assistant",
        model: "glm-5.2"
      }
    }
  },
  {
    type: "stream_event",
    session_id: "real-claude-session-1",
    event: {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "text",
        text: ""
      }
    }
  },
  {
    type: "stream_event",
    session_id: "real-claude-session-1",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "text_delta",
        text: "I read the "
      }
    }
  },
  {
    type: "stream_event",
    session_id: "real-claude-session-1",
    event: {
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "text_delta",
        text: "workspace docs."
      }
    }
  },
  {
    type: "stream_event",
    session_id: "real-claude-session-1",
    event: {
      type: "content_block_stop",
      index: 0
    }
  },
  {
    type: "assistant",
    session_id: "real-claude-session-1",
    message: {
      id: "msg-tool-readme",
      role: "assistant",
      model: "glm-5.2",
      content: [
        {
          type: "tool_use",
          id: "call-read-readme",
          name: "Read",
          input: {
            file_path: "/workspace/geond-agent/README.md"
          }
        }
      ]
    }
  },
  {
    type: "user",
    session_id: "real-claude-session-1",
    message: {
      content: [
        {
          tool_use_id: "call-read-readme",
          type: "tool_result",
          content: "1\\t# geond-agent\\n2\\tLocal-first agent workbench."
        }
      ]
    },
    tool_use_result: {
      type: "text",
      file: {
        filePath: "/workspace/geond-agent/README.md"
      }
    }
  },
  {
    type: "assistant",
    session_id: "real-claude-session-1",
    message: {
      id: "msg-real-text-1",
      role: "assistant",
      model: "glm-5.2",
      content: [
        {
          type: "text",
          text: "I read the workspace docs."
        }
      ]
    }
  },
  {
    type: "stream_event",
    session_id: "real-claude-session-1",
    uuid: "usage-delta-1",
    event: {
      type: "message_delta",
      usage: {
        input_tokens: 240,
        output_tokens: 32,
        cache_read_input_tokens: 16,
        service_tier: "standard"
      }
    }
  },
  {
    type: "result",
    subtype: "success",
    session_id: "real-claude-session-1",
    is_error: false,
    stop_reason: "end_turn",
    duration_ms: 1620,
    total_cost_usd: 0.001,
    usage: {
      input_tokens: 260,
      output_tokens: 38,
      cache_read_input_tokens: 16,
      service_tier: "standard"
    },
    modelUsage: {
      "glm-5.2": {
        input_tokens: 260,
        output_tokens: 38
      }
    }
  }
] as const;

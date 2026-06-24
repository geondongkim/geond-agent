export const CODEX_CLI_SANITIZED_JSONL_FIXTURE: readonly unknown[] = [
  {
    type: "thread.started",
    thread_id: "codex-fixture-thread"
  },
  {
    type: "turn.started"
  },
  {
    type: "item.completed",
    item: {
      id: "codex-todo-1",
      type: "todo_list",
      items: [
        { text: "Inspect Codex SDK event shape", completed: true },
        { text: "Map item events into WorkbenchEvent", completed: false }
      ]
    }
  },
  {
    type: "item.completed",
    item: {
      id: "codex-message-1",
      type: "agent_message",
      text: "Codex emits thread and item events; geond-agent should normalize those instead of inventing a separate shape."
    }
  },
  {
    type: "item.completed",
    item: {
      id: "codex-command-1",
      type: "command_execution",
      command: "rg -n \"ThreadEvent\" sdk/typescript/src",
      aggregated_output: "sdk/typescript/src/events.ts: Top-level JSONL events emitted by codex exec.",
      exit_code: 0,
      status: "completed"
    }
  },
  {
    type: "item.completed",
    item: {
      id: "codex-file-change-1",
      type: "file_change",
      changes: [
        {
          path: "packages/codex-cli-bridge/src/jsonl.ts",
          kind: "update"
        }
      ],
      status: "completed"
    }
  },
  {
    type: "item.completed",
    item: {
      id: "codex-mcp-1",
      type: "mcp_tool_call",
      server: "filesystem",
      tool: "read_file",
      arguments: { path: "packages/codex-cli-bridge/src/jsonl.ts" },
      status: "completed"
    }
  },
  {
    type: "turn.completed",
    usage: {
      input_tokens: 1200,
      cached_input_tokens: 128,
      output_tokens: 280,
      reasoning_output_tokens: 64
    }
  },
  {
    type: "codex.future.event",
    payload: "kept intentionally small and sanitized"
  }
];

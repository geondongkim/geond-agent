# Security Policy

`geond-agent` is an early-stage local agent workbench. It may eventually execute
shell commands, edit files, connect to MCP servers, and call model providers.

## Supported Versions

No stable release has been published yet.

## Reporting Security Issues

Please avoid filing public issues that contain secrets, exploit details, or
private repository data.

Until a dedicated security contact is published, report sensitive issues through
GitHub private vulnerability reporting if it is enabled for this repository.

## Secret Handling

- Never commit API keys or provider tokens.
- Never commit local Claude, Goose, Z.ai, MCP, or shell session state.
- Use `.env.example` for placeholders only.
- Treat model prompts, tool traces, and terminal logs as potentially sensitive.

import type { UiI18n } from "@geond-agent/ui-workbench";

import type { DesktopRunnerMode } from "../demo-workbench.js";
import type { ProjectedActiveSession } from "../lib/workbench-types.js";

export interface RunnerPromptContext {
  readonly activeSession?: ProjectedActiveSession;
  readonly maxEvidenceItems?: number;
}

export function getComposerPlaceholder(mode: DesktopRunnerMode, i18n: UiI18n): string {
  return mode === "claude-live"
    ? i18n.t("workbench.composer.livePlaceholder")
    : i18n.t("workbench.composer.placeholder");
}

export function buildDispatchPrompt(
  mode: DesktopRunnerMode,
  prompt: string,
  i18n: UiI18n,
  context: RunnerPromptContext = {}
): string {
  const trimmed = prompt.trim();
  if (trimmed.length > 0) {
    return appendEvidenceContext(trimmed, context);
  }

  return appendEvidenceContext(getComposerPlaceholder(mode, i18n), context);
}

export function createRunnerEvidencePromptSection({
  activeSession,
  maxEvidenceItems = 8
}: RunnerPromptContext): string | undefined {
  if (!activeSession) {
    return undefined;
  }

  const contextLines = activeSession.contextAttachments
    .slice(0, maxEvidenceItems)
    .map((attachment) =>
      [
        `- Context [${attachment.kind}] ${attachment.title}`,
        attachment.path ? `path: ${attachment.path}` : undefined,
        `state: ${attachment.contentState}`,
        attachment.range ? `range: ${formatRange(attachment.range)}` : undefined,
        attachment.summary ? `summary: ${attachment.summary}` : undefined
      ]
        .filter((part): part is string => Boolean(part))
        .join(" | ")
    );
  const diffLines = activeSession.diffs
    .flatMap((diff) =>
      diff.files.map((file) =>
        [
          `- Diff ${diff.title ?? diff.id}`,
          `file: ${file.path}`,
          `change: ${file.changeKind}`,
          formatDiffStat(file),
          diff.summary ? `summary: ${diff.summary}` : undefined
        ]
          .filter((part): part is string => Boolean(part))
          .join(" | ")
      )
    )
    .slice(0, maxEvidenceItems);
  const lines = [...contextLines, ...diffLines].slice(0, maxEvidenceItems);

  if (lines.length === 0) {
    return undefined;
  }

  return [
    "Workbench evidence context (metadata only; raw private file contents are not attached):",
    ...lines
  ].join("\n");
}

function appendEvidenceContext(prompt: string, context: RunnerPromptContext): string {
  const evidence = createRunnerEvidencePromptSection(context);
  return evidence ? `${prompt}\n\n${evidence}` : prompt;
}

function formatRange(
  range: ProjectedActiveSession["contextAttachments"][number]["range"]
): string | undefined {
  if (!range) {
    return undefined;
  }

  const start = `${range.startLine}${range.startColumn ? `:${range.startColumn}` : ""}`;
  const end = range.endLine
    ? `${range.endLine}${range.endColumn ? `:${range.endColumn}` : ""}`
    : undefined;

  return end ? `L${start}-L${end}` : `L${start}`;
}

function formatDiffStat({
  additions,
  deletions
}: ProjectedActiveSession["diffs"][number]["files"][number]): string {
  const added = additions ?? 0;
  const deleted = deletions ?? 0;
  return `stat: +${added} / -${deleted}`;
}

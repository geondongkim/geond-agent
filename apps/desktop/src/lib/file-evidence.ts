import type { InspectorSessionReadModel } from "./inspector-read-model.js";
import type { ProjectedActiveSession } from "./workbench-types.js";

export interface FileEvidencePreviewModel {
  readonly contextCount: number;
  readonly changedFileCount: number;
  readonly contextItems: readonly FileEvidenceContextItem[];
  readonly changedFileItems: readonly FileEvidenceChangedFileItem[];
}

export type FileEvidenceSelection =
  | {
      readonly type: "changed-file";
      readonly item: FileEvidenceChangedFileItem;
    }
  | {
      readonly type: "context";
      readonly item: FileEvidenceContextItem;
    };

export interface FileEvidenceContextItem {
  readonly id: string;
  readonly kind: ProjectedActiveSession["contextAttachments"][number]["kind"];
  readonly title: string;
  readonly provenance: ProjectedActiveSession["contextAttachments"][number]["provenance"];
  readonly contentState: ProjectedActiveSession["contextAttachments"][number]["contentState"];
  readonly path?: string;
  readonly language?: string;
  readonly range?: ProjectedActiveSession["contextAttachments"][number]["range"];
  readonly summary?: string;
}

export interface FileEvidenceChangedFileItem {
  readonly id: string;
  readonly diffId: string;
  readonly diffTitle?: string;
  readonly diffSummary?: string;
  readonly path: string;
  readonly changeKind: string;
  readonly additions: number;
  readonly deletions: number;
}

export function createFileEvidencePreviewModel({
  activeSession,
  inspectorData
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
}): FileEvidencePreviewModel {
  const contextAttachments =
    inspectorData?.contextAttachments ?? activeSession?.contextAttachments ?? [];
  const diffs = inspectorData?.diffs ?? activeSession?.diffs ?? [];

  return {
    contextCount: contextAttachments.length,
    changedFileCount: diffs.reduce((count, diff) => count + diff.files.length, 0),
    contextItems: contextAttachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      title: attachment.title,
      provenance: attachment.provenance,
      contentState: attachment.contentState,
      path: attachment.path,
      language: attachment.language,
      range: attachment.range,
      summary: attachment.summary
    })),
    changedFileItems: diffs.flatMap((diff) =>
      diff.files.map((file, index) => ({
        id: `${diff.id}:${file.path}:${index}`,
        diffId: diff.id,
        diffTitle: diff.title,
        diffSummary: diff.summary,
        path: file.path,
        changeKind: file.changeKind,
        additions: file.additions ?? 0,
        deletions: file.deletions ?? 0
      }))
    )
  };
}

export function formatEvidenceRange(
  range: ProjectedActiveSession["contextAttachments"][number]["range"]
): string {
  if (!range) {
    return "";
  }

  const start = `${range.startLine}${range.startColumn ? `:${range.startColumn}` : ""}`;
  const end = range.endLine
    ? `${range.endLine}${range.endColumn ? `:${range.endColumn}` : ""}`
    : undefined;

  return end ? `L${start}-L${end}` : `L${start}`;
}

export function formatDiffStat({
  additions,
  deletions
}: {
  readonly additions: number;
  readonly deletions: number;
}): string {
  return `+${additions} / -${deletions}`;
}

export function findFileEvidenceSelection(
  model: FileEvidencePreviewModel,
  selectionId: string | undefined
): FileEvidenceSelection | undefined {
  const changedFile = model.changedFileItems.find((item) => item.id === selectionId);
  if (changedFile) {
    return { type: "changed-file", item: changedFile };
  }

  const contextItem = model.contextItems.find((item) => item.id === selectionId);
  if (contextItem) {
    return { type: "context", item: contextItem };
  }

  if (model.changedFileItems[0]) {
    return { type: "changed-file", item: model.changedFileItems[0] };
  }

  if (model.contextItems[0]) {
    return { type: "context", item: model.contextItems[0] };
  }

  return undefined;
}

export function getFileEvidenceSelectionId(
  selection: FileEvidenceSelection | undefined
): string | undefined {
  return selection?.item.id;
}

export function createEvidenceFollowUpDraft(selection: FileEvidenceSelection): string {
  if (selection.type === "changed-file") {
    const item = selection.item;
    return [
      `Review the changed file evidence for ${item.path}.`,
      `Change: ${item.changeKind} ${formatDiffStat(item)}.`,
      item.diffSummary ? `Summary: ${item.diffSummary}` : undefined
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }

  const item = selection.item;
  return [
    `Review the attached context evidence for ${item.title}.`,
    item.path ? `Path: ${item.path}` : undefined,
    item.range ? `Range: ${formatEvidenceRange(item.range)}` : undefined,
    item.summary ? `Summary: ${item.summary}` : undefined
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export type TextExportResult = "saved" | "downloaded" | "cancelled";
export type JsonArtifactKind =
  | "screenshot-manifest"
  | "structured-trace"
  | "multi-session-trace-bundle"
  | "visual-capture-policy";

export interface ExportMarkdownFileOptions {
  readonly fileName: string;
  readonly text: string;
  readonly title?: string;
}

export interface ExportJsonArtifactOptions {
  readonly fileName: string;
  readonly kind: JsonArtifactKind;
  readonly text: string;
  readonly title?: string;
}

export async function exportMarkdownFile({
  fileName,
  text,
  title
}: ExportMarkdownFileOptions): Promise<TextExportResult> {
  if (isTauriRuntime()) {
    try {
      const path = await save({
        defaultPath: fileName,
        filters: [{ name: "Markdown", extensions: ["md"] }],
        title
      });

      if (typeof path !== "string" || path.trim().length === 0) {
        return "cancelled";
      }

      await invoke("write_text_file", { contents: text, path });
      return "saved";
    } catch {
      // Keep renderer-only development and test runs usable when native save is unavailable.
    }
  }

  downloadTextFile(fileName, text);
  return "downloaded";
}

export async function exportJsonArtifact({
  fileName,
  kind,
  text,
  title
}: ExportJsonArtifactOptions): Promise<TextExportResult> {
  if (isTauriRuntime()) {
    try {
      const path = await save({
        defaultPath: fileName,
        filters: [{ name: "JSON", extensions: ["json"] }],
        title
      });

      if (typeof path !== "string" || path.trim().length === 0) {
        return "cancelled";
      }

      await invoke("write_evidence_capture_artifact", { contents: text, kind, path });
      return "saved";
    } catch {
      // Keep renderer-only development and test runs usable when native save is unavailable.
    }
  }

  downloadTextFile(fileName, text, "application/json;charset=utf-8");
  return "downloaded";
}

function downloadTextFile(
  fileName: string,
  text: string,
  type = "text/markdown;charset=utf-8"
): void {
  const browserDocument = globalThis.document;
  if (!browserDocument) {
    return;
  }

  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = browserDocument.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  browserDocument.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function isTauriRuntime(): boolean {
  return Boolean((globalThis as { readonly __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

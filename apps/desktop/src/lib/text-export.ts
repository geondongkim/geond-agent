import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export type TextExportResult = "saved" | "downloaded" | "cancelled";

export interface ExportMarkdownFileOptions {
  readonly fileName: string;
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

function downloadTextFile(fileName: string, text: string): void {
  const browserDocument = globalThis.document;
  if (!browserDocument) {
    return;
  }

  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
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

import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import type { UiI18n } from "@geond-agent/ui-workbench";

interface SettingsKeyInputProps {
  readonly workspacePath: string | undefined;
  readonly i18n: UiI18n;
  readonly onChanged?: () => void;
}

function isTauriRuntime(): boolean {
  return Boolean((globalThis as { readonly __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function SettingsKeyInput({ workspacePath, i18n, onChanged }: SettingsKeyInputProps) {
  const [present, setPresent] = useState(false);
  const [envLocalPresent, setEnvLocalPresent] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshFlags = useCallback(async () => {
    if (!isTauriRuntime()) {
      setPresent(false);
      setEnvLocalPresent(false);
      return;
    }

    try {
      const [keyPresent, envPresent] = await Promise.all([
        invoke<boolean>("get_provider_key_presence", { provider: "zai" }),
        invoke<boolean>("has_env_local_key", { cwd: workspacePath ?? null, provider: "zai" })
      ]);
      setPresent(keyPresent);
      setEnvLocalPresent(envPresent);
    } catch (error) {
      console.error("Failed to check provider key presence:", error);
      setPresent(false);
      setEnvLocalPresent(false);
    }
  }, [workspacePath]);

  useEffect(() => {
    void refreshFlags();
  }, [refreshFlags]);

  const handleSet = async () => {
    if (!isTauriRuntime() || busy || draft.trim() === "") {
      return;
    }

    setBusy(true);
    try {
      await invoke("set_provider_key", { provider: "zai", value: draft.trim() });
      setDraft("");
      await refreshFlags();
      onChanged?.();
    } catch (error) {
      console.error("Failed to set provider key:", error);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!isTauriRuntime() || busy) {
      return;
    }

    setBusy(true);
    try {
      await invoke("clear_provider_key", { provider: "zai" });
      await refreshFlags();
      onChanged?.();
    } catch (error) {
      console.error("Failed to clear provider key:", error);
    } finally {
      setBusy(false);
    }
  };

  const handleImportFromEnv = async () => {
    if (!isTauriRuntime() || busy) {
      return;
    }

    setBusy(true);
    try {
      await invoke<boolean>("migrate_provider_key_from_env", {
        cwd: workspacePath ?? null,
        provider: "zai"
      });
      await refreshFlags();
      onChanged?.();
    } catch (error) {
      console.error("Failed to import provider key from .env.local:", error);
    } finally {
      setBusy(false);
    }
  };

  if (!isTauriRuntime()) {
    return (
      <div className="settings-key-input">
        <p className="muted-meta">{i18n.t("workbench.settings.providerSection")}</p>
        <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
          {i18n.t("workbench.settings.providerKeyMissing")}
        </p>
      </div>
    );
  }

  return (
    <div className="settings-key-input">
      <p className="muted-meta">{i18n.t("workbench.settings.providerSection")}</p>
      <div className="settings-key-status">
        {present
          ? i18n.t("workbench.settings.providerKeySet")
          : envLocalPresent
            ? i18n.t("workbench.settings.providerKeyEnvAvailable")
            : i18n.t("workbench.settings.providerKeyMissing")}
      </div>
      <div className="settings-key-row">
        {present ? (
          <button
            type="button"
            className="settings-button"
            onClick={handleClear}
            disabled={busy}
          >
            {i18n.t("workbench.settings.clearKey")}
          </button>
        ) : (
          <>
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="••••••••"
              className="settings-password-input"
              disabled={busy}
            />
            <button
              type="button"
              className="settings-button"
              onClick={handleSet}
              disabled={busy || draft.trim() === ""}
            >
              {i18n.t("workbench.settings.setKey")}
            </button>
            {envLocalPresent && (
              <button
                type="button"
                className="settings-button"
                onClick={handleImportFromEnv}
                disabled={busy}
              >
                {i18n.t("workbench.settings.importFromEnv")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

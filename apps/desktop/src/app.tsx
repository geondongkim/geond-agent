import { useMemo, useState } from "react";

import {
  createWorkbenchSettingsLabels,
  type WorkbenchRuntimeSnapshot,
  type WorkbenchSessionDefaults
} from "@geond-agent/ui-workbench";

import type { DesktopDemoDocument, DesktopRunnerMode } from "./demo-workbench.js";
import { Button } from "./components/ui/button.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs.js";
import { cn } from "./lib/cn.js";

const lifecycleTone = {
  started: "text-emerald-900 bg-emerald-100",
  resumed: "text-emerald-900 bg-emerald-100",
  created: "text-slate-800 bg-slate-200",
  paused: "text-amber-900 bg-amber-100",
  completed: "text-cyan-900 bg-cyan-100",
  failed: "text-rose-900 bg-rose-100"
} as const;

const backendTone = {
  ready: "text-emerald-900 bg-emerald-100",
  attention: "text-amber-900 bg-amber-100",
  unknown: "text-slate-800 bg-slate-200"
} as const;

const uiLanguageOptions = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" }
] as const;

const backendOptions = [
  { value: "claude-code.external-cli-acp", label: "Claude Code external CLI/ACP" }
] as const;

const providerRouteOptions = [
  { value: "zai.anthropic-compatible", label: "Z.ai Anthropic-compatible" },
  { value: "zai.openai-compatible-coding", label: "Z.ai OpenAI-compatible coding" }
] as const;

const modelAliasOptions = [
  { value: "sonnet", label: "sonnet -> GLM 4.7" },
  { value: "opus", label: "opus -> GLM 5.2" },
  { value: "haiku", label: "haiku -> GLM 4.7" },
  { value: "auto", label: "auto" }
] as const;

interface AppProps {
  readonly document: DesktopDemoDocument;
}

export function App({ document }: AppProps) {
  const [controllerSnapshot, setControllerSnapshot] = useState(
    document.initialControllerSnapshot
  );
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<WorkbenchRuntimeSnapshot>(
    document.runtime.getSnapshot()
  );
  const [sessionDefaults, setSessionDefaults] = useState(document.sessionDefaults);
  const [workspacePath, setWorkspacePath] = useState(
    document.activeWorkspace.path
  );
  const [inspectorTab, setInspectorTab] = useState("diff");
  const [runnerStatus, setRunnerStatus] = useState("");
  const [runnerMode, setRunnerMode] = useState<DesktopRunnerMode>("fixture");
  const [ignoredRecordCount, setIgnoredRecordCount] = useState(document.ignoredRecordCount);

  const i18n = runtimeSnapshot.i18n;
  const settingsLabels = useMemo(() => createWorkbenchSettingsLabels(i18n), [i18n]);
  const agentLanguageOptions = useMemo(
    () => [
      { value: "system", label: i18n.t("workbench.language.system") },
      { value: "en", label: "English" },
      { value: "ko", label: "한국어" }
    ],
    [i18n]
  );
  const routingModeOptions = useMemo(
    () => [
      { value: "manual", label: i18n.t("workbench.selection.manual") },
      { value: "auto", label: i18n.t("workbench.selection.auto") }
    ],
    [i18n]
  );
  const projection = controllerSnapshot.projection;
  const activeSession = projection.activeSession;
  const workspaceOptions = useMemo(() => {
    const options = new Map<string, { readonly label: string; readonly path: string }>();
    document.workspaces.forEach((workspace) => options.set(workspace.path, workspace));
    projection.workspaces.forEach((workspace) => options.set(workspace.path, workspace));
    return [...options.values()];
  }, [document.workspaces, projection.workspaces]);
  const filteredSessions = useMemo(() => {
    if (workspacePath === "__all__") {
      return projection.recentSessions;
    }

    return projection.sessions.filter((session) => session.workspacePath === workspacePath);
  }, [projection.recentSessions, projection.sessions, workspacePath]);

  const selectSession = (sessionId: string) => {
    setControllerSnapshot(document.controller.selectSession(sessionId));
  };

  const startSession = async (mode: DesktopRunnerMode) => {
    const nextIndex = controllerSnapshot.events.length + 1;
    const sessionId = `local-session-${Date.now()}`;
    const title = `Local demo session ${projection.sessions.length + 1}`;
    const selectedWorkspacePath =
      workspacePath === "__all__" ? document.activeWorkspace.path : workspacePath;
    setRunnerStatus(
      mode === "claude-live"
        ? i18n.t("workbench.runner.startingClaude")
        : i18n.t("workbench.runner.startingFixture")
    );

    try {
      const result = await document.runSession(
        mode,
        document.createRunnerRequest({
          sessionId,
          title,
          prompt: mode === "claude-live"
            ? "Run a concise geond-agent workbench smoke session. Do not modify files."
            : "Run a local fixture-backed workbench session without a paid provider call.",
          languageSettings: runtimeSnapshot.languageSettings,
          sessionDefaults,
          workspacePath: selectedWorkspacePath
        })
      );

      await document.eventStore.append(result.events);
      setIgnoredRecordCount(result.ignoredRecords.length);
      setControllerSnapshot(
        document.controller.appendEvents(result.events, { activateSessionId: sessionId })
      );
      setRunnerStatus(
        formatMessage(i18n.t("workbench.runner.appendedEvents"), {
          count: result.events.length,
          executable: result.command.executable,
          index: nextIndex,
          mode
        })
      );
    } catch (error) {
      setRunnerStatus(error instanceof Error ? error.message : i18n.t("workbench.runner.failed"));
    }
  };

  const startSelectedRunner = () => {
    void startSession(runnerMode);
  };

  const updateUiLanguage = async (language: string) => {
    const nextSnapshot = await document.runtime.setUiLanguage(language);
    setRuntimeSnapshot(nextSnapshot);
  };

  const updateAgentResponseLanguage = async (language: string) => {
    const nextSnapshot = await document.runtime.setAgentResponseLanguage(language);
    setRuntimeSnapshot(nextSnapshot);
  };

  const updateSessionDefaults = async (patch: Partial<WorkbenchSessionDefaults>) => {
    const nextDefaults = await document.saveSessionDefaults({
      ...sessionDefaults,
      ...patch
    });
    setSessionDefaults(nextDefaults);
  };

  return (
    <main className="min-h-screen bg-[color:var(--shell)] px-4 py-5 text-[color:var(--ink)] md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="panel-surface overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(108,224,199,0.85),transparent)]" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="eyebrow">{i18n.t("workbench.shell.eyebrow")}</p>
              <h1 className="text-3xl font-semibold">{i18n.t("workbench.shell.title")}</h1>
              <p className="max-w-3xl text-sm leading-6 text-[color:var(--ink-soft)]">
                {i18n.t("workbench.shell.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--panel-muted)] px-3 py-2 text-sm">
                <span className="muted-meta">{i18n.t("workbench.runner.mode")}</span>
                <select
                  value={runnerMode}
                  onChange={(event) => setRunnerMode(event.target.value as DesktopRunnerMode)}
                  className="rounded-md border border-[color:var(--border-strong)] bg-[color:var(--panel)] px-2 py-1 text-sm outline-none"
                >
                  <option value="fixture">{i18n.t("workbench.runner.fixture")}</option>
                  <option value="claude-live">{i18n.t("workbench.runner.claudeLive")}</option>
                </select>
              </label>
              <Button onClick={startSelectedRunner}>
                {runnerMode === "claude-live"
                  ? i18n.t("workbench.actions.runClaudeSession")
                  : i18n.t("workbench.actions.newDemoSession")}
              </Button>
              <Button variant="outline" onClick={() => setInspectorTab("settings")}>
                {i18n.t("workbench.actions.settings")}
              </Button>
              <Button variant="ghost">
                {runnerStatus || i18n.t("workbench.runner.fixtureReady")}
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="panel-surface flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="panel-title">{i18n.t("workbench.sessionSidebar.title")}</h2>
                <span className="muted-meta">
                  {projection.sessions.length} {i18n.t("workbench.status.total")}
                </span>
              </div>

              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                <label className="muted-meta block" htmlFor="workspace-filter">
                  {i18n.t("workbench.sessionSidebar.workspaceSwitcher")}
                </label>
                <select
                  id="workspace-filter"
                  value={workspacePath}
                  onChange={(event) => setWorkspacePath(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[color:var(--border-strong)] bg-[color:var(--panel)] px-3 py-2 text-sm outline-none"
                >
                  <option value="__all__">{i18n.t("workbench.workspace.all")}</option>
                  {workspaceOptions.map((workspace) => (
                    <option key={workspace.path} value={workspace.path}>
                      {workspace.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SessionList
              activeSessionId={activeSession?.id}
              title={i18n.t("workbench.sessionSidebar.pinned")}
              sessions={projection.pinnedSessions}
              i18n={i18n}
              onSelect={selectSession}
            />
            <SessionList
              activeSessionId={activeSession?.id}
              title={i18n.t("workbench.sessionSidebar.recent")}
              sessions={filteredSessions}
              i18n={i18n}
              onSelect={selectSession}
            />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-[color:var(--ink-soft)]">
                {i18n.t("workbench.sessionSidebar.backendStatus")}
              </h3>
              <div className="space-y-2">
                {projection.backendStatuses.map((status) => (
                  <div key={status.backendAdapterId} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{status.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">{status.detail}</p>
                      </div>
                      <span className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold uppercase", backendTone[status.level])}>
                        {formatStatusLabel(i18n, status.level)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="panel-surface flex flex-col gap-4">
            <div className="flex flex-col gap-3 border-b border-[color:var(--border)] pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="panel-title">{i18n.t("workbench.timeline.title")}</h2>
                  <p className="text-sm text-[color:var(--ink-soft)]">
                    {activeSession?.title ?? i18n.t("workbench.timeline.empty")}
                  </p>
                </div>
                {activeSession ? (
                  <span className={cn("rounded-md px-3 py-1 text-[10px] font-bold uppercase", lifecycleTone[activeSession.lifecycle])}>
                    {formatStatusLabel(i18n, activeSession.lifecycle)}
                  </span>
                ) : null}
              </div>

              {activeSession?.plan.length ? (
                <div className="grid gap-2 md:grid-cols-3">
                  {activeSession.plan.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                      <p className="muted-meta">{formatStatusLabel(i18n, item.status)}</p>
                      <p className="mt-1 text-sm font-medium">{item.title}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {activeSession?.timeline.length ? (
                activeSession.timeline.map((entry) => (
                  <article key={entry.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="muted-meta">{entry.kind}</p>
                        <h3 className="text-sm font-semibold">{entry.title}</h3>
                      </div>
                      <div className="text-right">
                        {entry.status ? <p className="muted-meta">{formatStatusLabel(i18n, entry.status)}</p> : null}
                        {entry.at ? <p className="text-[11px] text-[color:var(--ink-soft)]">{entry.at}</p> : null}
                      </div>
                    </div>
                    {entry.body ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink-soft)]">
                        {entry.body}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <EmptyState text={i18n.t("workbench.timeline.empty")} />
              )}
            </div>
          </section>

          <aside className="panel-surface">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="panel-title">{i18n.t("workbench.inspector.title")}</h2>
              <span className="muted-meta">{document.providerSummary}</span>
            </div>

            <Tabs value={inspectorTab} onValueChange={setInspectorTab}>
              <TabsList>
                <TabsTrigger value="diff">{i18n.t("workbench.inspector.diff")}</TabsTrigger>
                <TabsTrigger value="terminal">{i18n.t("workbench.inspector.terminal")}</TabsTrigger>
                <TabsTrigger value="approvals">{i18n.t("workbench.inspector.approvals")}</TabsTrigger>
                <TabsTrigger value="settings">{i18n.t("workbench.inspector.settings")}</TabsTrigger>
                <TabsTrigger value="selection">{i18n.t("workbench.inspector.selection")}</TabsTrigger>
              </TabsList>

              <TabsContent value="diff">
                {activeSession?.diffs.length ? (
                  <div className="space-y-3">
                    {activeSession.diffs.map((diff) => (
                      <div key={diff.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                        <p className="text-sm font-semibold">{diff.title ?? diff.id}</p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">{diff.summary}</p>
                        <div className="mt-3 space-y-2">
                          {diff.files.map((file) => (
                            <div key={`${diff.id}:${file.path}`} className="rounded-md bg-[color:var(--panel)] px-3 py-2 text-xs">
                              <p className="font-medium">{file.path}</p>
                              <p className="mt-1 text-[color:var(--ink-soft)]">
                                {file.changeKind} +{file.additions ?? 0} / -{file.deletions ?? 0}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text={i18n.t("workbench.empty.diff")} />
                )}
              </TabsContent>

              <TabsContent value="terminal">
                {activeSession?.commandOutputs.length ? (
                  <div className="space-y-3">
                    {activeSession.commandOutputs.map((output) => (
                      <div key={output.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--ink)] p-3 text-[color:var(--shell)]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-xs uppercase">{output.id}</p>
                          <p className="font-mono text-[11px] text-[color:var(--shell-soft)]">
                            {output.status}
                            {output.exitCode !== undefined ? ` / ${output.exitCode}` : ""}
                          </p>
                        </div>
                        <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-6 text-[color:var(--shell-soft)]">
                          {output.preview}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text={i18n.t("workbench.empty.terminal")} />
                )}
              </TabsContent>

              <TabsContent value="approvals">
                {activeSession?.approvals.length ? (
                  <div className="space-y-3">
                    {activeSession.approvals.map((approval) => (
                      <div key={approval.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{approval.title}</p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                              {approval.subject ?? approval.reason ?? approval.kind}
                            </p>
                          </div>
                          <span className="rounded-md border border-[color:var(--border-strong)] px-2.5 py-1 text-[10px] font-bold uppercase">
                            {approval.status}
                            {approval.decision ? ` / ${approval.decision}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text={i18n.t("workbench.empty.approvals")} />
                )}
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-3">
                  <SettingsSelect
                    label={settingsLabels.fields.uiLanguage}
                    value={runtimeSnapshot.languageSettings.uiLanguage}
                    options={uiLanguageOptions}
                    onChange={(value) => void updateUiLanguage(value)}
                  />
                  <SettingsSelect
                    label={settingsLabels.fields.agentResponseLanguage}
                    value={runtimeSnapshot.languageSettings.agentResponseLanguage}
                    options={agentLanguageOptions}
                    onChange={(value) => void updateAgentResponseLanguage(value)}
                  />
                  <SettingsSelect
                    label={settingsLabels.fields.backend}
                    value={sessionDefaults.defaultBackendAdapterId}
                    options={backendOptions}
                    onChange={(value) => void updateSessionDefaults({ defaultBackendAdapterId: value })}
                  />
                  <SettingsSelect
                    label={settingsLabels.fields.providerRoute}
                    value={sessionDefaults.defaultProviderRouteId}
                    options={providerRouteOptions}
                    onChange={(value) => void updateSessionDefaults({ defaultProviderRouteId: value })}
                  />
                  <SettingsSelect
                    label={settingsLabels.fields.modelProfile}
                    value={sessionDefaults.defaultModelAlias}
                    options={modelAliasOptions}
                    onChange={(value) => void updateSessionDefaults({ defaultModelAlias: value })}
                  />
                  <SettingsSelect
                    label={settingsLabels.fields.routingMode}
                    value={sessionDefaults.routingMode}
                    options={routingModeOptions}
                    onChange={(value) => void updateSessionDefaults({ routingMode: value === "auto" ? "auto" : "manual" })}
                  />
                  <SettingsRow
                    label={settingsLabels.fields.approvalPolicy}
                    value={settingsLabels.values.approvalPolicyAskFirst}
                  />
                  <SettingsRow
                    label={settingsLabels.fields.persistenceBoundary}
                    value={settingsLabels.values.persistenceBoundaryLocalOnly}
                    detail={document.persistence.notes.join(" ")}
                  />
                </div>
              </TabsContent>

              <TabsContent value="selection">
                {activeSession?.selection ? (
                  <div className="space-y-3">
                    <SettingsRow
                      label={i18n.t("workbench.selection.backend")}
                      value={activeSession.selection.backendAdapter?.label ?? activeSession.selection.backendAdapterId}
                    />
                    <SettingsRow
                      label={i18n.t("workbench.selection.provider")}
                      value={activeSession.selection.providerRoute?.label ?? activeSession.selection.providerRouteId ?? i18n.t("workbench.status.unknown")}
                    />
                    <SettingsRow
                      label={i18n.t("workbench.selection.model")}
                      value={activeSession.selection.modelProfile?.label ?? activeSession.selection.modelProfileId ?? i18n.t("workbench.status.unknown")}
                    />
                    <SettingsRow
                      label={i18n.t("workbench.selection.routingMode")}
                      value={formatRoutingModeLabel(i18n, activeSession.selection.routingMode)}
                    />
                    <SettingsRow
                      label={i18n.t("workbench.selection.uiLanguage")}
                      value={activeSession.selection.uiLanguage ?? runtimeSnapshot.languageSettings.uiLanguage}
                    />
                    <SettingsRow
                      label={i18n.t("workbench.selection.agentLanguage")}
                      value={
                        formatAgentLanguageLabel(
                          i18n,
                          activeSession.selection.agentResponseLanguage ??
                            runtimeSnapshot.languageSettings.agentResponseLanguage
                        )
                      }
                    />
                    <SettingsRow
                      label={i18n.t("workbench.selection.warnings")}
                      value={
                        activeSession.selection.capabilityWarnings?.length
                          ? activeSession.selection.capabilityWarnings.join(" | ")
                          : `${document.bridgeCommand || "claude"} --bare -p --verbose --output-format stream-json`
                      }
                      detail={formatMessage(i18n.t("workbench.selection.ignoredSanitizedRecords"), {
                        count: ignoredRecordCount
                      })}
                    />
                  </div>
                ) : (
                  <EmptyState text={i18n.t("workbench.empty.selection")} />
                )}
              </TabsContent>
            </Tabs>
          </aside>
        </section>
      </div>
    </main>
  );
}

function formatMessage(
  template: string,
  values: Readonly<Record<string, string | number>>
): string {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function formatAgentLanguageLabel(
  i18n: WorkbenchRuntimeSnapshot["i18n"],
  language: string
): string {
  switch (language) {
    case "system":
      return i18n.t("workbench.language.system");
    case "ko":
      return "한국어";
    case "en":
      return "English";
    default:
      return language;
  }
}

function formatRoutingModeLabel(
  i18n: WorkbenchRuntimeSnapshot["i18n"],
  mode: string | undefined
): string {
  switch (mode) {
    case "manual":
      return i18n.t("workbench.selection.manual");
    case "auto":
      return i18n.t("workbench.selection.auto");
    default:
      return mode ?? i18n.t("workbench.status.unknown");
  }
}

function formatStatusLabel(
  i18n: WorkbenchRuntimeSnapshot["i18n"],
  status: string
): string {
  switch (status) {
    case "created":
      return i18n.t("workbench.status.created");
    case "resumed":
      return i18n.t("workbench.status.resumed");
    case "paused":
      return i18n.t("workbench.status.paused");
    case "completed":
      return i18n.t("workbench.status.completed");
    case "started":
      return i18n.t("workbench.status.started");
    case "ready":
      return i18n.t("workbench.status.ready");
    case "attention":
      return i18n.t("workbench.status.attention");
    case "running":
    case "in_progress":
      return i18n.t("workbench.status.running");
    case "succeeded":
    case "approved":
      return i18n.t("workbench.status.succeeded");
    case "pending":
      return i18n.t("workbench.status.pending");
    case "failed":
    case "rejected":
      return i18n.t("workbench.status.failed");
    default:
      return status;
  }
}

function SessionList({
  activeSessionId,
  i18n,
  onSelect,
  sessions,
  title
}: {
  readonly activeSessionId?: string;
  readonly i18n: WorkbenchRuntimeSnapshot["i18n"];
  readonly onSelect: (sessionId: string) => void;
  readonly sessions: readonly DesktopDemoDocument["initialControllerSnapshot"]["projection"]["sessions"][number][];
  readonly title: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-[color:var(--ink-soft)]">{title}</h3>
        <span className="muted-meta">{sessions.length}</span>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            active={session.id === activeSessionId}
            i18n={i18n}
            onSelect={() => onSelect(session.id)}
          />
        ))}
      </div>
    </section>
  );
}

function SessionCard({
  active,
  i18n,
  onSelect,
  session
}: {
  readonly active: boolean;
  readonly i18n: WorkbenchRuntimeSnapshot["i18n"];
  readonly onSelect: () => void;
  readonly session: DesktopDemoDocument["initialControllerSnapshot"]["projection"]["sessions"][number];
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-[color:var(--accent)] bg-[color:var(--panel)] shadow-[0_18px_38px_rgba(10,24,31,0.12)]"
          : "border-[color:var(--border)] bg-[color:var(--panel-muted)] hover:border-[color:var(--border-strong)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{session.title}</p>
          <p className="text-xs leading-5 text-[color:var(--ink-soft)]">
            {session.workspacePath ?? i18n.t("workbench.status.unknown")}
          </p>
        </div>
        <span className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold uppercase", lifecycleTone[session.lifecycle])}>
          {formatStatusLabel(i18n, session.lifecycle)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[color:var(--ink-soft)]">
        <div>
          <p className="muted-meta">{i18n.t("workbench.status.backend")}</p>
          <p className="mt-1">{session.backendLabel ?? i18n.t("workbench.status.unknown")}</p>
        </div>
        <div>
          <p className="muted-meta">{i18n.t("workbench.status.approvals")}</p>
          <p className="mt-1">{session.pendingApprovalCount}</p>
        </div>
      </div>
    </button>
  );
}

function SettingsSelect({
  label,
  onChange,
  options,
  value
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value: string;
}) {
  return (
    <label className="block rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
      <span className="muted-meta">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-[color:var(--border-strong)] bg-[color:var(--panel)] px-3 py-2 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SettingsRow({
  detail,
  label,
  value
}: {
  readonly detail?: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
      <p className="muted-meta">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">{detail}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { readonly text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[color:var(--border-strong)] bg-[color:var(--panel-muted)] p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
      {text}
    </div>
  );
}

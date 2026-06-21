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
  started: "status-ok",
  resumed: "status-ok",
  created: "status-neutral",
  paused: "status-warn",
  completed: "status-ok",
  failed: "status-danger"
} as const;

const backendTone = {
  ready: "status-ok",
  attention: "status-warn",
  unknown: "status-neutral"
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
    <main className="workbench-shell">
      <div className="workbench-frame">
        <header className="command-strip">
          <div className="brand-lockup">
            <div className="app-mark">G</div>
            <div className="min-w-0">
              <p className="eyebrow">{i18n.t("workbench.shell.eyebrow")}</p>
              <h1 className="truncate text-lg font-semibold leading-6">
                {i18n.t("workbench.shell.title")}
              </h1>
              <p className="truncate font-mono text-[11px] text-[color:var(--inverse-soft)]">
                {activeSession?.title ?? i18n.t("workbench.timeline.empty")}
              </p>
            </div>
          </div>

          <div className="command-controls">
            <span className="metric-pill">
              {projection.sessions.length} {i18n.t("workbench.status.total")}
            </span>
            <span className="metric-pill">
              {activeSession?.approvals.length ?? 0} {i18n.t("workbench.status.approvals")}
            </span>
            <label className="inline-field">
              <span className="text-[10px] font-bold uppercase text-[color:var(--inverse-soft)]">
                {i18n.t("workbench.runner.mode")}
              </span>
              <select
                value={runnerMode}
                onChange={(event) => setRunnerMode(event.target.value as DesktopRunnerMode)}
                className="control-select"
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
          </div>
        </header>

        <section className="workbench-grid">
          <aside className="session-rail">
            <div className="flex items-center justify-between">
              <h2 className="panel-title">{i18n.t("workbench.sessionSidebar.title")}</h2>
              <span className="font-mono text-[11px] text-[color:var(--ink-muted)]">
                {projection.sessions.length}
              </span>
            </div>

            <div className="rail-card">
              <label className="muted-meta block" htmlFor="workspace-filter">
                {i18n.t("workbench.sessionSidebar.workspaceSwitcher")}
              </label>
              <select
                id="workspace-filter"
                value={workspacePath}
                onChange={(event) => setWorkspacePath(event.target.value)}
                className="mt-2 h-9 w-full rounded-md border border-[color:var(--border-strong)] bg-[color:var(--panel)] px-3 text-sm outline-none"
              >
                <option value="__all__">{i18n.t("workbench.workspace.all")}</option>
                {workspaceOptions.map((workspace) => (
                  <option key={workspace.path} value={workspace.path}>
                    {workspace.label}
                  </option>
                ))}
              </select>
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

            <section className="mt-auto space-y-2">
              <h3 className="panel-title">
                {i18n.t("workbench.sessionSidebar.backendStatus")}
              </h3>
              {projection.backendStatuses.map((status) => (
                <div key={status.backendAdapterId} className="rail-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5">{status.label}</p>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                        {status.detail}
                      </p>
                    </div>
                    <span className={cn("status-pill", backendTone[status.level])}>
                      {formatStatusLabel(i18n, status.level)}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          </aside>

          <section className="timeline-surface">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="panel-title">{i18n.t("workbench.timeline.title")}</h2>
                <p className="mt-1 truncate text-xl font-semibold">
                  {activeSession?.title ?? i18n.t("workbench.timeline.empty")}
                </p>
              </div>
              {activeSession ? (
                <span className={cn("status-pill", lifecycleTone[activeSession.lifecycle])}>
                  {formatStatusLabel(i18n, activeSession.lifecycle)}
                </span>
              ) : null}
            </div>

            {runnerStatus ? <div className="run-status-strip">{runnerStatus}</div> : null}

            {activeSession?.plan.length ? (
              <div className="plan-strip">
                {activeSession.plan.map((item) => (
                  <div key={item.id} className="plan-step">
                    <p className="muted-meta">{formatStatusLabel(i18n, item.status)}</p>
                    <p className="mt-1 text-sm font-medium leading-5">{item.title}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="event-stream pt-3">
              {activeSession?.timeline.length ? (
                activeSession.timeline.map((entry) => (
                  <article
                    key={entry.id}
                    className={cn("event-card", eventCardTone(entry.kind))}
                  >
                    <div className="event-rail">
                      <span className={cn("event-dot", eventDotTone(entry.kind, entry.status))} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="muted-meta">{entry.kind}</p>
                          <h3 className="truncate text-sm font-semibold">{entry.title}</h3>
                        </div>
                        <div className="text-right">
                          {entry.status ? (
                            <p className="muted-meta">{formatStatusLabel(i18n, entry.status)}</p>
                          ) : null}
                          {entry.at ? (
                            <p className="font-mono text-[11px] text-[color:var(--ink-muted)]">
                              {formatEventTime(entry.at)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {entry.body ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink-soft)]">
                          {entry.body}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState text={i18n.t("workbench.timeline.empty")} />
              )}
            </div>
          </section>

          <aside className="inspector-surface">
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="panel-title">{i18n.t("workbench.inspector.title")}</h2>
                <span className="font-mono text-[10px] text-[color:var(--ink-muted)]">
                  {sessionDefaults.defaultModelAlias}
                </span>
              </div>
              <p className="rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2 font-mono text-[11px] leading-5 text-[color:var(--ink-soft)]">
                {formatProviderSummary(document.providerSummary)}
              </p>
            </div>

            <Tabs value={inspectorTab} onValueChange={setInspectorTab}>
              <TabsList className="border-[color:var(--border)] bg-[color:var(--panel)]">
                <TabsTrigger value="diff">{i18n.t("workbench.inspector.diff")}</TabsTrigger>
                <TabsTrigger value="terminal">{i18n.t("workbench.inspector.terminal")}</TabsTrigger>
                <TabsTrigger value="approvals">{i18n.t("workbench.inspector.approvals")}</TabsTrigger>
                <TabsTrigger value="settings">{i18n.t("workbench.inspector.settings")}</TabsTrigger>
                <TabsTrigger value="selection">{i18n.t("workbench.inspector.selection")}</TabsTrigger>
              </TabsList>

              <TabsContent value="diff" className="border-0 bg-transparent p-0">
                {activeSession?.diffs.length ? (
                  <div className="space-y-2">
                    {activeSession.diffs.map((diff) => (
                      <div key={diff.id} className="inspector-card">
                        <p className="text-sm font-semibold">{diff.title ?? diff.id}</p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                          {diff.summary}
                        </p>
                        <div className="mt-3 space-y-2">
                          {diff.files.map((file) => (
                            <div key={`${diff.id}:${file.path}`} className="rounded-md bg-[color:var(--panel-muted)] px-3 py-2 text-xs">
                              <p className="font-mono font-medium">{file.path}</p>
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

              <TabsContent value="terminal" className="border-0 bg-transparent p-0">
                {activeSession?.commandOutputs.length ? (
                  <div className="space-y-2">
                    {activeSession.commandOutputs.map((output) => (
                      <div key={output.id} className="terminal-card">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-xs uppercase text-[color:var(--shell-soft)]">
                            {output.id}
                          </p>
                          <p className="font-mono text-[11px] text-[color:var(--inverse-soft)]">
                            {formatStatusLabel(i18n, output.status)}
                            {output.exitCode !== undefined ? ` / ${output.exitCode}` : ""}
                          </p>
                        </div>
                        <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-6 text-[color:var(--inverse-soft)]">
                          {output.preview}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text={i18n.t("workbench.empty.terminal")} />
                )}
              </TabsContent>

              <TabsContent value="approvals" className="border-0 bg-transparent p-0">
                {activeSession?.approvals.length ? (
                  <div className="space-y-2">
                    {activeSession.approvals.map((approval) => (
                      <div key={approval.id} className="inspector-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{approval.title}</p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                              {approval.subject ?? approval.reason ?? approval.kind}
                            </p>
                          </div>
                          <span className="status-pill status-neutral">
                            {formatStatusLabel(i18n, approval.status)}
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

              <TabsContent value="settings" className="border-0 bg-transparent p-0">
                <div className="space-y-2">
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

              <TabsContent value="selection" className="border-0 bg-transparent p-0">
                {activeSession?.selection ? (
                  <div className="space-y-2">
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

function eventCardTone(kind: string): string {
  switch (kind) {
    case "command":
      return "event-card-command";
    case "warning":
    case "error":
      return "event-card-warning";
    default:
      return "";
  }
}

function eventDotTone(kind: string, status?: string): string {
  if (kind === "command") {
    return "event-dot-command";
  }

  if (kind === "warning" || kind === "error" || status === "failed") {
    return "event-dot-warning";
  }

  if (status === "succeeded" || status === "completed" || status === "approved") {
    return "event-dot-ok";
  }

  return "";
}

function formatEventTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(parsed);
}

function formatProviderSummary(value: string): string {
  return value.replaceAll(" ", " · ");
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
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="panel-title">{title}</h3>
        <span className="font-mono text-[11px] text-[color:var(--ink-muted)]">{sessions.length}</span>
      </div>
      <div className="space-y-1.5">
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
        "session-card",
        active ? "session-card-active" : "session-card-idle"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold">{session.title}</p>
          <p className="text-xs leading-5 text-[color:var(--ink-soft)]">
            {session.workspacePath ?? i18n.t("workbench.status.unknown")}
          </p>
        </div>
        <span className={cn("status-pill", lifecycleTone[session.lifecycle])}>
          {formatStatusLabel(i18n, session.lifecycle)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_48px] gap-2 text-[11px] text-[color:var(--ink-soft)]">
        <div className="min-w-0">
          <p className="muted-meta">{i18n.t("workbench.status.backend")}</p>
          <p className="mt-1 truncate">{session.backendLabel ?? i18n.t("workbench.status.unknown")}</p>
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
    <label className="settings-field">
      <span className="muted-meta">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border border-[color:var(--border-strong)] bg-[color:var(--panel)] px-3 text-sm outline-none"
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
    <div className="settings-field">
      <p className="muted-meta">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">{detail}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { readonly text: string }) {
  return (
    <div className="rounded-md border border-dashed border-[color:var(--border-strong)] bg-[color:var(--panel-muted)] p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
      {text}
    </div>
  );
}

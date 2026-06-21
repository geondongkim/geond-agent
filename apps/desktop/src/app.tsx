import { useMemo, useState } from "react";

import type { DesktopDemoDocument } from "./demo-workbench.js";
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

interface AppProps {
  readonly document: DesktopDemoDocument;
}

export function App({ document }: AppProps) {
  const [workspacePath, setWorkspacePath] = useState(
    document.projection.workspaces[0]?.path ?? "__all__"
  );
  const [inspectorTab, setInspectorTab] = useState("diff");
  const activeSession = document.projection.activeSession;
  const filteredSessions = useMemo(() => {
    if (workspacePath === "__all__") {
      return document.projection.recentSessions;
    }

    return document.projection.sessions.filter((session) => session.workspacePath === workspacePath);
  }, [document.projection.recentSessions, document.projection.sessions, workspacePath]);

  return (
    <main className="min-h-screen bg-[color:var(--shell)] px-4 py-5 text-[color:var(--ink)] md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="panel-surface overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(108,224,199,0.85),transparent)]" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="eyebrow">geond-agent workbench</p>
              <h1 className="text-3xl font-semibold">Desktop UI first slice</h1>
              <p className="max-w-3xl text-sm leading-6 text-[color:var(--ink-soft)]">
                Tauri v2 shell, React renderer, Tailwind + local shadcn-style primitives, and
                fixture-driven replay from normalized workbench events.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="solid">Claude Route First</Button>
              <Button variant="outline">Ask-First Approvals</Button>
              <Button variant="ghost">No secrets / no raw logs</Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="panel-surface flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="panel-title">
                  {document.i18n.t("workbench.sessionSidebar.title")}
                </h2>
                <span className="muted-meta">{document.projection.sessions.length} total</span>
              </div>

              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                <label className="muted-meta block">
                  {document.i18n.t("workbench.sessionSidebar.workspaceSwitcher")}
                </label>
                <select
                  value={workspacePath}
                  onChange={(event) => setWorkspacePath(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[color:var(--border-strong)] bg-[color:var(--panel)] px-3 py-2 text-sm outline-none ring-0"
                >
                  <option value="__all__">All workspaces</option>
                  {document.projection.workspaces.map((workspace) => (
                    <option key={workspace.path} value={workspace.path}>
                      {workspace.label} ({workspace.sessionCount})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[color:var(--ink-soft)] uppercase">
                  {document.i18n.t("workbench.sessionSidebar.pinned")}
                </h3>
                <span className="muted-meta">{document.projection.pinnedSessions.length}</span>
              </div>
              <div className="space-y-2">
                {document.projection.pinnedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} active={session.id === activeSession?.id} />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[color:var(--ink-soft)] uppercase">
                  {document.i18n.t("workbench.sessionSidebar.recent")}
                </h3>
                <span className="muted-meta">{filteredSessions.length}</span>
              </div>
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <SessionCard key={session.id} session={session} active={session.id === activeSession?.id} />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[color:var(--ink-soft)] uppercase">
                {document.i18n.t("workbench.sessionSidebar.backendStatus")}
              </h3>
              <div className="space-y-2">
                {document.projection.backendStatuses.map((status) => (
                  <div key={status.backendAdapterId} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{status.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">{status.detail}</p>
                      </div>
                      <span className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold uppercase", backendTone[status.level])}>
                        {status.level}
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
                  <h2 className="panel-title">{document.i18n.t("workbench.timeline.title")}</h2>
                  <p className="text-sm text-[color:var(--ink-soft)]">
                    {activeSession?.title ?? document.i18n.t("workbench.timeline.empty")}
                  </p>
                </div>
                {activeSession ? (
                  <span
                    className={cn(
                      "rounded-md px-3 py-1 text-[10px] font-bold uppercase",
                      lifecycleTone[activeSession.lifecycle]
                    )}
                  >
                    {activeSession.lifecycle}
                  </span>
                ) : null}
              </div>

              {activeSession?.plan.length ? (
                <div className="grid gap-2 md:grid-cols-3">
                  {activeSession.plan.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-3">
                      <p className="muted-meta">{item.status}</p>
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
                        {entry.status ? <p className="muted-meta">{entry.status}</p> : null}
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
                <div className="rounded-lg border border-dashed border-[color:var(--border-strong)] bg-[color:var(--panel-muted)] p-6 text-sm text-[color:var(--ink-soft)]">
                  {document.i18n.t("workbench.timeline.empty")}
                </div>
              )}
            </div>
          </section>

          <aside className="panel-surface">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="panel-title">{document.i18n.t("workbench.inspector.title")}</h2>
              <span className="muted-meta">{document.providerSummary}</span>
            </div>

            <Tabs value={inspectorTab} onValueChange={setInspectorTab}>
              <TabsList>
                <TabsTrigger value="diff">{document.i18n.t("workbench.inspector.diff")}</TabsTrigger>
                <TabsTrigger value="terminal">{document.i18n.t("workbench.inspector.terminal")}</TabsTrigger>
                <TabsTrigger value="approvals">{document.i18n.t("workbench.inspector.approvals")}</TabsTrigger>
                <TabsTrigger value="settings">{document.i18n.t("workbench.inspector.settings")}</TabsTrigger>
                <TabsTrigger value="selection">{document.i18n.t("workbench.inspector.selection")}</TabsTrigger>
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
                  <EmptyState text="No diff events in the active session." />
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
                            {output.exitCode !== undefined ? ` · ${output.exitCode}` : ""}
                          </p>
                        </div>
                        <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-6 text-[color:var(--shell-soft)]">
                          {output.preview}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No command output projected yet." />
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
                          <Button variant={approval.status === "pending" ? "outline" : "ghost"}>
                            {approval.status}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No approval queue for the active session." />
                )}
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-3">
                  <SettingsRow
                    label={document.settingsLabels.fields.uiLanguage}
                    value={document.languageSettings.uiLanguage}
                  />
                  <SettingsRow
                    label={document.settingsLabels.fields.agentResponseLanguage}
                    value={document.languageSettings.agentResponseLanguage}
                  />
                  <SettingsRow
                    label={document.settingsLabels.fields.backend}
                    value={document.sessionDefaults.defaultBackendAdapterId}
                  />
                  <SettingsRow
                    label={document.settingsLabels.fields.providerRoute}
                    value={document.sessionDefaults.defaultProviderRouteId}
                  />
                  <SettingsRow
                    label={document.settingsLabels.fields.modelProfile}
                    value={document.sessionDefaults.defaultModelAlias}
                  />
                  <SettingsRow
                    label={document.settingsLabels.fields.routingMode}
                    value={
                      document.sessionDefaults.routingMode === "auto"
                        ? document.settingsLabels.values.autoRouting
                        : document.settingsLabels.values.manualRouting
                    }
                  />
                  <SettingsRow
                    label={document.settingsLabels.fields.approvalPolicy}
                    value={document.settingsLabels.values.approvalPolicyAskFirst}
                  />
                  <SettingsRow
                    label={document.settingsLabels.fields.persistenceBoundary}
                    value={document.settingsLabels.values.persistenceBoundaryLocalOnly}
                    detail={document.persistence.notes.join(" ")}
                  />
                </div>
              </TabsContent>

              <TabsContent value="selection">
                {activeSession?.selection ? (
                  <div className="space-y-3">
                    <SettingsRow
                      label={document.i18n.t("workbench.selection.backend")}
                      value={activeSession.selection.backendAdapter?.label ?? activeSession.selection.backendAdapterId}
                    />
                    <SettingsRow
                      label={document.i18n.t("workbench.selection.provider")}
                      value={activeSession.selection.providerRoute?.label ?? activeSession.selection.providerRouteId ?? "n/a"}
                    />
                    <SettingsRow
                      label={document.i18n.t("workbench.selection.model")}
                      value={activeSession.selection.modelProfile?.label ?? activeSession.selection.modelProfileId ?? "n/a"}
                    />
                    <SettingsRow
                      label={document.i18n.t("workbench.selection.routingMode")}
                      value={activeSession.selection.routingMode}
                    />
                    <SettingsRow
                      label={document.i18n.t("workbench.selection.uiLanguage")}
                      value={activeSession.selection.uiLanguage ?? document.languageSettings.uiLanguage}
                    />
                    <SettingsRow
                      label={document.i18n.t("workbench.selection.agentLanguage")}
                      value={
                        activeSession.selection.agentResponseLanguage ??
                        document.languageSettings.agentResponseLanguage
                      }
                    />
                    <SettingsRow
                      label={document.i18n.t("workbench.selection.warnings")}
                      value={
                        activeSession.selection.capabilityWarnings?.length
                          ? activeSession.selection.capabilityWarnings.join(" | ")
                          : `${document.bridgeCommand || "claude"} --bare -p --verbose --output-format stream-json`
                      }
                      detail={`Ignored sanitized records: ${document.ignoredRecordCount}`}
                    />
                  </div>
                ) : (
                  <EmptyState text="No selection snapshot on the active session." />
                )}
              </TabsContent>
            </Tabs>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SessionCard({
  active,
  session
}: {
  readonly active: boolean;
  readonly session: AppProps["document"]["projection"]["sessions"][number];
}) {
  return (
    <article
      className={cn(
        "rounded-lg border p-3 transition-colors",
        active
          ? "border-[color:var(--accent)] bg-[color:var(--panel)] shadow-[0_18px_38px_rgba(10,24,31,0.12)]"
          : "border-[color:var(--border)] bg-[color:var(--panel-muted)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{session.title}</p>
          <p className="text-xs leading-5 text-[color:var(--ink-soft)]">{session.workspacePath ?? "n/a"}</p>
        </div>
        <span className={cn("rounded-md px-2.5 py-1 text-[10px] font-bold uppercase", lifecycleTone[session.lifecycle])}>
          {session.lifecycle}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[color:var(--ink-soft)]">
        <div>
          <p className="muted-meta">backend</p>
          <p className="mt-1">{session.backendLabel ?? "unknown"}</p>
        </div>
        <div>
          <p className="muted-meta">approvals</p>
          <p className="mt-1">{session.pendingApprovalCount}</p>
        </div>
      </div>
    </article>
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

import { DEFAULT_UI_LANGUAGE, type SupportedUiLanguage } from "./ui-language.js";

export type UiMessageKey =
  | "settings.language.title"
  | "settings.language.uiLanguage"
  | "settings.language.agentLanguage"
  | "settings.language.saved"
  | "settings.language.systemDefault"
  | "settings.selection.title"
  | "settings.selection.backend"
  | "settings.selection.provider"
  | "settings.selection.model"
  | "settings.selection.routingMode"
  | "settings.selection.permissionMode"
  | "settings.selection.permissionMode.plan"
  | "settings.selection.permissionMode.default"
  | "settings.selection.permissionMode.acceptEdits"
  | "settings.selection.followUpPolicy"
  | "settings.selection.followUpPolicy.queue"
  | "settings.selection.followUpPolicy.steer"
  | "settings.selection.followUpPolicy.interrupt"
  | "settings.selection.composerEnterBehavior"
  | "settings.selection.composerEnterBehavior.modEnter"
  | "settings.selection.composerEnterBehavior.enter"
  | "settings.selection.reviewDelivery"
  | "settings.selection.reviewDelivery.inline"
  | "settings.selection.reviewDelivery.detached"
  | "settings.selection.approvalPolicy"
  | "settings.selection.persistence"
  | "settings.selection.approvalPolicy.askFirst"
  | "settings.selection.persistence.localOnly"
  | "workbench.sessionSidebar.title"
  | "workbench.sessionSidebar.pinned"
  | "workbench.sessionSidebar.recent"
  | "workbench.sessionSidebar.backendStatus"
  | "workbench.sessionSidebar.workspaceSwitcher"
  | "workbench.sessionSidebar.search"
  | "workbench.sessionSidebar.noSessions"
  | "workbench.sessionSidebar.workspace"
  | "workbench.sessionSidebar.backend"
  | "workbench.sessionSidebar.language"
  | "workbench.sessionSidebar.status"
  | "workbench.sessionSidebar.pendingApprovals"
  | "workbench.timeline.title"
  | "workbench.timeline.empty"
  | "workbench.timeline.windowed"
  | "workbench.timeline.showFull"
  | "workbench.timeline.showCompact"
  | "workbench.timeline.showingFull"
  | "workbench.inspector.title"
  | "workbench.inspector.diff"
  | "workbench.inspector.terminal"
  | "workbench.inspector.approvals"
  | "workbench.inspector.usage"
  | "workbench.inspector.settings"
  | "workbench.inspector.selection"
  | "workbench.timeline.kind.session"
  | "workbench.timeline.kind.adapter"
  | "workbench.timeline.kind.selection"
  | "workbench.timeline.kind.context"
  | "workbench.timeline.kind.assistant"
  | "workbench.timeline.kind.plan"
  | "workbench.timeline.kind.tool"
  | "workbench.timeline.kind.command"
  | "workbench.timeline.kind.diff"
  | "workbench.timeline.kind.usage"
  | "workbench.timeline.kind.run"
  | "workbench.timeline.kind.approval"
  | "workbench.timeline.kind.warning"
  | "workbench.timeline.kind.error"
  | "workbench.plan.title"
  | "workbench.terminal.title"
  | "workbench.diff.title"
  | "workbench.usage.title"
  | "workbench.usage.source"
  | "workbench.usage.sourceBackend"
  | "workbench.usage.sourceProvider"
  | "workbench.usage.sourceModel"
  | "workbench.usage.model"
  | "workbench.usage.input"
  | "workbench.usage.output"
  | "workbench.usage.cacheRead"
  | "workbench.usage.cacheCreate"
  | "workbench.usage.context"
  | "workbench.usage.maxOutput"
  | "workbench.usage.cost"
  | "workbench.usage.serviceTier"
  | "workbench.runAttempts.title"
  | "workbench.runAttempts.mode"
  | "workbench.runAttempts.started"
  | "workbench.runAttempts.finished"
  | "workbench.runAttempts.events"
  | "workbench.runAttempts.ignored"
  | "workbench.runAttempts.parseWarnings"
  | "workbench.runAttempts.exitCode"
  | "workbench.runAttempts.prompt"
  | "workbench.runAttempts.command"
  | "workbench.runAttempts.resume"
  | "workbench.approvals.title"
  | "workbench.approvals.requiredTitle"
  | "workbench.approvals.requiredDetail"
  | "workbench.approvals.review"
  | "workbench.approvals.riskHigh"
  | "workbench.approvals.riskMedium"
  | "workbench.approvals.riskLow"
  | "workbench.approvals.viewDiff"
  | "workbench.approvals.viewTerminal"
  | "workbench.approvals.approve"
  | "workbench.approvals.approveAndResume"
  | "workbench.approvals.reject"
  | "workbench.approvals.resolved"
  | "workbench.approvals.followUpQueued"
  | "workbench.approvals.ariaLabel"
  | "workbench.approvals.decisionApproved"
  | "workbench.approvals.decisionRejected"
  | "workbench.approvals.decisionCancelled"
  | "workbench.selection.title"
  | "workbench.selection.backend"
  | "workbench.selection.provider"
  | "workbench.selection.model"
  | "workbench.selection.routingMode"
  | "workbench.selection.uiLanguage"
  | "workbench.selection.agentLanguage"
  | "workbench.selection.externalSession"
  | "workbench.selection.warnings"
  | "workbench.selection.ignoredSanitizedRecords"
  | "workbench.selection.manual"
  | "workbench.selection.auto"
  | "workbench.language.system"
  | "workbench.shell.eyebrow"
  | "workbench.shell.title"
  | "workbench.shell.subtitle"
  | "workbench.actions.newDemoSession"
  | "workbench.actions.runClaudeSession"
  | "workbench.actions.resumeSession"
  | "workbench.actions.cancelRun"
  | "workbench.actions.settings"
  | "workbench.actions.chooseWorkspace"
  | "workbench.actions.pinSession"
  | "workbench.actions.unpinSession"
  | "workbench.actions.deleteSession"
  | "workbench.actions.showSessions"
  | "workbench.actions.hideSessions"
  | "workbench.actions.showWorkspacePanel"
  | "workbench.actions.hideWorkspacePanel"
  | "workbench.actions.openCommandMenu"
  | "workbench.session.initialTitle"
  | "workbench.session.initialPrompt"
  | "workbench.session.defaultTitle"
  | "workbench.composer.label"
  | "workbench.composer.placeholder"
  | "workbench.composer.livePlaceholder"
  | "workbench.composer.dispatch"
  | "workbench.composer.routeSettings"
  | "workbench.composer.model"
  | "workbench.composer.permission"
  | "workbench.composer.contextCount"
  | "workbench.livePlan.launch"
  | "workbench.livePlan.normalize"
  | "workbench.livePlan.inspect"
  | "workbench.liveWarning.localOnly"
  | "workbench.liveWarning.selectionLocalOnly"
  | "workbench.liveWarning.parseFailed"
  | "workbench.liveWarning.listenerFailed"
  | "workbench.runner.fixtureReady"
  | "workbench.runner.startingFixture"
  | "workbench.runner.startingClaude"
  | "workbench.runner.resumingClaude"
  | "workbench.runner.appendedEvents"
  | "workbench.runner.failed"
  | "workbench.runner.mode"
  | "workbench.runner.fixture"
  | "workbench.runner.claudeLive"
  | "workbench.runner.running"
  | "workbench.runner.cancelled"
  | "workbench.runner.cancelFailed"
  | "workbench.recovery.title"
  | "workbench.recovery.resumeDetail"
  | "workbench.recovery.checkDetail"
  | "workbench.recovery.openTerminal"
  | "workbench.recovery.openSettings"
  | "workbench.commandPalette.title"
  | "workbench.commandPalette.search"
  | "workbench.commandPalette.noResults"
  | "workbench.commandPalette.newSession"
  | "workbench.commandPalette.chooseWorkspace"
  | "workbench.commandPalette.attachWorkspaceContext"
  | "workbench.commandPalette.attachFileContext"
  | "workbench.commandPalette.showReview"
  | "workbench.commandPalette.showTerminal"
  | "workbench.commandPalette.showBrowser"
  | "workbench.commandPalette.showFiles"
  | "workbench.commandPalette.showSideChat"
  | "workbench.commandPalette.showSettings"
  | "workbench.commandPalette.toggleLeft"
  | "workbench.commandPalette.toggleRight"
  | "workbench.session.deleted"
  | "workbench.workspace.all"
  | "workbench.status.total"
  | "workbench.status.approvals"
  | "workbench.status.backend"
  | "workbench.status.unknown"
  | "workbench.status.notAvailable"
  | "workbench.workspacePanel.title"
  | "workbench.workspacePanel.backend"
  | "workbench.workspacePanel.provider"
  | "workbench.workspacePanel.review"
  | "workbench.workspacePanel.terminal"
  | "workbench.workspacePanel.browser"
  | "workbench.workspacePanel.files"
  | "workbench.workspacePanel.chat"
  | "workbench.workspacePanel.settings"
  | "workbench.workspacePanel.tools"
  | "workbench.workspacePanel.browserTitle"
  | "workbench.workspacePanel.browserDetail"
  | "workbench.browser.title"
  | "workbench.browser.detail"
  | "workbench.browser.localOnly"
  | "workbench.browser.workspace"
  | "workbench.browser.queueCheck"
  | "workbench.browser.openTerminal"
  | "workbench.browser.openFiles"
  | "workbench.browser.empty"
  | "workbench.workspacePanel.filesTitle"
  | "workbench.workspacePanel.filesDetail"
  | "workbench.workspacePanel.chatTitle"
  | "workbench.workspacePanel.chatDetail"
  | "workbench.context.title"
  | "workbench.context.composerTitle"
  | "workbench.context.empty"
  | "workbench.context.metadataOnly"
  | "workbench.context.attachWorkspace"
  | "workbench.context.attachFile"
  | "workbench.context.more"
  | "workbench.context.path"
  | "workbench.context.provenance"
  | "workbench.context.range"
  | "workbench.context.summary"
  | "workbench.context.workspaceSummary"
  | "workbench.context.fileSummary"
  | "workbench.context.attachedStatus"
  | "workbench.context.kind.workspace"
  | "workbench.context.kind.file"
  | "workbench.context.kind.selection"
  | "workbench.context.kind.note"
  | "workbench.files.evidenceTitle"
  | "workbench.files.evidenceDetail"
  | "workbench.files.attachedContext"
  | "workbench.files.changedFiles"
  | "workbench.files.privacyBoundary"
  | "workbench.files.previewTitle"
  | "workbench.files.previewDetail"
  | "workbench.files.queueFollowUp"
  | "workbench.files.rawContentBoundary"
  | "workbench.files.providerPromptBoundary"
  | "workbench.files.diffSource"
  | "workbench.files.noChangedFiles"
  | "workbench.files.noEvidence"
  | "workbench.files.redacted"
  | "workbench.files.externalReference"
  | "workbench.sideChat.title"
  | "workbench.sideChat.detail"
  | "workbench.sideChat.draftLabel"
  | "workbench.sideChat.placeholder"
  | "workbench.sideChat.queueDraft"
  | "workbench.sideChat.queuedDrafts"
  | "workbench.sideChat.empty"
  | "workbench.sideChat.removeDraft"
  | "workbench.sideChat.useInComposer"
  | "workbench.sideChat.followUpPolicy"
  | "workbench.followUp.queueReview"
  | "workbench.followUp.queueTerminal"
  | "workbench.followUp.queueRunAttempt"
  | "workbench.followUp.queueRecovery"
  | "workbench.followUp.browserDraft.title"
  | "workbench.followUp.browserDraft.workspace"
  | "workbench.followUp.browserDraft.attachedContext"
  | "workbench.followUp.browserDraft.changedFiles"
  | "workbench.followUp.browserDraft.terminalOutputs"
  | "workbench.followUp.browserDraft.instruction"
  | "workbench.settings.languageSection"
  | "workbench.settings.routingSection"
  | "workbench.settings.inputSection"
  | "workbench.settings.safetySection"
  | "workbench.empty.diff"
  | "workbench.empty.terminal"
  | "workbench.empty.approvals"
  | "workbench.empty.approvals.planMode"
  | "workbench.empty.approvals.completed"
  | "workbench.empty.usage"
  | "workbench.empty.runAttempts"
  | "workbench.empty.selection"
  | "workbench.status.created"
  | "workbench.status.resumed"
  | "workbench.status.paused"
  | "workbench.status.completed"
  | "workbench.status.started"
  | "workbench.status.ready"
  | "workbench.status.attention"
  | "workbench.status.running"
  | "workbench.status.succeeded"
  | "workbench.status.pending"
  | "workbench.status.failed"
  | "workbench.status.cancelled";

export type UiMessageCatalog = Readonly<Record<UiMessageKey, string>>;

export const uiMessages: Readonly<Record<SupportedUiLanguage, UiMessageCatalog>> = {
  en: {
    "settings.language.title": "Language",
    "settings.language.uiLanguage": "UI language",
    "settings.language.agentLanguage": "Agent response language",
    "settings.language.saved": "Language settings saved",
    "settings.language.systemDefault": "Use system language",
    "settings.selection.title": "Session defaults",
    "settings.selection.backend": "Backend",
    "settings.selection.provider": "Provider route",
    "settings.selection.model": "Model profile",
    "settings.selection.routingMode": "Routing mode",
    "settings.selection.permissionMode": "Permission mode",
    "settings.selection.permissionMode.plan": "Plan only",
    "settings.selection.permissionMode.default": "Ask before edits",
    "settings.selection.permissionMode.acceptEdits": "Auto-accept edits",
    "settings.selection.followUpPolicy": "Follow-up policy",
    "settings.selection.followUpPolicy.queue": "Queue follow-ups",
    "settings.selection.followUpPolicy.steer": "Steer current run",
    "settings.selection.followUpPolicy.interrupt": "Interrupt current run",
    "settings.selection.composerEnterBehavior": "Composer Enter behavior",
    "settings.selection.composerEnterBehavior.modEnter": "Cmd/Ctrl+Enter sends",
    "settings.selection.composerEnterBehavior.enter": "Enter sends",
    "settings.selection.reviewDelivery": "Review delivery",
    "settings.selection.reviewDelivery.inline": "Inline in thread",
    "settings.selection.reviewDelivery.detached": "Detached review session",
    "settings.selection.approvalPolicy": "Approval policy",
    "settings.selection.persistence": "Persistence boundary",
    "settings.selection.approvalPolicy.askFirst": "Ask first",
    "settings.selection.persistence.localOnly": "Tauri app-data JSON + SQLite boundary (no secrets, no raw logs)",
    "workbench.sessionSidebar.title": "Sessions",
    "workbench.sessionSidebar.pinned": "Pinned sessions",
    "workbench.sessionSidebar.recent": "Recent sessions",
    "workbench.sessionSidebar.backendStatus": "Backend status",
    "workbench.sessionSidebar.workspaceSwitcher": "Workspace switcher",
    "workbench.sessionSidebar.search": "Search sessions",
    "workbench.sessionSidebar.noSessions": "No matching sessions.",
    "workbench.sessionSidebar.workspace": "Workspace",
    "workbench.sessionSidebar.backend": "Backend",
    "workbench.sessionSidebar.language": "UI / Agent",
    "workbench.sessionSidebar.status": "Status",
    "workbench.sessionSidebar.pendingApprovals": "Pending approvals",
    "workbench.timeline.title": "Event timeline",
    "workbench.timeline.empty": "No events yet.",
    "workbench.timeline.windowed":
      "Showing {visible} of {total} events. {hidden} middle events are compacted for performance.",
    "workbench.timeline.showFull": "Show full timeline",
    "workbench.timeline.showCompact": "Keep compact",
    "workbench.timeline.showingFull": "Showing all {total} events.",
    "workbench.inspector.title": "Inspector",
    "workbench.inspector.diff": "Diff",
    "workbench.inspector.terminal": "Terminal",
    "workbench.inspector.approvals": "Approvals",
    "workbench.inspector.usage": "Usage",
    "workbench.inspector.settings": "Settings",
    "workbench.inspector.selection": "Selection",
    "workbench.timeline.kind.session": "Session",
    "workbench.timeline.kind.adapter": "Adapter",
    "workbench.timeline.kind.selection": "Selection",
    "workbench.timeline.kind.context": "Context",
    "workbench.timeline.kind.assistant": "Assistant",
    "workbench.timeline.kind.plan": "Plan",
    "workbench.timeline.kind.tool": "Tool",
    "workbench.timeline.kind.command": "Command",
    "workbench.timeline.kind.diff": "Diff",
    "workbench.timeline.kind.usage": "Usage",
    "workbench.timeline.kind.run": "Run",
    "workbench.timeline.kind.approval": "Approval",
    "workbench.timeline.kind.warning": "Warning",
    "workbench.timeline.kind.error": "Error",
    "workbench.plan.title": "Plan",
    "workbench.terminal.title": "Terminal",
    "workbench.diff.title": "Diff",
    "workbench.usage.title": "Usage reports",
    "workbench.usage.source": "Source",
    "workbench.usage.sourceBackend": "Backend",
    "workbench.usage.sourceProvider": "Provider",
    "workbench.usage.sourceModel": "Model",
    "workbench.usage.model": "Model",
    "workbench.usage.input": "Input",
    "workbench.usage.output": "Output",
    "workbench.usage.cacheRead": "Cache read",
    "workbench.usage.cacheCreate": "Cache create",
    "workbench.usage.context": "Context",
    "workbench.usage.maxOutput": "Max output",
    "workbench.usage.cost": "Cost",
    "workbench.usage.serviceTier": "Service tier",
    "workbench.runAttempts.title": "Run attempts",
    "workbench.runAttempts.mode": "Mode",
    "workbench.runAttempts.started": "Started",
    "workbench.runAttempts.finished": "Finished",
    "workbench.runAttempts.events": "Events",
    "workbench.runAttempts.ignored": "Ignored",
    "workbench.runAttempts.parseWarnings": "Parse warnings",
    "workbench.runAttempts.exitCode": "Exit",
    "workbench.runAttempts.prompt": "Prompt",
    "workbench.runAttempts.command": "Command",
    "workbench.runAttempts.resume": "Resume",
    "workbench.approvals.title": "Approvals",
    "workbench.approvals.requiredTitle": "Approval required",
    "workbench.approvals.requiredDetail": "{count} pending approval(s) are blocking this session.",
    "workbench.approvals.review": "Review",
    "workbench.approvals.riskHigh": "High risk",
    "workbench.approvals.riskMedium": "Needs review",
    "workbench.approvals.riskLow": "Low risk",
    "workbench.approvals.viewDiff": "View diff",
    "workbench.approvals.viewTerminal": "View terminal",
    "workbench.approvals.approve": "Approve",
    "workbench.approvals.approveAndResume": "Approve & resume",
    "workbench.approvals.reject": "Reject",
    "workbench.approvals.resolved": "Recorded {decision} for {title}.",
    "workbench.approvals.followUpQueued": "Recorded {decision} for {title}. Resuming Claude Code with that approved context.",
    "workbench.approvals.ariaLabel": "Approval {title}",
    "workbench.approvals.decisionApproved": "approved",
    "workbench.approvals.decisionRejected": "rejected",
    "workbench.approvals.decisionCancelled": "cancelled",
    "workbench.selection.title": "Selection snapshot",
    "workbench.selection.backend": "Backend",
    "workbench.selection.provider": "Provider route",
    "workbench.selection.model": "Model profile",
    "workbench.selection.routingMode": "Routing mode",
    "workbench.selection.uiLanguage": "UI language",
    "workbench.selection.agentLanguage": "Agent response language",
    "workbench.selection.externalSession": "External session",
    "workbench.selection.warnings": "Capability warnings",
    "workbench.selection.ignoredSanitizedRecords": "Ignored sanitized records: {count}",
    "workbench.selection.manual": "Manual",
    "workbench.selection.auto": "Auto",
    "workbench.language.system": "System",
    "workbench.shell.eyebrow": "geond-agent workbench",
    "workbench.shell.title": "Desktop workbench",
    "workbench.shell.subtitle": "Local native workbench with session selection, Claude Code runner boundaries, persisted settings, and normalized event storage.",
    "workbench.actions.newDemoSession": "New demo session",
    "workbench.actions.runClaudeSession": "Run Claude session",
    "workbench.actions.resumeSession": "Resume session",
    "workbench.actions.cancelRun": "Cancel run",
    "workbench.actions.settings": "Settings",
    "workbench.actions.chooseWorkspace": "Choose workspace",
    "workbench.actions.pinSession": "Pin session",
    "workbench.actions.unpinSession": "Unpin session",
    "workbench.actions.deleteSession": "Delete session",
    "workbench.actions.showSessions": "Show sessions",
    "workbench.actions.hideSessions": "Hide sessions",
    "workbench.actions.showWorkspacePanel": "Show workspace panel",
    "workbench.actions.hideWorkspacePanel": "Hide workspace panel",
    "workbench.actions.openCommandMenu": "Open command menu",
    "workbench.session.initialTitle": "Local workbench session",
    "workbench.session.initialPrompt": "Start a local demo session without making paid provider calls.",
    "workbench.session.defaultTitle": "Local demo session {index}",
    "workbench.composer.label": "Agent command",
    "workbench.composer.placeholder": "Review the current workspace and continue the implementation.",
    "workbench.composer.livePlaceholder": "Run a concise geond-agent workbench smoke session. Do not modify files.",
    "workbench.composer.dispatch": "Dispatch",
    "workbench.composer.routeSettings": "Route settings",
    "workbench.composer.model": "Model",
    "workbench.composer.permission": "Permission",
    "workbench.composer.contextCount": "{count} attached",
    "workbench.livePlan.launch": "Launch Claude Code stream-json runner",
    "workbench.livePlan.normalize": "Normalize stream-json records into WorkbenchEvent state",
    "workbench.livePlan.inspect": "Review terminal, diff, approvals, and warnings",
    "workbench.liveWarning.localOnly": "Live execution keeps provider credentials and raw Claude logs outside committed workbench state.",
    "workbench.liveWarning.selectionLocalOnly": "Live runner selection is a local snapshot; provider credentials are not stored in UI state.",
    "workbench.liveWarning.parseFailed": "Unable to parse Claude Code stream-json line.",
    "workbench.liveWarning.listenerFailed": "Unable to attach to Claude Code stream.",
    "workbench.runner.fixtureReady": "Fixture runner ready.",
    "workbench.runner.startingFixture": "Starting local fixture runner...",
    "workbench.runner.startingClaude": "Starting Claude Code stream-json runner...",
    "workbench.runner.resumingClaude": "Resuming Claude Code session...",
    "workbench.runner.appendedEvents": "Appended {count} events from {executable} stream-json {mode} run #{index}.",
    "workbench.runner.failed": "Runner failed.",
    "workbench.runner.mode": "Runner mode",
    "workbench.runner.fixture": "Local fixture",
    "workbench.runner.claudeLive": "Claude Code live",
    "workbench.runner.running": "Running...",
    "workbench.runner.cancelled": "Cancel requested for the live Claude run.",
    "workbench.runner.cancelFailed": "No live Claude process was available to cancel.",
    "workbench.recovery.title": "Recovery available",
    "workbench.recovery.resumeDetail": "This session has an external Claude session link. Inspect terminal output, adjust settings if needed, then resume from the saved external session.",
    "workbench.recovery.checkDetail": "This run stopped before a resumable external session was available. Inspect terminal output and settings before dispatching another run.",
    "workbench.recovery.openTerminal": "Terminal",
    "workbench.recovery.openSettings": "Settings",
    "workbench.commandPalette.title": "Command menu",
    "workbench.commandPalette.search": "Search actions",
    "workbench.commandPalette.noResults": "No matching actions.",
    "workbench.commandPalette.newSession": "Start selected runner",
    "workbench.commandPalette.chooseWorkspace": "Choose workspace",
    "workbench.commandPalette.attachWorkspaceContext": "Attach workspace context",
    "workbench.commandPalette.attachFileContext": "Attach file evidence",
    "workbench.commandPalette.showReview": "Open review inspector",
    "workbench.commandPalette.showTerminal": "Open terminal inspector",
    "workbench.commandPalette.showBrowser": "Open browser inspector",
    "workbench.commandPalette.showFiles": "Open files inspector",
    "workbench.commandPalette.showSideChat": "Open side chat inspector",
    "workbench.commandPalette.showSettings": "Open settings inspector",
    "workbench.commandPalette.toggleLeft": "Toggle session sidebar",
    "workbench.commandPalette.toggleRight": "Toggle workspace panel",
    "workbench.session.deleted": "Deleted {title}.",
    "workbench.workspace.all": "All workspaces",
    "workbench.status.total": "total",
    "workbench.status.approvals": "approvals",
    "workbench.status.backend": "backend",
    "workbench.status.unknown": "unknown",
    "workbench.status.notAvailable": "n/a",
    "workbench.workspacePanel.title": "Workspace panel",
    "workbench.workspacePanel.backend": "Backend",
    "workbench.workspacePanel.provider": "Provider",
    "workbench.workspacePanel.review": "Review",
    "workbench.workspacePanel.terminal": "Terminal",
    "workbench.workspacePanel.browser": "Browser",
    "workbench.workspacePanel.files": "Files",
    "workbench.workspacePanel.chat": "Side chat",
    "workbench.workspacePanel.settings": "Settings",
    "workbench.workspacePanel.tools": "Tools",
    "workbench.workspacePanel.browserTitle": "Browser slot",
    "workbench.workspacePanel.browserDetail": "Reserved for the Tauri webview/browser tool surface. It will stay local-only and session-scoped before live browsing is wired.",
    "workbench.browser.title": "Local browser check",
    "workbench.browser.detail": "Prepare UI validation follow-ups from the active session evidence. Live browser automation will be wired through a local Tauri command boundary later.",
    "workbench.browser.localOnly": "Local-only surface; no browser logs or private transcripts are persisted here.",
    "workbench.browser.workspace": "Workspace",
    "workbench.browser.queueCheck": "Queue browser check",
    "workbench.browser.openTerminal": "Open terminal",
    "workbench.browser.openFiles": "Open files",
    "workbench.browser.empty": "Open a session before preparing a browser validation follow-up.",
    "workbench.workspacePanel.filesTitle": "Files slot",
    "workbench.workspacePanel.filesDetail": "Reserved for workspace file context, changed files, and local evidence attachments. Raw private files are not persisted into normalized workbench events.",
    "workbench.workspacePanel.chatTitle": "Side chat slot",
    "workbench.workspacePanel.chatDetail": "Reserved for side-channel notes and follow-up prompts that should not become the primary transcript until explicitly dispatched.",
    "workbench.context.title": "Attached context",
    "workbench.context.composerTitle": "Context",
    "workbench.context.empty": "No context attachments on this session yet.",
    "workbench.context.metadataOnly": "Metadata only",
    "workbench.context.attachWorkspace": "Attach workspace",
    "workbench.context.attachFile": "Attach file",
    "workbench.context.more": "+{count} more",
    "workbench.context.path": "Path",
    "workbench.context.provenance": "Source",
    "workbench.context.range": "Range",
    "workbench.context.summary": "Summary",
    "workbench.context.workspaceSummary": "Workspace path attached as metadata only; raw file contents stay outside normalized events.",
    "workbench.context.fileSummary": "File path attached as metadata only; raw file contents stay outside normalized events.",
    "workbench.context.attachedStatus": "Attached {title} as metadata-only context.",
    "workbench.context.kind.workspace": "Workspace",
    "workbench.context.kind.file": "File",
    "workbench.context.kind.selection": "Selection",
    "workbench.context.kind.note": "Note",
    "workbench.files.evidenceTitle": "Evidence preview",
    "workbench.files.evidenceDetail": "Session-scoped file evidence assembled from metadata-only context attachments and normalized diff summaries. Raw private file contents stay outside persisted workbench events.",
    "workbench.files.attachedContext": "Attached context",
    "workbench.files.changedFiles": "Changed files",
    "workbench.files.privacyBoundary": "Privacy boundary",
    "workbench.files.previewTitle": "Evidence detail",
    "workbench.files.previewDetail": "Selected evidence can be queued as a side-chat follow-up without copying raw file content into the transcript.",
    "workbench.files.queueFollowUp": "Queue evidence follow-up",
    "workbench.files.rawContentBoundary": "Metadata and summaries only; raw private file content is not persisted here.",
    "workbench.files.providerPromptBoundary": "When you dispatch a run, selected evidence metadata such as paths, summaries, and diff stats may be included in the provider prompt. Raw private file contents are not attached.",
    "workbench.files.diffSource": "Diff source",
    "workbench.files.noChangedFiles": "No changed files projected yet.",
    "workbench.files.noEvidence": "No file evidence is available for this session yet.",
    "workbench.files.redacted": "Redacted",
    "workbench.files.externalReference": "External reference",
    "workbench.sideChat.title": "Side chat draft queue",
    "workbench.sideChat.detail": "Capture follow-up notes without adding them to the primary transcript. Move a draft into the composer only when it is ready to dispatch.",
    "workbench.sideChat.draftLabel": "Draft",
    "workbench.sideChat.placeholder": "Draft a follow-up, steering note, or review question...",
    "workbench.sideChat.queueDraft": "Queue draft",
    "workbench.sideChat.queuedDrafts": "Queued drafts",
    "workbench.sideChat.empty": "No side chat drafts queued yet.",
    "workbench.sideChat.removeDraft": "Remove",
    "workbench.sideChat.useInComposer": "Use in composer",
    "workbench.sideChat.followUpPolicy": "Follow-up policy",
    "workbench.followUp.queueReview": "Queue follow-up",
    "workbench.followUp.queueTerminal": "Queue terminal follow-up",
    "workbench.followUp.queueRunAttempt": "Queue run follow-up",
    "workbench.followUp.queueRecovery": "Queue recovery",
    "workbench.followUp.browserDraft.title": "Review browser/local validation for {title}.",
    "workbench.followUp.browserDraft.workspace": "Workspace: {workspace}.",
    "workbench.followUp.browserDraft.attachedContext": "Attached context: {count}.",
    "workbench.followUp.browserDraft.changedFiles": "Changed files: {count}.",
    "workbench.followUp.browserDraft.terminalOutputs": "Terminal outputs available: {count}.",
    "workbench.followUp.browserDraft.instruction": "Check the UI state, file evidence, terminal output, and pending approvals before dispatching a follow-up.",
    "workbench.settings.languageSection": "Language",
    "workbench.settings.routingSection": "Backend and model route",
    "workbench.settings.inputSection": "Composer and review",
    "workbench.settings.safetySection": "Safety and persistence",
    "workbench.empty.diff": "No diff events in the active session.",
    "workbench.empty.terminal": "No command output projected yet.",
    "workbench.empty.approvals": "No approval queue for the active session.",
    "workbench.empty.approvals.planMode": "Plan mode is active, so Claude Code should not request write or command approvals.",
    "workbench.empty.approvals.completed": "No unresolved approvals remain for this session.",
    "workbench.empty.usage": "No usage metadata reported yet.",
    "workbench.empty.runAttempts": "No run attempts recorded for this session yet.",
    "workbench.empty.selection": "No selection snapshot on the active session.",
    "workbench.status.created": "created",
    "workbench.status.resumed": "resumed",
    "workbench.status.paused": "paused",
    "workbench.status.completed": "completed",
    "workbench.status.started": "started",
    "workbench.status.ready": "ready",
    "workbench.status.attention": "attention",
    "workbench.status.running": "running",
    "workbench.status.succeeded": "succeeded",
    "workbench.status.pending": "pending",
    "workbench.status.failed": "failed",
    "workbench.status.cancelled": "cancelled"
  },
  ko: {
    "settings.language.title": "언어",
    "settings.language.uiLanguage": "UI 언어",
    "settings.language.agentLanguage": "에이전트 응답 언어",
    "settings.language.saved": "언어 설정이 저장되었습니다",
    "settings.language.systemDefault": "시스템 언어 사용",
    "settings.selection.title": "세션 기본값",
    "settings.selection.backend": "백엔드",
    "settings.selection.provider": "프로바이더 경로",
    "settings.selection.model": "모델 프로필",
    "settings.selection.routingMode": "라우팅 모드",
    "settings.selection.permissionMode": "권한 모드",
    "settings.selection.permissionMode.plan": "계획 전용",
    "settings.selection.permissionMode.default": "수정 전 승인",
    "settings.selection.permissionMode.acceptEdits": "수정 자동 승인",
    "settings.selection.followUpPolicy": "후속 요청 정책",
    "settings.selection.followUpPolicy.queue": "후속 요청 대기열",
    "settings.selection.followUpPolicy.steer": "현재 실행 조정",
    "settings.selection.followUpPolicy.interrupt": "현재 실행 중단",
    "settings.selection.composerEnterBehavior": "Composer Enter 동작",
    "settings.selection.composerEnterBehavior.modEnter": "Cmd/Ctrl+Enter로 실행",
    "settings.selection.composerEnterBehavior.enter": "Enter로 실행",
    "settings.selection.reviewDelivery": "검토 전달 방식",
    "settings.selection.reviewDelivery.inline": "현재 스레드 안에서 검토",
    "settings.selection.reviewDelivery.detached": "분리된 검토 세션",
    "settings.selection.approvalPolicy": "승인 정책",
    "settings.selection.persistence": "저장 경계",
    "settings.selection.approvalPolicy.askFirst": "먼저 승인 요청",
    "settings.selection.persistence.localOnly": "Tauri 앱 데이터 JSON + SQLite 경계 (비밀값/원본 로그 저장 안 함)",
    "workbench.sessionSidebar.title": "세션",
    "workbench.sessionSidebar.pinned": "고정 세션",
    "workbench.sessionSidebar.recent": "최근 세션",
    "workbench.sessionSidebar.backendStatus": "백엔드 상태",
    "workbench.sessionSidebar.workspaceSwitcher": "워크스페이스 전환",
    "workbench.sessionSidebar.search": "세션 검색",
    "workbench.sessionSidebar.noSessions": "일치하는 세션이 없습니다.",
    "workbench.sessionSidebar.workspace": "워크스페이스",
    "workbench.sessionSidebar.backend": "백엔드",
    "workbench.sessionSidebar.language": "UI / 응답 언어",
    "workbench.sessionSidebar.status": "상태",
    "workbench.sessionSidebar.pendingApprovals": "대기 중 승인",
    "workbench.timeline.title": "이벤트 타임라인",
    "workbench.timeline.empty": "아직 이벤트가 없습니다.",
    "workbench.timeline.windowed":
      "전체 {total}개 중 {visible}개 이벤트를 표시합니다. 중간 {hidden}개는 성능을 위해 접었습니다.",
    "workbench.timeline.showFull": "전체 타임라인 보기",
    "workbench.timeline.showCompact": "간결하게 보기",
    "workbench.timeline.showingFull": "전체 {total}개 이벤트를 표시 중입니다.",
    "workbench.inspector.title": "인스펙터",
    "workbench.inspector.diff": "변경 사항",
    "workbench.inspector.terminal": "터미널",
    "workbench.inspector.approvals": "승인",
    "workbench.inspector.usage": "사용량",
    "workbench.inspector.settings": "설정",
    "workbench.inspector.selection": "선택 메타데이터",
    "workbench.timeline.kind.session": "세션",
    "workbench.timeline.kind.adapter": "어댑터",
    "workbench.timeline.kind.selection": "선택",
    "workbench.timeline.kind.context": "컨텍스트",
    "workbench.timeline.kind.assistant": "어시스턴트",
    "workbench.timeline.kind.plan": "계획",
    "workbench.timeline.kind.tool": "도구",
    "workbench.timeline.kind.command": "명령",
    "workbench.timeline.kind.diff": "변경",
    "workbench.timeline.kind.usage": "사용량",
    "workbench.timeline.kind.run": "실행",
    "workbench.timeline.kind.approval": "승인",
    "workbench.timeline.kind.warning": "경고",
    "workbench.timeline.kind.error": "오류",
    "workbench.plan.title": "계획",
    "workbench.terminal.title": "터미널",
    "workbench.diff.title": "변경 사항",
    "workbench.usage.title": "사용량 보고",
    "workbench.usage.source": "출처",
    "workbench.usage.sourceBackend": "백엔드",
    "workbench.usage.sourceProvider": "프로바이더",
    "workbench.usage.sourceModel": "모델",
    "workbench.usage.model": "모델",
    "workbench.usage.input": "입력",
    "workbench.usage.output": "출력",
    "workbench.usage.cacheRead": "캐시 읽기",
    "workbench.usage.cacheCreate": "캐시 생성",
    "workbench.usage.context": "컨텍스트",
    "workbench.usage.maxOutput": "최대 출력",
    "workbench.usage.cost": "비용",
    "workbench.usage.serviceTier": "서비스 티어",
    "workbench.runAttempts.title": "실행 시도",
    "workbench.runAttempts.mode": "모드",
    "workbench.runAttempts.started": "시작",
    "workbench.runAttempts.finished": "종료",
    "workbench.runAttempts.events": "이벤트",
    "workbench.runAttempts.ignored": "무시됨",
    "workbench.runAttempts.parseWarnings": "파싱 경고",
    "workbench.runAttempts.exitCode": "종료 코드",
    "workbench.runAttempts.prompt": "프롬프트",
    "workbench.runAttempts.command": "명령",
    "workbench.runAttempts.resume": "이어쓰기",
    "workbench.approvals.title": "승인",
    "workbench.approvals.requiredTitle": "승인이 필요합니다",
    "workbench.approvals.requiredDetail": "이 세션에서 {count}개의 승인이 대기 중입니다.",
    "workbench.approvals.review": "검토",
    "workbench.approvals.riskHigh": "높은 위험",
    "workbench.approvals.riskMedium": "검토 필요",
    "workbench.approvals.riskLow": "낮은 위험",
    "workbench.approvals.viewDiff": "변경 보기",
    "workbench.approvals.viewTerminal": "터미널 보기",
    "workbench.approvals.approve": "승인",
    "workbench.approvals.approveAndResume": "승인하고 이어쓰기",
    "workbench.approvals.reject": "거절",
    "workbench.approvals.resolved": "{title}에 {decision} 결정을 기록했습니다.",
    "workbench.approvals.followUpQueued": "{title}에 {decision} 결정을 기록했습니다. 승인된 컨텍스트로 Claude Code를 이어 실행합니다.",
    "workbench.approvals.ariaLabel": "승인 {title}",
    "workbench.approvals.decisionApproved": "승인",
    "workbench.approvals.decisionRejected": "거절",
    "workbench.approvals.decisionCancelled": "취소",
    "workbench.selection.title": "선택 스냅샷",
    "workbench.selection.backend": "백엔드",
    "workbench.selection.provider": "프로바이더 경로",
    "workbench.selection.model": "모델 프로필",
    "workbench.selection.routingMode": "라우팅 모드",
    "workbench.selection.uiLanguage": "UI 언어",
    "workbench.selection.agentLanguage": "에이전트 응답 언어",
    "workbench.selection.externalSession": "외부 세션",
    "workbench.selection.warnings": "기능 경고",
    "workbench.selection.ignoredSanitizedRecords": "무시된 정제 fixture 레코드: {count}개",
    "workbench.selection.manual": "수동",
    "workbench.selection.auto": "자동",
    "workbench.language.system": "시스템",
    "workbench.shell.eyebrow": "geond-agent 워크벤치",
    "workbench.shell.title": "데스크톱 워크벤치",
    "workbench.shell.subtitle": "세션 선택, Claude Code 실행 경계, 저장되는 설정, 정규화 이벤트 저장소를 갖춘 로컬 네이티브 워크벤치입니다.",
    "workbench.actions.newDemoSession": "새 데모 세션",
    "workbench.actions.runClaudeSession": "Claude 세션 실행",
    "workbench.actions.resumeSession": "세션 이어쓰기",
    "workbench.actions.cancelRun": "실행 취소",
    "workbench.actions.settings": "설정",
    "workbench.actions.chooseWorkspace": "워크스페이스 선택",
    "workbench.actions.pinSession": "세션 고정",
    "workbench.actions.unpinSession": "고정 해제",
    "workbench.actions.deleteSession": "세션 삭제",
    "workbench.actions.showSessions": "세션 패널 열기",
    "workbench.actions.hideSessions": "세션 패널 닫기",
    "workbench.actions.showWorkspacePanel": "워크스페이스 패널 열기",
    "workbench.actions.hideWorkspacePanel": "워크스페이스 패널 닫기",
    "workbench.actions.openCommandMenu": "명령 메뉴 열기",
    "workbench.session.initialTitle": "로컬 워크벤치 세션",
    "workbench.session.initialPrompt": "유료 프로바이더 호출 없이 로컬 데모 세션을 시작합니다.",
    "workbench.session.defaultTitle": "로컬 데모 세션 {index}",
    "workbench.composer.label": "에이전트 명령",
    "workbench.composer.placeholder": "현재 워크스페이스를 검토하고 구현을 이어갑니다.",
    "workbench.composer.livePlaceholder": "간결한 geond-agent 워크벤치 smoke 세션을 실행합니다. 파일은 수정하지 않습니다.",
    "workbench.composer.dispatch": "실행",
    "workbench.composer.routeSettings": "라우트 설정",
    "workbench.composer.model": "모델",
    "workbench.composer.permission": "권한",
    "workbench.composer.contextCount": "{count}개 첨부",
    "workbench.livePlan.launch": "Claude Code stream-json runner 시작",
    "workbench.livePlan.normalize": "stream-json 레코드를 WorkbenchEvent 상태로 정규화",
    "workbench.livePlan.inspect": "터미널, 변경 사항, 승인, 경고 검토",
    "workbench.liveWarning.localOnly": "Live 실행은 프로바이더 인증 정보와 원본 Claude 로그를 커밋되는 워크벤치 상태 밖에 둡니다.",
    "workbench.liveWarning.selectionLocalOnly": "Live runner 선택은 로컬 스냅샷이며, 프로바이더 인증 정보는 UI 상태에 저장하지 않습니다.",
    "workbench.liveWarning.parseFailed": "Claude Code stream-json 라인을 파싱하지 못했습니다.",
    "workbench.liveWarning.listenerFailed": "Claude Code 스트림에 연결하지 못했습니다.",
    "workbench.runner.fixtureReady": "Fixture runner 준비됨.",
    "workbench.runner.startingFixture": "로컬 fixture runner 시작 중...",
    "workbench.runner.startingClaude": "Claude Code stream-json runner 시작 중...",
    "workbench.runner.resumingClaude": "Claude Code 세션 이어쓰기 중...",
    "workbench.runner.appendedEvents": "{executable} stream-json {mode} 실행 #{index}에서 이벤트 {count}개를 추가했습니다.",
    "workbench.runner.failed": "실행기가 실패했습니다.",
    "workbench.runner.mode": "Runner 모드",
    "workbench.runner.fixture": "로컬 fixture",
    "workbench.runner.claudeLive": "Claude Code live",
    "workbench.runner.running": "실행 중...",
    "workbench.runner.cancelled": "Live Claude 실행 취소를 요청했습니다.",
    "workbench.runner.cancelFailed": "취소할 수 있는 Live Claude 프로세스가 없습니다.",
    "workbench.recovery.title": "복구 가능",
    "workbench.recovery.resumeDetail": "이 세션에는 외부 Claude 세션 링크가 있습니다. 터미널 출력을 확인하고 필요하면 설정을 조정한 뒤 저장된 외부 세션에서 이어쓸 수 있습니다.",
    "workbench.recovery.checkDetail": "이 실행은 이어쓸 수 있는 외부 세션이 준비되기 전에 멈췄습니다. 다시 실행하기 전에 터미널 출력과 설정을 확인하세요.",
    "workbench.recovery.openTerminal": "터미널",
    "workbench.recovery.openSettings": "설정",
    "workbench.commandPalette.title": "명령 메뉴",
    "workbench.commandPalette.search": "작업 검색",
    "workbench.commandPalette.noResults": "일치하는 작업이 없습니다.",
    "workbench.commandPalette.newSession": "선택된 실행기 시작",
    "workbench.commandPalette.chooseWorkspace": "워크스페이스 선택",
    "workbench.commandPalette.attachWorkspaceContext": "워크스페이스 컨텍스트 첨부",
    "workbench.commandPalette.attachFileContext": "파일 증거 첨부",
    "workbench.commandPalette.showReview": "검토 인스펙터 열기",
    "workbench.commandPalette.showTerminal": "터미널 인스펙터 열기",
    "workbench.commandPalette.showBrowser": "브라우저 인스펙터 열기",
    "workbench.commandPalette.showFiles": "파일 인스펙터 열기",
    "workbench.commandPalette.showSideChat": "사이드 채팅 인스펙터 열기",
    "workbench.commandPalette.showSettings": "설정 인스펙터 열기",
    "workbench.commandPalette.toggleLeft": "세션 사이드바 토글",
    "workbench.commandPalette.toggleRight": "워크스페이스 패널 토글",
    "workbench.session.deleted": "{title} 세션을 삭제했습니다.",
    "workbench.workspace.all": "모든 워크스페이스",
    "workbench.status.total": "전체",
    "workbench.status.approvals": "승인",
    "workbench.status.backend": "백엔드",
    "workbench.status.unknown": "알 수 없음",
    "workbench.status.notAvailable": "해당 없음",
    "workbench.workspacePanel.title": "워크스페이스 패널",
    "workbench.workspacePanel.backend": "백엔드",
    "workbench.workspacePanel.provider": "프로바이더",
    "workbench.workspacePanel.review": "검토",
    "workbench.workspacePanel.terminal": "터미널",
    "workbench.workspacePanel.browser": "브라우저",
    "workbench.workspacePanel.files": "파일",
    "workbench.workspacePanel.chat": "사이드 채팅",
    "workbench.workspacePanel.settings": "설정",
    "workbench.workspacePanel.tools": "도구",
    "workbench.workspacePanel.browserTitle": "브라우저 슬롯",
    "workbench.workspacePanel.browserDetail": "Tauri webview/browser 도구 표면을 위한 자리입니다. 실제 연결 전까지 로컬 전용, 세션 단위 경계로 유지합니다.",
    "workbench.browser.title": "로컬 브라우저 검증",
    "workbench.browser.detail": "활성 세션의 증거를 바탕으로 UI 검증 후속 초안을 준비합니다. 실제 브라우저 자동화는 이후 로컬 Tauri command 경계로 연결합니다.",
    "workbench.browser.localOnly": "로컬 전용 표면입니다. 브라우저 로그나 private transcript는 여기에 저장하지 않습니다.",
    "workbench.browser.workspace": "워크스페이스",
    "workbench.browser.queueCheck": "브라우저 검증 초안 추가",
    "workbench.browser.openTerminal": "터미널 열기",
    "workbench.browser.openFiles": "파일 열기",
    "workbench.browser.empty": "브라우저 검증 후속 초안을 준비하려면 먼저 세션을 여세요.",
    "workbench.workspacePanel.filesTitle": "파일 슬롯",
    "workbench.workspacePanel.filesDetail": "워크스페이스 파일 컨텍스트, 변경 파일, 로컬 증거 첨부를 위한 자리입니다. 원본 private 파일은 정규화 이벤트에 저장하지 않습니다.",
    "workbench.workspacePanel.chatTitle": "사이드 채팅 슬롯",
    "workbench.workspacePanel.chatDetail": "주 transcript에 바로 섞지 않을 메모와 후속 프롬프트를 위한 자리입니다. 명시적으로 실행할 때만 주 세션에 반영합니다.",
    "workbench.context.title": "첨부된 컨텍스트",
    "workbench.context.composerTitle": "컨텍스트",
    "workbench.context.empty": "이 세션에는 아직 첨부된 컨텍스트가 없습니다.",
    "workbench.context.metadataOnly": "메타데이터만",
    "workbench.context.attachWorkspace": "워크스페이스 첨부",
    "workbench.context.attachFile": "파일 첨부",
    "workbench.context.more": "추가 {count}개",
    "workbench.context.path": "경로",
    "workbench.context.provenance": "출처",
    "workbench.context.range": "범위",
    "workbench.context.summary": "요약",
    "workbench.context.workspaceSummary": "워크스페이스 경로만 메타데이터로 첨부했습니다. 원본 파일 내용은 정규화 이벤트 밖에 둡니다.",
    "workbench.context.fileSummary": "파일 경로만 메타데이터로 첨부했습니다. 원본 파일 내용은 정규화 이벤트 밖에 둡니다.",
    "workbench.context.attachedStatus": "{title} 컨텍스트를 메타데이터 전용으로 첨부했습니다.",
    "workbench.context.kind.workspace": "워크스페이스",
    "workbench.context.kind.file": "파일",
    "workbench.context.kind.selection": "선택",
    "workbench.context.kind.note": "메모",
    "workbench.files.evidenceTitle": "증거 미리보기",
    "workbench.files.evidenceDetail": "세션 단위 파일 증거를 메타데이터 전용 컨텍스트 첨부와 정규화된 diff 요약에서 구성합니다. 원본 private 파일 내용은 저장되는 워크벤치 이벤트 밖에 둡니다.",
    "workbench.files.attachedContext": "첨부된 컨텍스트",
    "workbench.files.changedFiles": "변경 파일",
    "workbench.files.privacyBoundary": "프라이버시 경계",
    "workbench.files.previewTitle": "증거 세부 정보",
    "workbench.files.previewDetail": "선택한 증거를 원본 파일 내용 없이 사이드 채팅 후속 초안으로 보낼 수 있습니다.",
    "workbench.files.queueFollowUp": "증거 후속 초안 추가",
    "workbench.files.rawContentBoundary": "메타데이터와 요약만 사용하며, 원본 private 파일 내용은 여기에 저장하지 않습니다.",
    "workbench.files.providerPromptBoundary": "실행을 보내면 선택된 증거의 경로, 요약, diff 통계 같은 메타데이터가 provider 프롬프트에 포함될 수 있습니다. 원본 private 파일 내용은 첨부하지 않습니다.",
    "workbench.files.diffSource": "Diff 출처",
    "workbench.files.noChangedFiles": "아직 투영된 변경 파일이 없습니다.",
    "workbench.files.noEvidence": "이 세션에는 아직 파일 증거가 없습니다.",
    "workbench.files.redacted": "가림 처리됨",
    "workbench.files.externalReference": "외부 참조",
    "workbench.sideChat.title": "사이드 채팅 초안 큐",
    "workbench.sideChat.detail": "주 transcript에 바로 넣지 않을 후속 메모를 모아둡니다. 실행할 준비가 되었을 때만 초안을 composer로 옮깁니다.",
    "workbench.sideChat.draftLabel": "초안",
    "workbench.sideChat.placeholder": "후속 지시, 방향 조정 메모, 검토 질문을 작성하세요...",
    "workbench.sideChat.queueDraft": "초안 큐에 추가",
    "workbench.sideChat.queuedDrafts": "대기 중인 초안",
    "workbench.sideChat.empty": "아직 대기 중인 사이드 채팅 초안이 없습니다.",
    "workbench.sideChat.removeDraft": "제거",
    "workbench.sideChat.useInComposer": "Composer로 옮기기",
    "workbench.sideChat.followUpPolicy": "후속 요청 정책",
    "workbench.followUp.queueReview": "후속 초안 추가",
    "workbench.followUp.queueTerminal": "터미널 후속 초안 추가",
    "workbench.followUp.queueRunAttempt": "실행 후속 초안 추가",
    "workbench.followUp.queueRecovery": "복구 초안 추가",
    "workbench.followUp.browserDraft.title": "{title}의 브라우저/로컬 검증을 검토하세요.",
    "workbench.followUp.browserDraft.workspace": "워크스페이스: {workspace}.",
    "workbench.followUp.browserDraft.attachedContext": "첨부된 컨텍스트: {count}개.",
    "workbench.followUp.browserDraft.changedFiles": "변경 파일: {count}개.",
    "workbench.followUp.browserDraft.terminalOutputs": "사용 가능한 터미널 출력: {count}개.",
    "workbench.followUp.browserDraft.instruction": "후속 요청을 실행하기 전에 UI 상태, 파일 증거, 터미널 출력, 대기 중인 승인을 확인하세요.",
    "workbench.settings.languageSection": "언어",
    "workbench.settings.routingSection": "백엔드와 모델 라우트",
    "workbench.settings.inputSection": "입력과 검토",
    "workbench.settings.safetySection": "안전과 저장",
    "workbench.empty.diff": "활성 세션에 변경 이벤트가 없습니다.",
    "workbench.empty.terminal": "아직 표시할 명령 출력이 없습니다.",
    "workbench.empty.approvals": "활성 세션의 승인 대기열이 없습니다.",
    "workbench.empty.approvals.planMode": "계획 모드가 활성화되어 Claude Code가 쓰기나 명령 승인을 요청하지 않아야 합니다.",
    "workbench.empty.approvals.completed": "이 세션에 남은 미해결 승인이 없습니다.",
    "workbench.empty.usage": "아직 보고된 사용량 메타데이터가 없습니다.",
    "workbench.empty.runAttempts": "이 세션에는 아직 기록된 실행 시도가 없습니다.",
    "workbench.empty.selection": "활성 세션에 선택 스냅샷이 없습니다.",
    "workbench.status.created": "생성됨",
    "workbench.status.resumed": "재개됨",
    "workbench.status.paused": "일시 중지",
    "workbench.status.completed": "완료",
    "workbench.status.started": "시작됨",
    "workbench.status.ready": "준비됨",
    "workbench.status.attention": "주의 필요",
    "workbench.status.running": "실행 중",
    "workbench.status.succeeded": "성공",
    "workbench.status.pending": "대기",
    "workbench.status.failed": "실패",
    "workbench.status.cancelled": "취소됨"
  }
};

export function translateUiMessage(
  language: SupportedUiLanguage,
  key: UiMessageKey
): string {
  return uiMessages[language]?.[key] ?? uiMessages[DEFAULT_UI_LANGUAGE][key];
}

export interface UiI18n {
  readonly language: SupportedUiLanguage;
  readonly t: (key: UiMessageKey) => string;
}

export function createUiI18n(language: SupportedUiLanguage): UiI18n {
  return {
    language,
    t: (key) => translateUiMessage(language, key)
  };
}

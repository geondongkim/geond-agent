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
  | "settings.selection.approvalPolicy"
  | "settings.selection.persistence"
  | "settings.selection.approvalPolicy.askFirst"
  | "settings.selection.persistence.localOnly"
  | "workbench.sessionSidebar.title"
  | "workbench.sessionSidebar.pinned"
  | "workbench.sessionSidebar.recent"
  | "workbench.sessionSidebar.backendStatus"
  | "workbench.sessionSidebar.workspaceSwitcher"
  | "workbench.sessionSidebar.workspace"
  | "workbench.sessionSidebar.backend"
  | "workbench.sessionSidebar.language"
  | "workbench.sessionSidebar.status"
  | "workbench.sessionSidebar.pendingApprovals"
  | "workbench.timeline.title"
  | "workbench.timeline.empty"
  | "workbench.inspector.title"
  | "workbench.inspector.diff"
  | "workbench.inspector.terminal"
  | "workbench.inspector.approvals"
  | "workbench.inspector.settings"
  | "workbench.inspector.selection"
  | "workbench.plan.title"
  | "workbench.terminal.title"
  | "workbench.diff.title"
  | "workbench.approvals.title"
  | "workbench.approvals.requiredTitle"
  | "workbench.approvals.requiredDetail"
  | "workbench.approvals.review"
  | "workbench.approvals.approve"
  | "workbench.approvals.reject"
  | "workbench.approvals.resolved"
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
  | "workbench.actions.settings"
  | "workbench.actions.chooseWorkspace"
  | "workbench.actions.pinSession"
  | "workbench.actions.unpinSession"
  | "workbench.composer.label"
  | "workbench.composer.placeholder"
  | "workbench.composer.livePlaceholder"
  | "workbench.composer.dispatch"
  | "workbench.livePlan.launch"
  | "workbench.livePlan.normalize"
  | "workbench.livePlan.inspect"
  | "workbench.liveWarning.localOnly"
  | "workbench.liveWarning.selectionLocalOnly"
  | "workbench.liveWarning.parseFailed"
  | "workbench.runner.fixtureReady"
  | "workbench.runner.startingFixture"
  | "workbench.runner.startingClaude"
  | "workbench.runner.appendedEvents"
  | "workbench.runner.failed"
  | "workbench.runner.mode"
  | "workbench.runner.fixture"
  | "workbench.runner.claudeLive"
  | "workbench.runner.running"
  | "workbench.workspace.all"
  | "workbench.status.total"
  | "workbench.status.approvals"
  | "workbench.status.backend"
  | "workbench.status.unknown"
  | "workbench.empty.diff"
  | "workbench.empty.terminal"
  | "workbench.empty.approvals"
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
  | "workbench.status.failed";

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
    "settings.selection.approvalPolicy": "Approval policy",
    "settings.selection.persistence": "Persistence boundary",
    "settings.selection.approvalPolicy.askFirst": "Ask first",
    "settings.selection.persistence.localOnly": "Tauri app-data JSON + SQLite boundary (no secrets, no raw logs)",
    "workbench.sessionSidebar.title": "Sessions",
    "workbench.sessionSidebar.pinned": "Pinned sessions",
    "workbench.sessionSidebar.recent": "Recent sessions",
    "workbench.sessionSidebar.backendStatus": "Backend status",
    "workbench.sessionSidebar.workspaceSwitcher": "Workspace switcher",
    "workbench.sessionSidebar.workspace": "Workspace",
    "workbench.sessionSidebar.backend": "Backend",
    "workbench.sessionSidebar.language": "UI / Agent",
    "workbench.sessionSidebar.status": "Status",
    "workbench.sessionSidebar.pendingApprovals": "Pending approvals",
    "workbench.timeline.title": "Event timeline",
    "workbench.timeline.empty": "No events yet.",
    "workbench.inspector.title": "Inspector",
    "workbench.inspector.diff": "Diff",
    "workbench.inspector.terminal": "Terminal",
    "workbench.inspector.approvals": "Approvals",
    "workbench.inspector.settings": "Settings",
    "workbench.inspector.selection": "Selection",
    "workbench.plan.title": "Plan",
    "workbench.terminal.title": "Terminal",
    "workbench.diff.title": "Diff",
    "workbench.approvals.title": "Approvals",
    "workbench.approvals.requiredTitle": "Approval required",
    "workbench.approvals.requiredDetail": "{count} pending approval(s) are blocking this session.",
    "workbench.approvals.review": "Review",
    "workbench.approvals.approve": "Approve",
    "workbench.approvals.reject": "Reject",
    "workbench.approvals.resolved": "Recorded {decision} for {title}.",
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
    "workbench.actions.settings": "Settings",
    "workbench.actions.chooseWorkspace": "Choose workspace",
    "workbench.actions.pinSession": "Pin session",
    "workbench.actions.unpinSession": "Unpin session",
    "workbench.composer.label": "Agent command",
    "workbench.composer.placeholder": "Review the current workspace and continue the implementation.",
    "workbench.composer.livePlaceholder": "Run a concise geond-agent workbench smoke session. Do not modify files.",
    "workbench.composer.dispatch": "Dispatch",
    "workbench.livePlan.launch": "Launch Claude Code stream-json runner",
    "workbench.livePlan.normalize": "Normalize stream-json records into WorkbenchEvent state",
    "workbench.livePlan.inspect": "Review terminal, diff, approvals, and warnings",
    "workbench.liveWarning.localOnly": "Live execution keeps provider credentials and raw Claude logs outside committed workbench state.",
    "workbench.liveWarning.selectionLocalOnly": "Live runner selection is a local snapshot; provider credentials are not stored in UI state.",
    "workbench.liveWarning.parseFailed": "Unable to parse Claude Code stream-json line.",
    "workbench.runner.fixtureReady": "Fixture runner ready.",
    "workbench.runner.startingFixture": "Starting local fixture runner...",
    "workbench.runner.startingClaude": "Starting Claude Code stream-json runner...",
    "workbench.runner.appendedEvents": "Appended {count} events from {executable} stream-json {mode} run #{index}.",
    "workbench.runner.failed": "Runner failed.",
    "workbench.runner.mode": "Runner mode",
    "workbench.runner.fixture": "Local fixture",
    "workbench.runner.claudeLive": "Claude Code live",
    "workbench.runner.running": "Running...",
    "workbench.workspace.all": "All workspaces",
    "workbench.status.total": "total",
    "workbench.status.approvals": "approvals",
    "workbench.status.backend": "backend",
    "workbench.status.unknown": "unknown",
    "workbench.empty.diff": "No diff events in the active session.",
    "workbench.empty.terminal": "No command output projected yet.",
    "workbench.empty.approvals": "No approval queue for the active session.",
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
    "workbench.status.failed": "failed"
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
    "settings.selection.approvalPolicy": "승인 정책",
    "settings.selection.persistence": "저장 경계",
    "settings.selection.approvalPolicy.askFirst": "먼저 승인 요청",
    "settings.selection.persistence.localOnly": "Tauri 앱 데이터 JSON + SQLite 경계 (비밀값/원본 로그 저장 안 함)",
    "workbench.sessionSidebar.title": "세션",
    "workbench.sessionSidebar.pinned": "고정 세션",
    "workbench.sessionSidebar.recent": "최근 세션",
    "workbench.sessionSidebar.backendStatus": "백엔드 상태",
    "workbench.sessionSidebar.workspaceSwitcher": "워크스페이스 전환",
    "workbench.sessionSidebar.workspace": "워크스페이스",
    "workbench.sessionSidebar.backend": "백엔드",
    "workbench.sessionSidebar.language": "UI / 응답 언어",
    "workbench.sessionSidebar.status": "상태",
    "workbench.sessionSidebar.pendingApprovals": "대기 중 승인",
    "workbench.timeline.title": "이벤트 타임라인",
    "workbench.timeline.empty": "아직 이벤트가 없습니다.",
    "workbench.inspector.title": "인스펙터",
    "workbench.inspector.diff": "변경 사항",
    "workbench.inspector.terminal": "터미널",
    "workbench.inspector.approvals": "승인",
    "workbench.inspector.settings": "설정",
    "workbench.inspector.selection": "선택 메타데이터",
    "workbench.plan.title": "계획",
    "workbench.terminal.title": "터미널",
    "workbench.diff.title": "변경 사항",
    "workbench.approvals.title": "승인",
    "workbench.approvals.requiredTitle": "승인이 필요합니다",
    "workbench.approvals.requiredDetail": "이 세션에서 {count}개의 승인이 대기 중입니다.",
    "workbench.approvals.review": "검토",
    "workbench.approvals.approve": "승인",
    "workbench.approvals.reject": "거절",
    "workbench.approvals.resolved": "{title}에 {decision} 결정을 기록했습니다.",
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
    "workbench.actions.settings": "설정",
    "workbench.actions.chooseWorkspace": "워크스페이스 선택",
    "workbench.actions.pinSession": "세션 고정",
    "workbench.actions.unpinSession": "고정 해제",
    "workbench.composer.label": "에이전트 명령",
    "workbench.composer.placeholder": "현재 워크스페이스를 검토하고 구현을 이어갑니다.",
    "workbench.composer.livePlaceholder": "간결한 geond-agent 워크벤치 smoke 세션을 실행합니다. 파일은 수정하지 않습니다.",
    "workbench.composer.dispatch": "실행",
    "workbench.livePlan.launch": "Claude Code stream-json runner 시작",
    "workbench.livePlan.normalize": "stream-json 레코드를 WorkbenchEvent 상태로 정규화",
    "workbench.livePlan.inspect": "터미널, 변경 사항, 승인, 경고 검토",
    "workbench.liveWarning.localOnly": "Live 실행은 프로바이더 인증 정보와 원본 Claude 로그를 커밋되는 워크벤치 상태 밖에 둡니다.",
    "workbench.liveWarning.selectionLocalOnly": "Live runner 선택은 로컬 스냅샷이며, 프로바이더 인증 정보는 UI 상태에 저장하지 않습니다.",
    "workbench.liveWarning.parseFailed": "Claude Code stream-json 라인을 파싱하지 못했습니다.",
    "workbench.runner.fixtureReady": "Fixture runner 준비됨.",
    "workbench.runner.startingFixture": "로컬 fixture runner 시작 중...",
    "workbench.runner.startingClaude": "Claude Code stream-json runner 시작 중...",
    "workbench.runner.appendedEvents": "{executable} stream-json {mode} 실행 #{index}에서 이벤트 {count}개를 추가했습니다.",
    "workbench.runner.failed": "실행기가 실패했습니다.",
    "workbench.runner.mode": "Runner 모드",
    "workbench.runner.fixture": "로컬 fixture",
    "workbench.runner.claudeLive": "Claude Code live",
    "workbench.runner.running": "실행 중...",
    "workbench.workspace.all": "모든 워크스페이스",
    "workbench.status.total": "전체",
    "workbench.status.approvals": "승인",
    "workbench.status.backend": "백엔드",
    "workbench.status.unknown": "알 수 없음",
    "workbench.empty.diff": "활성 세션에 변경 이벤트가 없습니다.",
    "workbench.empty.terminal": "아직 표시할 명령 출력이 없습니다.",
    "workbench.empty.approvals": "활성 세션의 승인 대기열이 없습니다.",
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
    "workbench.status.failed": "실패"
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

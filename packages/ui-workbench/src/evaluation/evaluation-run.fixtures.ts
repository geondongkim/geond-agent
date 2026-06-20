import {
  EVALUATION_ACCEPTANCE_VALUES,
  EVALUATION_SCORE_AREA_LABELS,
  EVALUATION_SCORE_AREAS,
  EVALUATION_TASK_STATUSES,
  EVALUATION_TOOL_NAMES,
  averageScorecard,
  isCompleteScorecard,
  isEvaluationTaskStatus,
  isEvaluationToolName,
  isValidEvaluationScore,
  verifyScoreAreaLabelsAreComplete
} from "./evaluation-run.js";
import type {
  EvaluationAcceptance,
  EvaluationRun,
  EvaluationScore,
  EvaluationScoreArea,
  EvaluationScorecard,
  EvaluationTaskStatus,
  EvaluationToolName
} from "./evaluation-run.js";

type AssertEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2)
    ? true
    : false;

const _supportsRequiredEvaluationTools: AssertEqual<
  EvaluationToolName,
  "claude-code" | "cline" | "opencode"
> = true;
void _supportsRequiredEvaluationTools;

const _supportsRequiredRunStatuses: AssertEqual<
  EvaluationTaskStatus,
  "queued" | "running" | "passed" | "failed" | "inconclusive"
> = true;
void _supportsRequiredRunStatuses;

const _scoreAreasMatchScorecard: AssertEqual<
  EvaluationScoreArea,
  | "repo-understanding"
  | "edit-quality"
  | "verification"
  | "recovery"
  | "cost-value"
  | "workflow-fit"
> = true;
void _scoreAreasMatchScorecard;

const _scoreKeysMatchAreas: AssertEqual<keyof EvaluationScorecard, EvaluationScoreArea> =
  true;
void _scoreKeysMatchAreas;

const _scoreScaleMatchesScorecard: AssertEqual<EvaluationScore, 1 | 2 | 3 | 4 | 5> =
  true;
void _scoreScaleMatchesScorecard;

const _labelsCoverEveryArea: AssertEqual<
  keyof typeof EVALUATION_SCORE_AREA_LABELS,
  EvaluationScoreArea
> = true;
void _labelsCoverEveryArea;

const _acceptanceIsDecisionScoped: AssertEqual<
  EvaluationAcceptance,
  "yes" | "no" | "maybe"
> = true;
void _acceptanceIsDecisionScoped;

export const CLAUDE_CODE_TASK4_SAMPLE_SCORECARD: EvaluationScorecard = {
  "repo-understanding": {
    score: 5,
    notes: "Found the scorecard and package boundaries quickly."
  },
  "edit-quality": {
    score: 4,
    notes: "Useful model shape, with review needed around public API breadth."
  },
  verification: {
    score: 5,
    notes: "Recorded the expected repo verification commands."
  },
  recovery: {
    score: 4,
    notes: "Recovered cleanly from baseline differences."
  },
  "cost-value": {
    score: 3,
    notes: "Good output, but small tasks may use a higher Z.ai model route."
  },
  "workflow-fit": {
    score: 5,
    notes: "Strong fit for Claude Code adapter and event work."
  }
};

export const CLAUDE_CODE_TASK4_SAMPLE_EVALUATION_RUN: EvaluationRun = {
  tool: "claude-code",
  taskId: "task-4",
  title: "Feature Slice - Evaluation Run Model",
  status: "passed",
  modelOrRoute: "opus alias through Z.ai Anthropic-compatible route",
  branchOrWorktree: "codex/eval-claude-code-task4",
  startedAt: "2026-06-21T00:00:00.000Z",
  finishedAt: "2026-06-21T00:30:00.000Z",
  accepted: "yes",
  verificationCommands: [
    "git diff --check",
    "pnpm verify"
  ],
  scores: CLAUDE_CODE_TASK4_SAMPLE_SCORECARD,
  notes: [
    "Fixture records evaluation metadata only.",
    "No provider key, token, local session state, or raw Claude Code log is stored."
  ]
};

export const ACCEPTED_ZAI_EVALUATION_RUN_FIXTURES: readonly EvaluationRun[] = [
  CLAUDE_CODE_TASK4_SAMPLE_EVALUATION_RUN,
  {
    tool: "opencode",
    taskId: "task-3",
    title: "Bug Fix - Bridge Env Redaction Coverage",
    status: "passed",
    modelOrRoute: "Z.ai OpenAI-compatible route",
    branchOrWorktree: "codex/eval-opencode-task3",
    accepted: "yes",
    verificationCommands: ["pnpm verify"],
    scores: {
      "repo-understanding": { score: 4 },
      "edit-quality": { score: 3 },
      verification: { score: 4 },
      recovery: { score: 4 },
      "cost-value": { score: 3 },
      "workflow-fit": { score: 4 }
    },
    notes: ["See docs/plans/zai-evaluation-run-opencode-task3.md."]
  },
  {
    tool: "cline",
    taskId: "task-2",
    title: "Bug Fix - Z.ai Config Empty String Handling",
    status: "passed",
    modelOrRoute: "Z.ai OpenAI-compatible route",
    branchOrWorktree: "codex/eval-cline-task2",
    accepted: "yes",
    verificationCommands: ["pnpm verify"],
    scores: {
      "repo-understanding": { score: 4 },
      "edit-quality": { score: 4 },
      verification: { score: 5 },
      recovery: { score: 4 },
      "cost-value": { score: 3 },
      "workflow-fit": { score: 3 }
    },
    notes: ["See docs/plans/zai-evaluation-run-cline-task2.md."]
  }
];

export function verifyEvaluationFixtureToolGuards(): void {
  for (const tool of EVALUATION_TOOL_NAMES) {
    if (!isEvaluationToolName(tool)) {
      throw new Error(`Evaluation tool guard rejected a known tool: ${tool}`);
    }
  }
}

export function verifyEvaluationFixtureStatusGuards(): void {
  for (const status of EVALUATION_TASK_STATUSES) {
    if (!isEvaluationTaskStatus(status)) {
      throw new Error(`Run status guard rejected a required status: ${status}`);
    }
  }
}

export function verifyEvaluationFixtureScoreGuards(): void {
  const scale: readonly EvaluationScore[] = [1, 2, 3, 4, 5];
  for (const score of scale) {
    if (!isValidEvaluationScore(score)) {
      throw new Error(`Score guard rejected a scorecard value: ${score}`);
    }
  }
}

export function verifyEvaluationFixtureAverageScore(): void {
  const average = averageScorecard(CLAUDE_CODE_TASK4_SAMPLE_SCORECARD);
  if (!(average >= 1 && average <= 5)) {
    throw new Error(`Sample average score left the scorecard range: ${average}`);
  }
}

export function verifyEvaluationFixtureAreaLabels(): void {
  verifyScoreAreaLabelsAreComplete();
  for (const area of EVALUATION_SCORE_AREAS) {
    const label = EVALUATION_SCORE_AREA_LABELS[area];
    if (label.length === 0) {
      throw new Error(`Empty scorecard label for evaluation score area: ${area}`);
    }
  }
}

export function verifyEvaluationFixtureScorecardCompleteness(): void {
  for (const run of ACCEPTED_ZAI_EVALUATION_RUN_FIXTURES) {
    if (run.scores && !isCompleteScorecard(run.scores)) {
      throw new Error(`Sample scorecard is incomplete for task: ${run.taskId}`);
    }
  }
}

export function verifyEvaluationFixtureAcceptanceValues(): void {
  for (const acceptance of EVALUATION_ACCEPTANCE_VALUES) {
    const scoped: EvaluationAcceptance = acceptance;
    if (scoped !== acceptance) {
      throw new Error(`Unexpected acceptance fixture value: ${acceptance}`);
    }
  }
}

export function verifyEvaluationRunFixtures(): void {
  verifyEvaluationFixtureToolGuards();
  verifyEvaluationFixtureStatusGuards();
  verifyEvaluationFixtureScoreGuards();
  verifyEvaluationFixtureAverageScore();
  verifyEvaluationFixtureAreaLabels();
  verifyEvaluationFixtureScorecardCompleteness();
  verifyEvaluationFixtureAcceptanceValues();
}

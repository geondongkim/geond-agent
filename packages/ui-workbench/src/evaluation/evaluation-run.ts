// Evaluation run model for the Z.ai evaluation task queue.
//
// This module is intentionally framework-neutral and storage-neutral. It models
// the data described in `docs/plans/zai-evaluation-task-queue.md` (Recording
// Rules) and `docs/plans/zai-evaluation-scorecard.md` (Task Metadata and
// Scorecard). It does not open a database, render UI, call a provider, or store
// secrets/tokens/account state. A run is a plain, immutable value object.

/**
 * Evaluation tools supported by the task queue. These are the same tools listed
 * in the scorecard's Task Metadata table.
 */
export type EvaluationToolName = "claude-code" | "cline" | "opencode";

/**
 * Lifecycle status of an evaluation task. Mirrors the states the queue expects:
 * not started yet, in progress, finished with a clear pass/fail, or finished
 * without a clear verdict.
 */
export type EvaluationTaskStatus =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "inconclusive";

/**
 * Human review verdict recorded after a run, matching the scorecard's
 * "Accepted for normal work? Yes / No / Maybe" field.
 */
export type EvaluationAcceptance = "yes" | "no" | "maybe";

/**
 * 1-5 score from the scorecard's Scoring Scale table. 1 is the worst, 5 is the
 * best. Use {@link isValidEvaluationScore} to validate untrusted input.
 */
export type EvaluationScore = 1 | 2 | 3 | 4 | 5;

/**
 * Scorecard areas. These are the exact categories from the scorecard table:
 *
 * | Area label (scorecard) | Area id (this model) |
 * | --- | --- |
 * | Repo understanding | `repo-understanding` |
 * | Edit quality | `edit-quality` |
 * | Verification | `verification` |
 * | Recovery | `recovery` |
 * | Cost/value | `cost-value` |
 * | Workflow fit | `workflow-fit` |
 */
export type EvaluationScoreArea =
  | "repo-understanding"
  | "edit-quality"
  | "verification"
  | "recovery"
  | "cost-value"
  | "workflow-fit";

/** Ordered list of every scorecard area. Useful for iteration and validation. */
export const EVALUATION_SCORE_AREAS: readonly EvaluationScoreArea[] = [
  "repo-understanding",
  "edit-quality",
  "verification",
  "recovery",
  "cost-value",
  "workflow-fit"
];

/** Display labels for each scorecard area. */
export const EVALUATION_SCORE_AREA_LABELS: Readonly<
  Record<EvaluationScoreArea, string>
> = {
  "repo-understanding": "Repo understanding",
  "edit-quality": "Edit quality",
  verification: "Verification",
  recovery: "Recovery",
  "cost-value": "Cost/value",
  "workflow-fit": "Workflow fit"
};

/** Ordered list of every supported evaluation tool. */
export const EVALUATION_TOOL_NAMES: readonly EvaluationToolName[] = [
  "claude-code",
  "cline",
  "opencode"
];

/** Display labels for supported evaluation tools. */
export const EVALUATION_TOOL_LABELS: Readonly<Record<EvaluationToolName, string>> = {
  "claude-code": "Claude Code",
  cline: "Cline",
  opencode: "OpenCode"
};

/** Ordered list of every supported task status. */
export const EVALUATION_TASK_STATUSES: readonly EvaluationTaskStatus[] = [
  "queued",
  "running",
  "passed",
  "failed",
  "inconclusive"
];

/** Ordered list of every supported acceptance verdict. */
export const EVALUATION_ACCEPTANCE_VALUES: readonly EvaluationAcceptance[] = [
  "yes",
  "no",
  "maybe"
];

/**
 * A single area score row in the scorecard. Maps directly to one row of the
 * scorecard table (Area, Score, Notes).
 */
export interface EvaluationAreaScore {
  /** 1-5 value from the scorecard scale. */
  readonly score: EvaluationScore;
  /** Free-form reviewer notes for this area. */
  readonly notes?: string;
}

/**
 * Full scorecard. It is a record keyed by {@link EvaluationScoreArea}, so every
 * scorecard category must be present. This guarantees the model matches the six
 * scorecard categories exactly.
 */
export type EvaluationScorecard = Readonly<
  Record<EvaluationScoreArea, EvaluationAreaScore>
>;

/**
 * A single evaluation run. This is the central value object tracked by the
 * evaluation queue. Every field maps to either a Task Metadata field, a
 * scorecard field, or a Recording Rule in the task-queue plan.
 */
export interface EvaluationRun {
  /** Stable identifier such as "task-4". */
  readonly taskId: string;
  /** Which tool performed the run. */
  readonly tool: EvaluationToolName;
  /** Lifecycle status of the run. */
  readonly status: EvaluationTaskStatus;
  /** Optional human-readable title from the task queue. */
  readonly title?: string;
  /** Model alias or provider route used, e.g. "glm-4.7". */
  readonly modelOrRoute?: string;
  /** Branch or worktree where the run happened. */
  readonly branchOrWorktree?: string;
  /**
   * Verification commands that were run, e.g. `["pnpm lint", "pnpm test",
   * "pnpm build"]`. Pure command strings; no env, secrets, or output are
   * stored here.
   */
  readonly verificationCommands: readonly string[];
  /** Completed scorecard, present once the run has been reviewed. */
  readonly scores?: EvaluationScorecard;
  /** Reviewer's accept-for-normal-work verdict. */
  readonly accepted?: EvaluationAcceptance;
  /** Free-form reviewer notes for the whole run. */
  readonly notes?: readonly string[];
  /** ISO timestamp marking when the run started. */
  readonly startedAt?: string;
  /** ISO timestamp marking when the run finished. */
  readonly finishedAt?: string;
}

/**
 * Returns true when `value` is a valid 1-5 score. Useful for normalizing
 * untrusted input before constructing an {@link EvaluationAreaScore}.
 */
export function isValidEvaluationScore(value: unknown): value is EvaluationScore {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/**
 * Clamps an arbitrary number into the 1-5 score range. Out-of-range values are
 * pulled back to the nearest valid score instead of being dropped.
 */
export function normalizeEvaluationScore(value: number): EvaluationScore {
  if (!Number.isFinite(value)) {
    return 1;
  }
  const rounded = Math.round(value);
  if (rounded <= 1) {
    return 1;
  }
  if (rounded >= 5) {
    return 5;
  }
  return rounded as EvaluationScore;
}

/** Returns true when `value` is a known {@link EvaluationToolName}. */
export function isEvaluationToolName(value: unknown): value is EvaluationToolName {
  return (
    value === "claude-code" || value === "cline" || value === "opencode"
  );
}

/** Returns true when `value` is a known {@link EvaluationTaskStatus}. */
export function isEvaluationTaskStatus(value: unknown): value is EvaluationTaskStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "passed" ||
    value === "failed" ||
    value === "inconclusive"
  );
}

/**
 * Creates a scorecard where every area has the same explicit score. Omit
 * `scores` on an {@link EvaluationRun} until a run has actually been reviewed.
 */
export function createUniformScorecard(score: EvaluationScore): EvaluationScorecard {
  return {
    "repo-understanding": { score },
    "edit-quality": { score },
    verification: { score },
    recovery: { score },
    "cost-value": { score },
    "workflow-fit": { score }
  };
}

/**
 * Type guard that confirms a scorecard object has a valid entry for every
 * {@link EvaluationScoreArea}.
 */
export function isCompleteScorecard(value: unknown): value is EvaluationScorecard {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return EVALUATION_SCORE_AREAS.every((area) => {
    const entry = record[area];
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    return isValidEvaluationScore((entry as { score: unknown }).score);
  });
}

/** Returns the ordered score values aligned with {@link EVALUATION_SCORE_AREAS}. */
export function scorecardValues(scorecard: EvaluationScorecard): readonly EvaluationScore[] {
  return EVALUATION_SCORE_AREAS.map((area) => scorecard[area].score);
}

/** Average of the six scorecard categories. */
export function averageScorecard(scorecard: EvaluationScorecard): number {
  const values = scorecardValues(scorecard);
  const total = values.reduce((sum, score) => sum + score, 0);
  return total / values.length;
}

/** Runtime guard that every score area has a non-empty display label. */
export function verifyScoreAreaLabelsAreComplete(): void {
  for (const area of EVALUATION_SCORE_AREAS) {
    const label = EVALUATION_SCORE_AREA_LABELS[area];
    if (!label) {
      throw new Error(`Missing scorecard label for evaluation score area: ${area}`);
    }
  }
}

/**
 * Factory for a new {@link EvaluationRun}. Only the identity fields are
 * mandatory; everything else is optional and defaults to an empty/queued shape.
 */
export function createEvaluationRun(input: {
  readonly taskId: string;
  readonly tool: EvaluationToolName;
  readonly status?: EvaluationTaskStatus;
  readonly title?: string;
  readonly modelOrRoute?: string;
  readonly branchOrWorktree?: string;
  readonly verificationCommands?: readonly string[];
  readonly scores?: EvaluationScorecard;
  readonly accepted?: EvaluationAcceptance;
  readonly notes?: readonly string[];
  readonly startedAt?: string;
  readonly finishedAt?: string;
}): EvaluationRun {
  return {
    taskId: input.taskId,
    tool: input.tool,
    status: input.status ?? "queued",
    title: input.title,
    modelOrRoute: input.modelOrRoute,
    branchOrWorktree: input.branchOrWorktree,
    verificationCommands: input.verificationCommands ?? [],
    scores: input.scores,
    accepted: input.accepted,
    notes: input.notes,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt
  };
}

/**
 * Returns a new {@link EvaluationRun} with a status update applied. Keeps the
 * model immutable; callers should use the returned value.
 */
export function withEvaluationRunStatus(
  run: EvaluationRun,
  status: EvaluationTaskStatus,
  at?: string
): EvaluationRun {
  const next: EvaluationRun = { ...run, status };
  if (status === "running" && at !== undefined) {
    return { ...next, startedAt: run.startedAt ?? at };
  }
  const isTerminal =
    status === "passed" || status === "failed" || status === "inconclusive";
  if (isTerminal && at !== undefined) {
    return { ...next, finishedAt: run.finishedAt ?? at };
  }
  return next;
}

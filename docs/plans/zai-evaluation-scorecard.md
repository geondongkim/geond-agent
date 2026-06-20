# Z.ai Evaluation Scorecard

Use this scorecard for every queued task in
`docs/plans/zai-evaluation-task-queue.md`.

## Task Metadata

| Field | Value |
| --- | --- |
| Task ID |  |
| Task title |  |
| Tool | Claude Code / Cline / OpenCode |
| Model or route |  |
| Branch/worktree |  |
| Started at |  |
| Finished at |  |
| Verification commands |  |
| Accepted for normal work? | Yes / No / Maybe |

## Scoring Scale

| Score | Meaning |
| --- | --- |
| 1 | Failed the task or created risky unrelated work. |
| 2 | Partially useful, but required heavy correction. |
| 3 | Usable with review, but had notable gaps or friction. |
| 4 | Good result with minor review comments. |
| 5 | Strong result that fit the repo and workflow naturally. |

## Scorecard

| Area | 1 | 3 | 5 | Score | Notes |
| --- | --- | --- | --- | --- | --- |
| Repo understanding | Missed the right files or boundaries. | Found the main area but needed guidance. | Quickly found ownership boundaries and relevant docs/code. |  |  |
| Edit quality | Broad, risky, or unrelated edits. | Mostly relevant edits with some cleanup needed. | Small, focused, reviewable changes matching local style. |  |  |
| Verification | Did not run or identify useful checks. | Ran some checks but missed obvious validation. | Ran the right repo checks and explained failures clearly. |  |  |
| Recovery | Got stuck or spiraled after errors. | Recovered with guidance or after extra attempts. | Diagnosed errors and corrected course cleanly. |  |  |
| Cost/value | Took longer than manual work or wasted usage. | Saved some time but required close supervision. | Clearly saved time for the subscription cost. |  |  |
| Workflow fit | Felt awkward or hard to trust. | Fit some parts of the workflow. | Felt natural for daily local repo work. |  |  |

## Task Notes

```text
What worked:

What failed:

Interesting behavior:

Review comments:

Follow-up needed:
```

## Decision Notes

| Question | Answer |
| --- | --- |
| Would this result be accepted after normal review? |  |
| Did the tool preserve secrets and local-only state? |  |
| Did the tool respect package boundaries? |  |
| Did the tool improve confidence in subscribing? |  |
| Should this tool stay in the next evaluation round? |  |

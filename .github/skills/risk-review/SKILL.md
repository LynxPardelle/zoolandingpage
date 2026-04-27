---
name: risk-review
description: 'Repo-local findings-first review workflow for Zoolanding diffs, release candidates, and cross-repo changes. Use when reviewing for bugs, regressions, rollout risk, weak validation, or missing tests.'
user-invocable: true
---

# Risk Review

This repo-local version is for review-only work. Lead with findings, not summaries.

## Review Targets

- local diffs or pull requests
- draft-affecting Angular changes
- cross-repo config or payload changes
- release-readiness or regression checks

## Output Contract

Each finding should include:

- severity
- concrete failure mode
- exact file or surface when available
- the smallest useful fix direction or missing test

If there are no findings, say that explicitly and note any residual testing gap.

## Review Workflow

1. Identify the intended change.

   - What behavior is meant to change?
   - What behavior must remain stable?

2. Inspect the highest-risk surfaces.

   - route resolution and draft loading
   - request, response, and payload validation
   - state transitions between local draft, authoring draft, and runtime state
   - error handling, fallbacks, and host-sensitive paths
   - tests, browser QA coverage, and release assumptions

3. Challenge unproven assumptions.

   - Missing fields, empty states, stale runtime data, malformed draft payloads, and partial rollouts matter more than happy-path flow.

4. Prefer evidence.

   - Ground findings in code, tests, runtime output, or an observable QA gap.

5. Return findings in priority order.
   - bugs and release risks first
   - then fragile behavior or missing tests
   - then lower-value clarity issues only if they affect correctness

## Severity Guide

- `High`: likely broken behavior, data loss, or release blocker
- `Medium`: works in the happy path but is fragile or untested in an important case
- `Low`: clarity or maintainability issue with real defect risk
- `Question`: unresolved ambiguity that could hide a defect

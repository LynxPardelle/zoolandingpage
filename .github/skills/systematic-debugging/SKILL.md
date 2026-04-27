---
name: systematic-debugging
description: 'Repo-local root-cause debugging workflow for Zoolanding issues. Use before fixing preview failures, SSR bugs, draft sync issues, analytics or quick-stats regressions, test failures, or other unexpected behavior.'
user-invocable: true
---

# Systematic Debugging

No fixes without root-cause investigation.

## Primary Targets In This Repo

- draft preview rendering and route resolution
- SSR and host-sensitive bootstrap behavior
- authoring sync and local draft tooling
- analytics and quick-stats gating
- cross-repo payload or contract mismatches

## Workflow

1. Reproduce the failure.

   - Capture the exact route, payload, command, or request that fails.
   - Save the observable symptom: console error, network response, failing test, or broken DOM state.

2. Localize the failing surface.

   - Decide whether the first bad state is in `src/`, `tools/`, local draft data, or a sibling Lambda contract.
   - Reduce the failure to the smallest reproducible route, input, or command.

3. Trace to the first wrong state.

   - Follow data flow from the visible failure back to the first incorrect assumption, payload field, route decision, or environment gate.
   - Prefer code evidence over intuition.

4. Fix the root cause.

   - Apply the smallest change that corrects the first wrong state.
   - Avoid defense-in-depth edits until the root cause is understood.

5. Verify the fix.
   - Re-run the failing route, command, or test.
   - Run the smallest adjacent check that would catch regression in the same area.

## When You Are Stuck

- Add short-lived diagnostics at service or config boundaries.
- Create a minimal local draft or route reproduction.
- Compare authoring state, local draft state, and runtime state instead of assuming they match.

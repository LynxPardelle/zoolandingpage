---
name: zoolanding-browser-qa
description: 'Repo-local browser QA workflow for Zoolanding draft routes, SSR output, responsive behavior, console errors, and network validation. Use when validating preview, runtime, authoring, or rendering behavior in the browser.'
user-invocable: true
---

# Zoolanding Browser QA

Use this repo-local skill as the default browser-validation workflow for Zoolandingpage.

## When to Use

- draft-affecting Angular changes
- route or slug behavior changes
- SSR or host-sensitive rendering work
- responsive, console, or network validation
- release-readiness checks that need browser evidence

## Workflow

1. Identify the exact surfaces to validate.

   - List every affected draft or runtime route.
   - Note whether authoring preview, local draft preview, or published runtime behavior is involved.

2. Validate both desktop and mobile.

   - Use at least one desktop viewport and one mobile viewport for each affected route.
   - Check layout, rendering parity, and responsive breakpoints.

3. Inspect runtime signals.

   - Review console output, network failures, and broken asset requests.
   - Confirm the expected config source and payload are being used.

4. Capture evidence.

   - Keep notes precise enough to reproduce the issue or confirm it is fixed.
   - When a defect is found, fix it at the source and re-run the same route checks.

5. Close only after the surfaces are clean.
   - No visible defect, console error, or unexpected network failure should remain on the affected routes.

## Tooling Guidance

- Use repo-local prompts and agents first.
- If installed, pair this skill with `agent-browser` for automation and `chrome-devtools` for live inspection.
- Use `dogfood` only when the task needs exploratory breadth beyond the explicit affected surfaces.

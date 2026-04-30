---
name: zoolanding-lighthouse-release-audit
description: Repo-local Zoolanding workflow for Lighthouse performance/accessibility work, SSR draft route fixes, language persistence regressions, Dokploy testing deploys, and Reports Lighthouse artifacts. Use when changing or auditing zoolandingpage performance, accessibility, draft rendering, SSR routing, deferred hydration, runtime-bundle behavior, or test branch releases.
---

# Zoolanding Lighthouse Release Audit

Use this skill for performance/accessibility work that must survive local SSR, draft preview, testing deployment, and Lighthouse reruns.

## Workflow

1. Read repo context first.

   - Read `Codex.md`.
   - Read `.github/skills/zoolanding-frontend-workflow/SKILL.md`.
   - Use `systematic-debugging` and `test-driven-development` before changing behavior.
   - Use `zoolanding-browser-qa` when browser evidence is required.

2. Reproduce on the exact route.

   - For local drafts, use `http://127.0.0.1:4200/?draftDomain={domain}` or the production SSR server on a free port.
   - For published testing, prefer both canonical alias URLs and `test.zoolandingpage.com.mx` URLs with `draftDomain`.
   - For Pamela-style routes, test both `/` and named routes such as `/home`.
   - For language bugs, start in one language, switch, reload, and verify SSR first paint before deferred hydration.

3. Add regression coverage before fixing.

   - SSR routes: extend `tools/tests/ssr-server.spec.mjs`.
   - Runtime/bootstrap language behavior: use `src/app/app.config.spec.ts` and `src/app/shared/services/language.service.spec.ts`.
   - Sticky query params and internal links: use `generic-link.spec.ts` or event-handler specs.
   - Draft payload regressions: run or extend `tools/tests/draft-smoke-check.spec.mjs`.

4. Keep known performance guardrails intact.

   - Do not reintroduce the client router into production bootstrap unless its Lighthouse cost is intentionally accepted.
   - Keep deferred browser hydration compatible with SSR first paint and user interaction.
   - Preserve sticky query params: `draftDomain`, `debugWorkspace`, and `lang`.
   - Keep selected language visible to SSR through URL or cookie, not only `localStorage`.
   - For audit user agents, avoid analytics/quick-stats requests that skew Lighthouse.
   - Keep global critical CSS fallbacks for above-the-fold Angora layout classes.

5. Verify locally.

   - Run focused Angular specs first.
   - Run `npm run build`.
   - Run `node --test tools/tests/ssr-server.spec.mjs`.
   - Run `npm run test:draft-smoke` when drafts/routes are involved.
   - Run full `npx ng test --watch=false --browsers=ChromeHeadless` before release when shared services changed.
   - Use Puppeteer/Chrome or the in-app browser to verify interactive flows.

6. Produce Lighthouse evidence.

   - Save local reports under `reports/lighthouse/{timestamp}-{topic}-local`.
   - Save testing reports under `reports/lighthouse/{timestamp}-{topic}-testing`.
   - Include `summary.md` with Central Time and category scores.
   - Do not force-add reports; `reports/lighthouse/` is intentionally gitignored.

7. Release through the expected branch flow.

   - Commit on `dev`.
   - Push `origin/dev`.
   - Fast-forward or merge `dev` into `test`.
   - Push `origin/test`.
   - Wait for Dokploy to deploy, then verify remote health and affected URLs.

## Testing URLs

- Main testing site: `https://test.zoolandingpage.com.mx/`
- Draft preview on testing: `https://test.zoolandingpage.com.mx/{path}?draftDomain={domain}&lang={lang}`
- Pamela alias example: `https://pamelabetancourt.zoolandingpage.com.mx/home`
- Local SSR: build first, then run `node dist/zoolandingpage/server/server.mjs` with `PORT` set.

## Closeout

- Report commit hash, pushed branches, tests run, browser QA result, and Lighthouse report path.
- If Dokploy is still serving old code immediately after push, poll the affected URLs before declaring remote verification complete.
- Stop any local SSR process started for QA before finishing.

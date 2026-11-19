# Dipsy Doo analytics activation

Date: 2026-11-18 (Central Time).

- Enable existing analytics events in the site generator and generated site configuration. Keep `consentUI: "none"` and `track: []`, preserving the current consent behavior and optional data-minimization settings.
- Promote the two-value change through [DEV PR 25](https://github.com/LynxPardelle/draft-dipsydoo-com-mx/pull/25), [TEST PR 26](https://github.com/LynxPardelle/draft-dipsydoo-com-mx/pull/26), and [production PR 27](https://github.com/LynxPardelle/draft-dipsydoo-com-mx/pull/27) using the protected merge workflow.
- Publish production source `8d9b0cdd55e0f2e547b15084f6309d47831d9d0c` as `production-8d9b0cdd55e0f2e547b15084f6309d47831d9d0c-44465312232-1` in [publication run 44465312232](https://github.com/LynxPardelle/draft-dipsydoo-com-mx/actions/runs/44465312232).
- Verify analytics enabled on all five published production route configurations, with production indexing retained. TEST desktop/mobile QA passed 10 of 10 cases with automatic `page_view` and `section_view` events carrying the exact ordered campaign query array.
- Complete production desktop/mobile QA on all five routes: 10 of 10 cases passed with the new published configuration, automatic visit/section events, and seven ordered campaign query entries.
- Send exactly one synthetic production visit, observe HTTP 200 with `ok: true`, and independently read its exact seven-entry query array from raw storage. The bounded recovery read one matching object in memory and required no resend; no raw bodies or private storage coordinates were recorded.
- Preserve the latest class-heading, protocol-poster and social-link updates, along with existing routes, SEO metadata, calendar downloads and WhatsApp targets. The reviewed source diff changes only the two analytics enablement flags.

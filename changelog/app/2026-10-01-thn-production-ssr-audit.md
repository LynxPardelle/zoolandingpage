# THN production private SSR dependency preflight

Date: 2026-10-01 (Central Time).

- Updated the Angular runtime, builder, CLI, CDK and Material packages together from 22.1.7 to 22.2.1. The production SSR publication workflow's `npm audit --omit=dev` gate rejected the prior router version because of GHSA-ff3f-86qr-9cv3.
- Refreshed the locked transitive PostCSS and nanoid versions that the same audit also rejected after the Angular update.
- Corrected the public artifact boundary test's repository URL conversion so it resolves workspace paths containing spaces on Windows.
- Verified a clean `npm ci`, zero production audit findings, the 42 private SSR release tests, and the production private SSR package locally. No artifact was uploaded or activated by this change.

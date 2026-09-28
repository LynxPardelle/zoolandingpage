# THN production environment and source promotion contracts

Date: 2026-09-27 (Central Time).

- Added closed TEST/production artifact, route, runtime-origin and recovery profiles. Private production uses the approved admin host and separately sealed production metadata; TEST guards remain exact.
- Production main pushes require an exact source-only selector covering source SHA/tree, target base and native merge tree. Builds and privileged publication are skipped for that promotion; mandatory Angular CI remains enabled. Manual publication retains protected branch, merge and immutable delivery verification.
- Corrected SSR and browser runtime selection to pin the environment to the trusted private origin and reject mismatched origin contexts. Both private hosts fail closed without a verified binding.
- Added the separate production draft descriptor schema and explicit projection of environment coordinates and private canonical URLs while preserving visual/content source bytes.
- Locally verified Angular, production compilation/private dependency closure/ZIP, TEST regressions, production delivery and credential-filter isolation, and production SSR with an isolated runtime fixture. These checks do not constitute an AWS deployment or live acceptance.

Production prerequisites, effective IAM proofs, immutable published coordinates, native inventory approval and live owner/visual acceptance remain pending. No accounts, articles or TEST artifacts are copied to production by this patch.

The raw source-only selector also rejects repeated JSON keys, including equivalent escaped key names, before requesting remote source evidence. Verified with real CLI execution and duplicate-coordinate regressions.

The real ShellCheck gate now recognizes intentional literal Markdown printf formats, and branch assignments use explicit quoted strings.
No global lint exclusions were added; release coordinates, query arguments and
summary bytes remain unchanged.

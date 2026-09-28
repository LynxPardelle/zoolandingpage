# Private TEST manual artifact publication

Date: 2026-09-27 (Central Time).

- Added the optional repository variable `THN_TEST_PRIVATE_MANUAL_ONLY` to skip artifact builds on TEST pushes when manual private publication is required.
- Manual private dispatches, production publication, protected promotion verification, sealed artifact checks and the TEST Environment policy remain unchanged.
- Mandatory Angular CI remains independent of this artifact publication gate.
- Added regression coverage for event, branch and policy combinations and documented the manual publication and rollback procedure.

This change does not activate an artifact or deploy infrastructure.

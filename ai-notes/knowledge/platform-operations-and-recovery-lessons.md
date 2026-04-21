# Platform Operations And Recovery Lessons

Date: 2026-04-19 (Central Time)
Scope: Sanitized operational lessons promoted from verified platform incidents and recovery work.
Status: Active
Applies To: Zoolanding platform hosting, tenant routing, and host recovery workflows
Source Of Truth:

- Sanitized from verified platform recovery work completed on 2026-04-04

Confidence: Medium to high
Last Reviewed: 2026-04-20 (Central Time)

## Public Routing Lesson

If multiple tenant-backed public domains fail at once while the direct management surface still works, check the shared edge or tenant-base origin first. A stale shared origin can break many public domains at the same time even when DNS and application config look healthy.

## Host Recovery Lesson

Keep Systems Manager access available on the active host so recovery does not depend only on SSH. If SSH fails, Systems Manager can provide the control path needed to restore service and then repair SSH separately.

## Service Recovery Lesson

After edge routing is repaired, verify the actual application service state on the active host before declaring the incident closed. A broken container image or missing local image can keep the site down even after the edge layer is healthy again.

## Security Rule

Do not copy instance identifiers, PEM paths, security-group details, or operator IP details into committed notes. Keep volatile operational specifics out of the canonical tree.

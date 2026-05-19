# Angora Layout Constraints

Date: 2026-04-19 (Central Time)
Scope: Shared constraints and preferred patterns for Angora-based layout authoring.
Status: Active
Applies To: Config-authored layout work using Angora CSS
Source Of Truth:

- `docs/03-development-guide.md`
- Promoted from local draft notes and findings
- `src/app/shared/services/angora-combos.service.ts`
- Browser QA from the 2026-05-01 `ngx-angora-css@1.6.0` integration pass

Confidence: Medium to high
Last Reviewed: 2026-05-18 (Central Time)

## Preferred Authoring Pattern

- Build section layout with explicit containers.
- Keep headings, body copy, and CTA rows separate when exact placement matters.
- Prefer shared-shell fixes before over-tuning individual sections.

## Practical Rules

- Use wrapper rows for centered actions instead of relying on auto margins.
- When link labels must inherit a color reliably, set the text color on the wrapper or container if the component inherits `color`.
- On `ngx-angora-css@1.6.0`, combos can be used for authored layout again when they are registered through the app runtime batching service.
- Registered combo class keys such as `btnBase` must trigger one full post-render `cssCreate()` scan. Reserve explicit `cssCreate([...])` calls for direct `ank-*` or abbreviation utilities that already contain a property/value shape.
- Keep global critical CSS fallbacks for first-paint geometry that must be correct before hydration, especially mutually exclusive responsive display states.
- Do not call both a rendered-class refresh and a full scheduled `cssCreate()` for the same DOM mutation. Prefer one explicit class-list pass after render.
- For Angora utility values that represent CSS keywords with hyphens, use the escaped `MIN` form in authored classes. Example: use `ank-justifyContent-spaceMINbetween` for `justify-content: space-between`; `ank-justifyContent-spaceBetween` can normalize into an empty rule and leave computed `justify-content` as `normal`.

## Validation Caveats

- CSSOM rule counts can be empty if sampled too early. Wait for the page heading and at least one post-render runtime pass before auditing Angora stylesheet rules.
- If a breakpoint or utility-token workaround becomes part of the durable solution, record it in a local constraint note or distill the reusable part here.
- When a draft depends heavily on Angora utilities, verify desktop and mobile routes for duplicate exact rules in `/css/angora-styles.css` and `/css/angora-styles-responsive.css`.

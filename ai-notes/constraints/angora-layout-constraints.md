# Angora Layout Constraints

Date: 2026-04-19 (Central Time)
Scope: Shared constraints and preferred patterns for Angora-based layout authoring.
Status: Active
Applies To: Config-authored layout work using Angora CSS
Source Of Truth:

- `docs/03-development-guide.md`
- Promoted from local draft notes and findings

Confidence: Medium to high
Last Reviewed: 2026-04-19 (Central Time)

## Preferred Authoring Pattern

- Build section layout with explicit containers.
- Keep headings, body copy, and CTA rows separate when exact placement matters.
- Prefer shared-shell fixes before over-tuning individual sections.

## Practical Rules

- Use wrapper rows for centered actions instead of relying on auto margins.
- When link labels must inherit a color reliably, set the text color on the wrapper or container if the component inherits `color`.
- Prefer raw structural utility classes when combo expansion is unreliable for layout-critical behavior.

## Validation Caveats

- Integrated-browser width or stylesheet generation may not fully reflect the real local-browser result.
- If a breakpoint or utility-token workaround becomes part of the durable solution, record it in a local constraint note or distill the reusable part here.

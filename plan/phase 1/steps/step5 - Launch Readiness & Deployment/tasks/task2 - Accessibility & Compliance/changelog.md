# Task 2: Accessibility & Compliance — Changelog

Date: 2025-08-23

Changes implemented:

- Added dynamic `&lt;html lang&gt;` sync with current language (and `dir=ltr`) in `AppShellComponent` to improve screen reader language context.
- Localized Skip Link label via computed signal; improved skip link a11y by adding `role="link"` and `aria-label`.
- Introduced default `:focus-visible` outline for interactive elements in `styles.scss` to ensure clear keyboard focus.
- Enhanced mobile menu button a11y: added `aria-haspopup`, `aria-controls`, and bound `aria-expanded`; marked the controlled region with `id="mobile-primary-navigation"`.
- Announce language changes via `AriaLiveService` with polite live region messages for SR feedback.
- Announce modal open/close via `AriaLiveService` for better SR context.

Validation:

- Dev server started without errors; manually validated keyboard-only navigation: skip link focuses main, focus rings visible, header landmarks present, mobile menu announces expanded/collapsed state.
- Verified `aria-live` regions are created on first announce.

Next up:

- Audit color contrast against Angora tokens in key sections and adjust if any < 4.5:1 (normal text) or 3:1 (large text).
- Expand live announcements for additional dynamic interactions as needed.
- Populate `docs/COMPLIANCE_STATUS.md` with updated status and any gaps.

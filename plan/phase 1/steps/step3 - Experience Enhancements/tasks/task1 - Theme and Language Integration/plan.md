# Task 1: Theme and Language Integration

## Goal

Finalize global theme and language behavior using signals and ngx-angora-css, with persistence and zero hardcoded colors.

## Steps

1. Theme
   - Ensure `ThemeService` applies colors via `pushColors()` / `updateColors()` only (no hardcoded colors)
   - Verify shell initializes theme on client render; prevent SSR side-effects
   - Confirm per-component cssCreate hooks do not duplicate heavy work
2. Language
   - Wire `LanguageService` to header language toggle
   - Persist language using `environment.localStorage.languageKey`
   - Read translation strings from `public/assets/i18n/{es,en}.json` (doc-first; integrate ngx-translate later)
3. A11y & UX
   - Keep visible labels short and consistent (ES/EN)
   - No FOUC on theme switch; regenerate classes via ngx-angora-css as needed

## Success Criteria

- [ ] Theme toggle updates colors instantly and persists across reloads
- [ ] Language toggle switches visible labels (ES/EN) and persists
- [ ] No hardcoded colors; colors pushed centrally via `ThemeService`
- [ ] No SSR hydration warnings from theme/language init

## References

- docs/04-ngx-angora-css.md
- docs/03-development-guide.md
- docs/REQUIREMENTS_SUMMARY.md

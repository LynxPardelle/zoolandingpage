# Task 2: Layout Components Integration

## Goal

Ensure AppHeader, AppFooter, AppContainer, and AppSection follow atomic file split, integrate pushColors, and are provided at shell level with Theme/Language services.

## Steps

1. Audit layout components and split into component/types/constants if missing
2. Add ngAfterRender with pushColors() and cssCreate() in each
3. Provide ThemeService & LanguageService at app level; inject where needed
4. Verify templates use modern control flow and signals

## Success Criteria

- [ ] All layout components meet atomic and types-only rules
- [ ] pushColors() used; no hardcoded colors
- [ ] Lint/type checks pass

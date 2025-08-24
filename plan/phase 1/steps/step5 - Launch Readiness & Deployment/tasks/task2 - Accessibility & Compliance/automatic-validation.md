# Task 2: Accessibility & Compliance — Automatic Validation

Checks performed this task:

- Keyboard focus outline present via `:focus-visible` for interactive elements
- Skip link exists and focuses `#main-content`
- `main` landmark present and reachable via keyboard
- Mobile menu button exposes `aria-haspopup`, `aria-controls`, and `aria-expanded`
- `html[lang]` synchronized to LanguageService value
- Live region announcements on language change

How to validate quickly:

1. Start dev server and navigate with Tab/Shift+Tab
2. Activate skip link, ensure focus lands inside `main`
3. Toggle mobile menu; observe `aria-expanded` reflecting state
4. Toggle language; with a screen reader, hear polite announcement

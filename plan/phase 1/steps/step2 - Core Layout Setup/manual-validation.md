# Step 2: Core Layout Setup - Manual Validation

## Visual & UX

- [ ] Header and footer persist across route changes
- [ ] Skip-to-content link is visible on focus and moves focus to main
- [ ] Main content area correctly wrapped by AppContainer/AppSection with consistent spacing
- [ ] Responsive behavior: header layout on 320px/768px/1920px

## Accessibility

- [ ] Landmarks present: header, nav (if inside header), main, footer
- [ ] Tab order starts at skip-link → header → main content
- [ ] Focus visible for interactive elements
- [ ] Language/Theme toggles have labels, roles, and announcements

## Routing

- [ ] Navigating to `/` renders landing content
- [ ] Hash navigation scrolls to anchors (`#services`, `#contact`)
- [ ] Back/forward buttons restore scroll position predictably

## Theme & Styling

- [ ] No hardcoded colors; verify colors come from theme via pushColors
- [ ] Theme switch updates shell and content correctly

## Performance

- [ ] page load in “Slow 3G” emulation shows shell quickly with placeholders
- [ ] @defer placeholders are visible for deferred areas
- [ ] Lighthouse scores ≥ 90 in Performance and Accessibility for the shell route

## SSR

- [ ] Server render succeeds (no hydration mismatch in console)
- [ ] No runtime errors related to window/document in constructors

## Analytics

- [ ] On navigation, a page-view event is logged/emitted once per route change

## Notes

Document any issues with screenshots and exact steps to reproduce. File findings in the changelog for this step.

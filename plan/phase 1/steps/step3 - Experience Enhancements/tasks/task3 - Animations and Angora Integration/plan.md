# Task 3: Animations and Angora Integration

## Goal

Introduce accessible micconversionnteractions/animations using ngx-angora-css combos, respecting reduced motion.

## Steps

1. Motion preference
   - Use `MotionPreferenceService` to detect `prefers-reduced-motion`
   - Disable heavy animations when reduced
2. Angora combos & classes
   - Define animation combos (e.g., fadeIn, slideIn) using Angora classes
   - Apply via component templates with `@defer` where non-critical
3. Testing
   - Unit tests to ensure motion off path avoids heavy classes

## Success Criteria

- [ ] Reduced motion honored (no heavy animation classes when set)
- [ ] Non-critical animations deferred
- [ ] No visual regressions on initial render

## References

- docs/07-animations-and-angora-integration.md

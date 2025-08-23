# Animations & Angora CSS Integration

Angora CSS intentionally focuses on utility class generation for properties it can statically express. For keyframe animations we define the `@keyframes` blocks once in global CSS and reference only the animation **name** via a small semantic class. All other animation aspects (duration, timing function, iteration count, delay, direction, fill mode, play state) can then be controlled through Angora's generated utility classes.

## Core Principle

1. Define keyframes in `public/css/animations.css`.
2. Expose a simple semantic hook class in `src/styles.scss` that sets only `animation-name` (and optionally contextual background styles for shimmer, etc.).
3. Compose the final animation behavior in templates by combining:
   - The semantic animation name class (e.g. `spinAnimation`).
   - Angora animation utility classes for duration / timing / iteration / delay, e.g.: `ank-and-1s ank-antf-linear ank-anic-infinite`.

This keeps keyframes centralized and avoids duplicating timing specifics across the codebase.

## Available Keyframes (2025-08-18)

| Keyframe        | Semantic Class           | Typical Use                               |
| --------------- | ------------------------ | ----------------------------------------- |
| `gradientShift` | `gradientShiftAnimation` | Background gradients / header effects     |
| `spin`          | `spinAnimation`          | Loading indicators / spinners             |
| `fadeUp`        | `fadeUpAnimation`        | Enter transitions for cards / sections    |
| `scaleIn`       | `scaleInAnimation`       | Subtle pop-in emphasis                    |
| `pulseSoft`     | `pulseSoftAnimation`     | Gentle attention (active states, stats)   |
| `wiggle`        | `wiggleAnimation`        | Brief attention grab (icon/button)        |
| `shimmer`       | `shimmerAnimation`       | Skeleton loading placeholder effect       |
| `growX`         | `growXAnimation`         | Progress bars / loading bars              |
| `breathe`       | `breatheAnimation`       | Passive pulsing opacity (background a11y) |

## Usage Examples

### Spinner (Generic Button Loading State)

```html
<span class="spinAnimation ank-and-1s ank-antf-linear ank-anic-infinite"></span>
```

The component sets only `animation-name: spin;`. Duration (1s), timing (linear) and infinite looping are handled by Angora utilities.

### Fade Up Card Intro

```html
<div class="fadeUpAnimation ank-and-400ms ank-andelay-80ms ank-antf-easeOut"></div>
```

(Assumes corresponding Angora classes exist for 400ms duration, 80ms delay, and easing.)

### Shimmer Placeholder

```html
<div class="shimmerAnimation ank-and-1_2s ank-antf-linear ank-anic-infinite ank-backgroundColor-secondaryBgColor"></div>
```

`shimmerAnimation` applies the gradient background + keyframe; Angora controls speed and repetition.

## Authoring New Animations

1. Add `@keyframes` block to `public/css/animations.css`.
2. Add a semantic hook class in `styles.scss` setting `animation-name: newKeyframe;`.
3. Document the intent table row in this file.
4. Reuse existing duration / timing / iteration Angora utilities—do not embed those values into the class.

## Rationale

- Separation of concerns: keyframe definition vs. temporal configuration.
- Prevents proliferation of near-duplicate keyframes differing only by timing.
- Keeps bundle lean and encourages consistent motion language.

## Naming Conventions

- Keyframes: camelCase verbs (`fadeUp`, `scaleIn`, `pulseSoft`).
- Semantic classes: `<keyframeName>Animation`.
- Avoid generic names like `animate1`; prefer descriptive intent.

## Accessibility Considerations

- Respect `prefers-reduced-motion` by conditionally applying animation classes where motion is purely decorative.
- For essential feedback (loading spinners), keep motion minimal and avoid extreme easing or large translate values.

## Future Extensions

- Add a small Angular directive (e.g. `appAnimateOnView`) to attach animation classes only once the element intersects viewport (defer initial motion off-screen).
- Provide an Angora macro combo for commonly combined animation utility sets (e.g. `animFadeInFast`).

---

**Last updated:** 2025-08-18

## Reduced Motion Integration (Implemented Examples)

- Use `MotionPreferenceService` in components to gate Angular triggers:

```ts
// component.ts
import { inject } from '@angular/core';
import { MotionPreferenceService } from '@/app/shared/services/motion-preference.service';
readonly motion = inject(MotionPreferenceService);
```

```html
<!-- component.html -->
<div [@fadeIn]="!motion.reduced() ? {} : null"></div>
```

- For CSS-based transitions, add `ank-transition-none` when `reduced` is true.

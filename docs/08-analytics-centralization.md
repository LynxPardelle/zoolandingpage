# Centralized Analytics Architecture

This document explains the unified analytics event flow after the refactor on branch `refactor_analiticas`.

## Goals

- Remove direct `AnalyticsService` injections from feature / UI components.
- Provide a single choke point (AppShell) where all tracking logic, suppression and future routing can live.
- Standardize a lightweight event payload shape to decouple producers from the concrete analytics implementation.
- Make testing simpler (assert emitted payloads, not side effects).

## Core Concepts

### 1. Event Payload Interface

Defined in `shared/services/analytics.events.ts`:

```
export interface AnalyticsEventPayload {
  readonly name: AnalyticsEventName;        // required canonical event id
  readonly category?: AnalyticsCategory;    // high‑level grouping
  readonly label?: string;                  // small string descriptor
  readonly value?: number;                  // numeric metric (e.g. scroll depth %)
  readonly meta?: any;                      // arbitrary contextual data
}
```

### 2. Component Emission Pattern

Components now expose an `analyticsEvent` Output instead of calling `analytics.track(...)`:

```
readonly analyticsEvent = output<AnalyticsEventPayload>();
...
this.analyticsEvent.emit({ name: AnalyticsEvents.ServicesCtaClick, category: AnalyticsCategories.Services, label: title });
```

Affected components/services:

- `AppHeaderComponent`
- `LandingPageComponent`
- `ServicesSectionComponent`
- `FaqSectionComponent`
- `ConversionCalculatorSectionComponent`
- `WhatsAppButtonComponent`
- `ModalService` (via `analyticsEvents$` observable stream)

### 3. AppShell Central Handler

`AppShellComponent` template binds header output:

```
<app-header ... (analyticsEvent)="handleAnalyticsEvent($event)"></app-header>
```

Router outlet activation wires any routed component exposing an `analyticsEvent` Output:

```
<router-outlet (activate)="onRouteActivate($event)"></router-outlet>
```

Implementation snippet:

```
handleAnalyticsEvent(evt: AnalyticsEventPayload) {
  if (!evt?.name) return;
  if (evt.label === 'suppress_request' && evt.meta?.suppressForMs) {
    this.analytics.suppress([evt.name], Date.now() + evt.meta.suppressForMs);
    return;
  }
  this.analytics.track(evt.name, { category: evt.category, label: evt.label, value: evt.value, meta: evt.meta });
}
```

Modal events are subscribed in the constructor:

```
this.modal.analyticsEvents$?.subscribe(e => this.handleAnalyticsEvent(e));
```

### 4. Suppression Mechanism

Previously components called `analytics.suppress(...)`. Now they emit a synthetic suppression request:

```
this.analyticsEvent.emit({
  name: AnalyticsEvents.SectionView,
  category: AnalyticsCategories.Navigation,
  label: 'suppress_request',
  meta: { suppressForMs: 200, intent: 'suppress_section_view_during_programmatic_scroll' }
});
```

`AppShell` interprets this (label === 'suppress_request') and applies suppression centrally.

### 5. ModalService Adaptation

`ModalService` no longer injects `AnalyticsService`. It pushes events to a private Subject:

```
private readonly _analytics$ = new Subject<AnalyticsEventPayload>();
analyticsEvents$ = this._analytics$.asObservable();
```

`open()` and `close()` push `modal_open` and `modal_close` events.

### 6. Testing Strategy

Unit tests that previously spied on `AnalyticsService.track` inside components now subscribe to the `analyticsEvent` Output.
Example (`services-section.component.spec.ts`):

```
component.analyticsEvent.subscribe(e => emitted = e);
component.onCta('T1');
expect(emitted).toEqual(jasmine.objectContaining({ name: 'services_cta_click', category: 'services', label: 'T1' }));
```

`ModalService` spec now listens to the `analyticsEvents$` stream instead of patching internals.

### 7. Extension Points

Centralization enables:

- Enriching all outgoing events with session/page context in one place.
- Routing events to multiple sinks (e.g., server + console + A/B framework).
- Batch/queue management & rate limiting centrally.
- Adding user consent gating without touching producers.

### 8. Migration Checklist (applied)

- [x] Introduced `AnalyticsEventPayload`.
- [x] Replaced direct `analytics.track` calls in components.
- [x] Added outputs `(analyticsEvent)` and wired in `AppShell`.
- [x] Added router outlet activation hook for routed components.
- [x] Converted `ModalService` to emit via Subject.
- [x] Implemented suppression relay.
- [x] Updated affected unit tests.

### 9. Future Improvements

- Auto-discovery decorator: a directive to auto-bind any child `analyticsEvent` Output instead of manual router activation hook.
- Stronger meta typing (replace `any` with discriminated unions per event name).
- Add dev-only debug panel controls for filtering categories.
- Provide `AnalyticsFacade` that can map legacy events to new schema.

### 10. Usage Quick Reference

| Scenario               | Component code                                                                                                            | Result                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Track CTA              | `this.analyticsEvent.emit({ name: AnalyticsEvents.CtaClick, category: AnalyticsCategories.CTA, label: 'hero_primary' });` | AppShell forwards to `AnalyticsService.track` |
| Suppress SectionView   | emit payload with `label: 'suppress_request'` + `meta.suppressForMs`                                                      | AppShell calls `analytics.suppress`           |
| Modal open             | `modalService.open({ id: 'x' })`                                                                                          | ModalService emits event, AppShell tracks     |
| Scroll depth milestone | component emits `{ name: scroll_depth, value: pct }`                                                                      | Central tracking + later enrichment           |

---

This architecture reduces coupling, simplifies tests, and prepares the codebase for multi-sink analytics and richer context enrichment.

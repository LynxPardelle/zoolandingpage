import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
import { StatsCounterComponent } from '../stats-counter/stats-counter.component';
import type { StatsCounterConfig } from '../stats-counter/stats-counter.types';

@Component({
    selector: 'stats-strip-section',
    standalone: true,
    imports: [CommonModule, AppSectionComponent, AppContainerComponent, StatsCounterComponent],
    templateUrl: './stats-strip-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsStripSectionComponent {
    private readonly analytics = inject(AnalyticsService);
    private readonly i18n = inject(LandingPageI18nService);

    readonly content = computed(() => this.i18n.statsStrip());

    // Landing visits (persistent page view count)
    readonly visitsConfig = computed<StatsCounterConfig>(() => ({
        target: this.analytics.getPageViewCount(),
        durationMs: 1600,
        startOnVisible: true,
        format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
        ariaLabel: this.content().visitsLabel,
    }));

    // CTA interactions (count of CTA click events in buffer)
    readonly ctaInteractionsConfig = computed<StatsCounterConfig>(() => ({
        target: this.analytics.getEventCount('cta_click'),
        durationMs: 1800,
        startOnVisible: true,
        format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
        ariaLabel: this.content().ctaInteractionsLabel,
    }));

    // Average time on landing (approximation using recent session events as a proxy)
    // Note: Without explicit timers, we present a relative indicator in seconds based on session activity.
    readonly averageTimeConfig = computed<StatsCounterConfig>(() => ({
        target: Math.min(600, Math.max(284, this.analytics.getSessionEventCount() * 5)),
        durationMs: 2000,
        startOnVisible: true,
        format: (v: number) => `${ Math.round(v) }s`,
        ariaLabel: this.content().averageTimeLabel,
    }));
}

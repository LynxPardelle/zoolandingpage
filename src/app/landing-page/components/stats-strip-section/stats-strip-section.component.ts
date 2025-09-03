import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { QuickStatsService } from '../../../shared/services/quick-stats.service';
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
    private readonly quickStats = inject(QuickStatsService);
    private readonly i18n = inject(LandingPageI18nService);

    readonly content = computed(() => this.i18n.statsStrip());

    // Remote stats cache (updated on init via dryRun read)
    private readonly remoteStats = signal<Record<string, any> | undefined>(undefined);
    constructor() {
        effect(() => {
            this.remoteStats.set(this.quickStats.remoteStats());
        });
    }

    // Landing visits (persistent page view count)
    readonly visitsConfig = computed<StatsCounterConfig>(() => ({
        target: Number(this.remoteStats()?.['metrics']?.['pageViews'] ?? this.analytics.getPageViewCount()),
        durationMs: 1600,
        startOnVisible: true,
        format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
        ariaLabel: this.content().visitsLabel,
    }));

    // CTA interactions (count of CTA click events in buffer)
    readonly ctaInteractionsConfig = computed<StatsCounterConfig>(() => ({
        target: Number(this.remoteStats()?.['metrics']?.['ctaClicks'] ?? this.analytics.getEventCount('ctaClicks')),
        durationMs: 1800,
        startOnVisible: true,
        format: (v: number) => Math.max(0, Math.round(v)).toLocaleString(),
        ariaLabel: this.content().ctaInteractionsLabel,
    }));

    // Average time on landing (approximation using recent session events as a proxy)
    // Note: Without explicit timers, we present a relative indicator in seconds based on session activity.
    readonly averageTimeConfig = computed<StatsCounterConfig>(() => ({
        target: Math.min(600, Math.max(284, Number(this.remoteStats()?.['metrics']?.['avgTimeSecs'] ?? this.analytics.getSessionEventCount() * 5))),
        durationMs: 2000,
        startOnVisible: true,
        format: (v: number) => `${ Math.round(v) }s`,
        ariaLabel: this.content().averageTimeLabel,
    }));
}

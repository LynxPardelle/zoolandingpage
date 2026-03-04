import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { GenericStatsCounterComponent } from '../../../shared/components/generic-stats-counter/generic-stats-counter.component';
import type { TGenericStatsCounterConfig } from '../../../shared/components/generic-stats-counter/generic-stats-counter.types';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { I18nService } from '../../../shared/services/i18n.service';
import type { BusinessSize, CalculatedRoi } from './conversion-calculator-section.types';
@Component({
    selector: 'conversion-calculator-section',
    imports: [CommonModule, MatIconModule, GenericStatsCounterComponent, GenericButtonComponent],
    templateUrl: './conversion-calculator-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversionCalculatorSectionComponent {
    readonly analyticsEvent = output<AnalyticsEventPayload>();
    private readonly i18n = inject(I18nService);

    readonly businessSize = input.required<BusinessSize>();
    readonly industry = input.required<string>();
    readonly visitors = input.required<number>();
    readonly calculatedROI = input.required<CalculatedRoi>();
    readonly businessSizeChange = output<BusinessSize>();
    readonly industryChange = output<string>();
    readonly visitorsChange = output<number>();
    readonly industryIds: readonly string[] = ['ecommerce', 'services', 'restaurant', 'health', 'education', 'consulting'];

    // Calculator translations via API/i18n keys without embedded local copy fallbacks.
    readonly calculatorContent = computed(() => ({
        title: this.i18n.tOr('landing.calculator.title', this.i18n.tOr('calculator.title', '')),
        subtitle: this.i18n.tOr('landing.calculator.subtitle', this.i18n.tOr('calculator.subtitle', '')),
        description: this.i18n.tOr(
            'landing.calculator.description',
            this.i18n.tOr('calculator.description', '')
        ),
        visitorsLabel: this.i18n.tOr('landing.calculator.visitorsLabel', this.i18n.tOr('calculator.visitorsLabel', '')),
        visitsPerMonthSuffix: this.i18n.tOr('landing.calculator.visitsPerMonthSuffix', this.i18n.tOr('calculator.visitsPerMonthSuffix', '')),
        inputVisitorsLabel: this.i18n.tOr('landing.calculator.inputVisitorsLabel', this.i18n.tOr('calculator.inputVisitorsLabel', '')),
        inputVisitorsAriaLabel: this.i18n.tOr('landing.calculator.inputVisitorsAriaLabel', this.i18n.tOr('calculator.inputVisitorsAriaLabel', '')),
        businessSizeLabel: this.i18n.tOr('landing.calculator.businessSizeLabel', this.i18n.tOr('calculator.businessSizeLabel', '')),
        industryLabel: this.i18n.tOr('landing.calculator.industryLabel', this.i18n.tOr('calculator.industryLabel', '')),
        growthPotentialTitle: this.i18n.tOr('landing.calculator.growthPotentialTitle', this.i18n.tOr('calculator.growthPotentialTitle', '')),
        basedOnCurrentConfig: this.i18n.tOr('landing.calculator.basedOnCurrentConfig', this.i18n.tOr('calculator.basedOnCurrentConfig', '')),
        resultsBasedHint: this.i18n.tOr('landing.calculator.resultsBasedHint', this.i18n.tOr('calculator.resultsBasedHint', '')),
        projectionsDisclaimer: this.i18n.tOr('landing.calculator.projectionsDisclaimer', this.i18n.tOr('calculator.projectionsDisclaimer', '')),
        requestConsultingCta: this.i18n.tOr('landing.calculator.requestConsultingCta', this.i18n.tOr('calculator.requestConsultingCta', '')),
        placeholderMonthlyIncreaseValue: this.i18n.tOr('landing.calculator.placeholderMonthlyIncreaseValue', this.i18n.tOr('calculator.placeholderMonthlyIncreaseValue', '')),
        placeholderConversionImprovementValue: this.i18n.tOr('landing.calculator.placeholderConversionImprovementValue', this.i18n.tOr('calculator.placeholderConversionImprovementValue', '')),
        businessSizeLabels: this.i18n.getOr('landing.calculator.businessSizeLabels', this.i18n.getOr('calculator.businessSizeLabels', {
            nano: { title: '', description: '' },
            micro: { title: '', description: '' },
            small: { title: '', description: '' },
            medium: { title: '', description: '' },
        })),
        industryLabels: this.i18n.getOr('landing.calculator.industryLabels', this.i18n.getOr('calculator.industryLabels', {} as Record<string, string>)),
        monthlyIncreaseLabel: this.i18n.tOr('landing.calculator.monthlyIncreaseLabel', this.i18n.tOr('calculator.monthlyIncreaseLabel', '')),
        conversionImprovementLabel: this.i18n.tOr('landing.calculator.conversionImprovementLabel', this.i18n.tOr('calculator.conversionImprovementLabel', '')),
    }));

    readonly monthlyIncreaseConfig = computed<TGenericStatsCounterConfig>(() => ({
        target: this.calculatedROI().monthlyIncrease,
        durationMs: 1500,
        startOnVisible: true,
        format: (v: number) => Math.round(v).toLocaleString(),
        ariaLabel: this.calculatorContent().monthlyIncreaseLabel,
    }));

    // Conversion improvement multiplier (e.g., 3.4x)
    readonly conversionImprovementConfig = computed<TGenericStatsCounterConfig>(() => ({
        target: this.calculatedROI().conversionImprovement,
        durationMs: 1800,
        startOnVisible: true,
        format: (v: number) => (Math.round(v * 10) / 10).toString() + 'x',
        ariaLabel: this.calculatorContent().conversionImprovementLabel,
    }));

    // Stats counters moved to StatsStripSectionComponent

    updateBusinessSize(size: BusinessSize) {
        this.analyticsEvent.emit({ name: AnalyticsEvents.RoiSizeChange, category: AnalyticsCategories.RoiCalculator, label: size });
        this.businessSizeChange.emit(size);
    }

    updateIndustry(industry: string) {
        this.analyticsEvent.emit({ name: AnalyticsEvents.RoiIndustryChange, category: AnalyticsCategories.RoiCalculator, label: industry });
        this.industryChange.emit(industry);
    }

    onVisitorsChange(value: number): void {
        const v = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
        // Delegate analytics to parent (LandingPageComponent) for a single source of truth
        this.visitorsChange.emit(v);
    }
}

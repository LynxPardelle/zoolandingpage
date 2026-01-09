import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent } from '../../../core/components/layout/app-container/app-container.component';
import { AppSectionComponent } from '../../../core/components/layout/app-section/app-section.component';
import { I18nService } from '../../../core/services/i18n.service';
import { LanguageService } from '../../../core/services/language.service';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { getTranslations } from '../landing-page/i18n.constants';
import type { LandingPageTranslations } from '../landing-page/i18n.types';
import { StatsCounterComponent } from '../stats-counter/stats-counter.component';
import type { StatsCounterConfig } from '../stats-counter/stats-counter.types';
import type { BusinessSize, CalculatedRoi } from './conversion-calculator-section.types';
@Component({
    selector: 'conversion-calculator-section',
    imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule, StatsCounterComponent, GenericButtonComponent],
    templateUrl: './conversion-calculator-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversionCalculatorSectionComponent {
    readonly analyticsEvent = output<AnalyticsEventPayload>();
    private readonly i18n = inject(I18nService);
    private readonly language = inject(LanguageService);

    readonly businessSize = input.required<BusinessSize>();
    readonly industry = input.required<string>();
    readonly visitors = input.required<number>();
    readonly calculatedROI = input.required<CalculatedRoi>();
    readonly businessSizeChange = output<BusinessSize>();
    readonly industryChange = output<string>();
    readonly visitorsChange = output<number>();

    // Section content from centralized translations
    private readonly landingTranslations = computed<LandingPageTranslations>(() =>
        this.i18n.get<LandingPageTranslations>('landing') ?? getTranslations(this.language.currentLanguage() as any)
    );

    readonly calculatorContent = computed(() => this.landingTranslations().calculator);

    readonly monthlyIncreaseConfig = computed<StatsCounterConfig>(() => ({
        target: this.calculatedROI().monthlyIncrease,
        durationMs: 1500,
        startOnVisible: true,
        format: (v: number) => Math.round(v).toLocaleString(),
        ariaLabel: this.calculatorContent().monthlyIncreaseLabel,
    }));

    // Conversion improvement multiplier (e.g., 3.4x)
    readonly conversionImprovementConfig = computed<StatsCounterConfig>(() => ({
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

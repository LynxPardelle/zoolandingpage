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

    // Calculator translations via I18nService.t() (DB/API-ready) with safe fallbacks.
    readonly calculatorContent = computed(() => ({
        title: this.i18n.tOr('landing.calculator.title', 'Calculadora de Conversión'),
        subtitle: this.i18n.tOr('landing.calculator.subtitle', 'Estima tu potencial de crecimiento'),
        description: this.i18n.tOr(
            'landing.calculator.description',
            'Ajusta los parámetros y revisa el impacto estimado en ingresos y conversión.'
        ),
        monthlyIncreaseLabel: this.i18n.tOr('landing.calculator.monthlyIncreaseLabel', 'Ingresos adicionales mensuales'),
        conversionImprovementLabel: this.i18n.tOr('landing.calculator.conversionImprovementLabel', 'Mejora estimada en conversión'),
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

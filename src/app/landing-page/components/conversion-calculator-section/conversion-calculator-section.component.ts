import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsCategories, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { StatsCounterComponent } from '../stats-counter/stats-counter.component';
import type { StatsCounterConfig } from '../stats-counter/stats-counter.types';
import type { BusinessSize, CalculatedRoi } from './conversion-calculator-section.types';

@Component({
    selector: 'conversion-calculator-section',
    standalone: true,
    imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule, StatsCounterComponent],
    templateUrl: './conversion-calculator-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversionCalculatorSectionComponent {
    private readonly analytics = inject(AnalyticsService);
    readonly businessSize = input.required<BusinessSize>();
    readonly industry = input.required<string>();
    readonly visitors = input.required<number>();
    readonly calculatedROI = input.required<CalculatedRoi>();
    readonly businessSizeChange = output<BusinessSize>();
    readonly industryChange = output<string>();
    readonly visitorsChange = output<number>();

    readonly monthlyIncreaseConfig = computed<StatsCounterConfig>(() => ({
        target: this.calculatedROI().monthlyIncrease,
        durationMs: 1500,
        startOnVisible: true,
        format: (v: number) => Math.round(v).toLocaleString(),
        ariaLabel: 'Ingresos adicionales mensuales en dólares',
    }));

    // Conversion improvement multiplier (e.g., 3.4x)
    readonly conversionImprovementConfig = computed<StatsCounterConfig>(() => ({
        target: this.calculatedROI().conversionImprovement,
        durationMs: 1800,
        startOnVisible: true,
        format: (v: number) => (Math.round(v * 10) / 10).toString() + 'x',
        ariaLabel: 'Mejora de conversión estimada',
    }));

    readonly projectsConfig: StatsCounterConfig = {
        target: 250,
        durationMs: 2000,
        startOnVisible: true,
        format: (v: number) => Math.round(v) + '+',
        ariaLabel: 'Proyectos completados exitosamente',
    };

    readonly satisfactionConfig: StatsCounterConfig = {
        target: 98,
        durationMs: 1800,
        startOnVisible: true,
        format: (v: number) => Math.round(v) + '%',
        ariaLabel: 'Porcentaje de satisfacción del cliente',
    };

    readonly improvementConfig: StatsCounterConfig = {
        target: 300,
        durationMs: 2200,
        startOnVisible: true,
        format: (v: number) => Math.round(v) + '%',
        ariaLabel: 'Promedio de mejora en conversiones',
    };

    updateBusinessSize(size: BusinessSize) {
        this.analytics.track(AnalyticsEvents.RoiSizeChange, { category: AnalyticsCategories.RoiCalculator, label: size });
        this.businessSizeChange.emit(size);
    }
    updateIndustry(industry: string) {
        this.analytics.track(AnalyticsEvents.RoiIndustryChange, {
            category: AnalyticsCategories.RoiCalculator,
            label: industry,
        });
        this.industryChange.emit(industry);
    }

    onVisitorsChange(value: number): void {
        const v = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
        // Delegate analytics to parent (LandingPageComponent) for a single source of truth
        this.visitorsChange.emit(v);
    }
}

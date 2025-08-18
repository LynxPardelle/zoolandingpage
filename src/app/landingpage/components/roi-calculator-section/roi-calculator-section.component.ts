import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { StatsCounterComponent } from '../stats-counter/stats-counter.component';
import type { StatsCounterConfig } from '../stats-counter/stats-counter.types';
import { BusinessSize, CalculatedRoi } from './roi-calculator-section.types';

@Component({
  selector: 'roi-calculator-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule, StatsCounterComponent],
  templateUrl: './roi-calculator-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiCalculatorSectionComponent {
  readonly businessSize = input.required<BusinessSize>();
  readonly industry = input.required<string>();
  readonly visitors = input.required<number>();
  readonly calculatedROI = input.required<CalculatedRoi>();
  readonly businessSizeChange = output<BusinessSize>();
  readonly industryChange = output<string>();

  readonly monthlyIncreaseConfig = computed<StatsCounterConfig>(() => ({
    target: this.calculatedROI().monthlyIncrease,
    durationMs: 1500,
    startOnVisible: true,
    format: (v: number) => Math.round(v).toLocaleString(),
    ariaLabel: 'Ingresos adicionales mensuales en dólares',
  }));

  readonly roiPercentageConfig = computed<StatsCounterConfig>(() => ({
    target: this.calculatedROI().roiPercentage,
    durationMs: 1800,
    startOnVisible: true,
    format: (v: number) => Math.round(v).toString(),
    ariaLabel: 'Porcentaje de retorno de inversión',
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
    this.businessSizeChange.emit(size);
  }
  updateIndustry(industry: string) {
    this.industryChange.emit(industry);
  }
}

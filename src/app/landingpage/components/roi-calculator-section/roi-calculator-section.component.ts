import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';

@Component({
  selector: 'roi-calculator-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './roi-calculator-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiCalculatorSectionComponent {
  readonly businessSize = input.required<'nano' | 'micro' | 'small' | 'medium'>();
  readonly industry = input.required<string>();
  readonly visitors = input.required<number>();
  readonly calculatedROI = input.required<{
    readonly roiPercentage: number;
    readonly conversionImprovement: number;
    readonly monthlyIncrease: number;
  }>();
  readonly businessSizeChange = output<'nano' | 'micro' | 'small' | 'medium'>();
  readonly industryChange = output<string>();
  updateBusinessSize(size: 'nano' | 'micro' | 'small' | 'medium') {
    this.businessSizeChange.emit(size);
  }
  updateIndustry(industry: string) {
    this.industryChange.emit(industry);
  }
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { ProcessStep } from './interactive-process.types';

@Component({
  selector: 'interactive-process',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './interactive-process.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveProcessComponent {
  readonly process = input.required<readonly ProcessStep[]>();
  readonly currentStep = input.required<number>();
  readonly selectStep = output<number>();
  readonly currentData = computed(() => this.process()[this.currentStep()] || this.process()[0]);
  choose(i: number) {
    this.selectStep.emit(i);
  }
}

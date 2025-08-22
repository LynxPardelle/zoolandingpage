import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, Signal, computed, signal } from '@angular/core';
import { StepDefinition, StepperConfig } from './stepper.types';

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperComponent {
  @Input() set stepsSource(v: readonly StepDefinition[] | null) {
    this._steps.set(v ?? []);
  }
  @Input() config: StepperConfig | null = null;

  private _steps = signal<readonly StepDefinition[]>([]);
  steps: Signal<readonly StepDefinition[]> = computed(() => this._steps());
  activeIndex = signal(0);

  canGo(index: number): boolean {
    if (this.config?.linear) {
      // may go to any step up to the first incomplete step + 1
      return index <= this.maxCompletedIndex() + 1;
    }
    return true;
  }

  private maxCompletedIndex(): number {
    return this._steps().reduce((acc, s, i) => (s.completed ? i : acc), -1);
  }

  select(index: number) {
    if (this.canGo(index)) this.activeIndex.set(index);
  }

  isActive(i: number) {
    return this.activeIndex() === i;
  }

  onKey(ev: KeyboardEvent) {
    const n = this._steps().length;
    if (!n) return;
    let idx = this.activeIndex();
    switch (ev.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        ev.preventDefault();
        idx = (idx + 1) % n;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        ev.preventDefault();
        idx = (idx - 1 + n) % n;
        break;
      case 'Home':
        ev.preventDefault();
        idx = 0;
        break;
      case 'End':
        ev.preventDefault();
        idx = n - 1;
        break;
      default:
        return;
    }
    if (this.canGo(idx)) this.activeIndex.set(idx);
  }
}

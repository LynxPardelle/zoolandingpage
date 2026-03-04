import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../../shared/services/i18n.service';
import { ProcessStep } from './interactive-process-leaf.types';

@Component({
  selector: 'interactive-process-leaf',
  imports: [CommonModule, MatIconModule],
  templateUrl: './interactive-process-leaf.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .accordion-content {
      animation: slideDown 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      transform-origin: top;
    }

    .accordion-content-closing {
      animation: slideUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      transform-origin: top;
    }

    @keyframes slideDown {
      0% {
        opacity: 0;
        transform: translateY(-15px) scaleY(0.9);
        max-height: 0;
      }
      50% {
        opacity: 0.7;
        transform: translateY(-5px) scaleY(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scaleY(1);
        max-height: 1000px;
      }
    }

    @keyframes slideUp {
      0% {
        opacity: 1;
        transform: translateY(0) scaleY(1);
        max-height: 1000px;
      }
      50% {
        opacity: 0.5;
        transform: translateY(-5px) scaleY(0.95);
      }
      100% {
        opacity: 0;
        transform: translateY(-10px) scaleY(0.9);
        max-height: 0;
      }
    }

    .step-header {
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .step-header:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .step-header:active {
      transform: translateY(0);
    }

    .chevron-icon {
      transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .step-number {
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
  `],
})
export class InteractiveProcessLeafComponent {
  private readonly i18n = inject(I18nService);
  private readonly elementRef = inject(ElementRef);

  readonly process = input.required<readonly ProcessStep[]>();
  readonly currentStep = input.required<number>();
  readonly selectStep = output<number>();

  readonly currentData = computed(() => {
    const steps = this.process();
    if (!steps?.length) {
      return undefined;
    }

    const step = this.currentStep();
    // If currentStep is -1 (closed) or invalid, use the first step as fallback.
    if (step < 0 || step >= steps.length) {
      return steps[0];
    }
    return steps[step];
  });

  readonly sectionContent = computed(() => ({
    title: this.i18n.tOr('landing.processSection.title', this.i18n.tOr('processSection.title', '')),
    sidebarTitle: this.i18n.tOr('landing.processSection.sidebarTitle', this.i18n.tOr('processSection.sidebarTitle', '')),
    detailedDescriptionLabel: this.i18n.tOr('landing.processSection.detailedDescriptionLabel', this.i18n.tOr('processSection.detailedDescriptionLabel', '')),
    deliverablesLabel: this.i18n.tOr('landing.processSection.deliverablesLabel', this.i18n.tOr('processSection.deliverablesLabel', '')),
  }));

  choose(i: number) {
    // If the current step is clicked again, emit -1 to close.
    // If a different step is clicked, emit that index to open it.
    if (this.currentStep() === i) {
      this.selectStep.emit(-1); // Use -1 to represent a closed state.
    } else {
      this.selectStep.emit(i);
      // Smooth scroll after a short delay so animations can begin.
      setTimeout(() => {
        this.scrollToSelectedStep(i);
      }, 150);
    }
  }

  private scrollToSelectedStep(stepIndex: number) {
    const stepElement = this.elementRef.nativeElement.querySelector(`[data-step="${ stepIndex }"]`);
    if (stepElement) {
      const elementRect = stepElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementTop = elementRect.top + window.pageYOffset;

      // Compute the scroll offset to center the selected step.
      const targetScrollPosition = elementTop - viewportHeight / 2 + elementRect.height / 2;

      // Smooth scroll.
      window.scrollTo({
        top: Math.max(0, targetScrollPosition), // Prevent negative scroll values.
        behavior: 'smooth',
      });
    }
  }
}

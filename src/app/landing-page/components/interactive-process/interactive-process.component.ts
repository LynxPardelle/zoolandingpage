import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
import { ProcessStep } from './interactive-process.types';

@Component({
  selector: 'interactive-process',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './interactive-process.component.html',
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
export class InteractiveProcessComponent {
  private readonly i18n = inject(LandingPageI18nService);
  private readonly elementRef = inject(ElementRef);

  readonly process = input.required<readonly ProcessStep[]>();
  readonly currentStep = input.required<number>();
  readonly selectStep = output<number>();
  readonly currentData = computed(() => {
    const step = this.currentStep();
    // Si currentStep es -1 (cerrado) o inválido, usar el primer paso como fallback
    if (step < 0 || step >= this.process().length) {
      return this.process()[0];
    }
    return this.process()[step];
  });

  // Use centralized process section translations
  readonly sectionContent = computed(() => this.i18n.processSection());

  choose(i: number) {
    // Si el paso actual es el mismo que se clickeó, emitir -1 para cerrar
    // Si es diferente, emitir el nuevo índice para abrir
    if (this.currentStep() === i) {
      this.selectStep.emit(-1); // Usamos -1 para indicar "cerrado"
    } else {
      this.selectStep.emit(i);
      // Scroll suave al elemento seleccionado después de un pequeño delay
      // para permitir que las animaciones comiencen
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

      // Calcular la posición de scroll para centrar el elemento
      // Restamos la mitad de la altura de la viewport para centrarlo
      const targetScrollPosition = elementTop - (viewportHeight / 2) + (elementRect.height / 2);

      // Scroll suave
      window.scrollTo({
        top: Math.max(0, targetScrollPosition), // No permitir scroll negativo
        behavior: 'smooth'
      });
    }
  }
}

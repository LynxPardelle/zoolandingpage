import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../../shared/services/i18n.service';
import { ProcessStep, ProcessStepVariableConfig } from './interactive-process-leaf.types';

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
  private readonly defaultStepIcons: readonly string[] = [
    'assignment',
    'psychology',
    'preview',
    'rocket_launch',
    'analytics',
    'autorenew',
  ];

  readonly process = input.required<readonly ProcessStep[] | readonly ProcessStepVariableConfig[]>();
  readonly currentStep = input.required<number>();
  readonly sectionTitleKey = input<unknown>('landing.processSection.title');
  readonly sectionSidebarTitleKey = input<unknown>('landing.processSection.sidebarTitle');
  readonly sectionDetailedDescriptionLabelKey = input<unknown>('landing.processSection.detailedDescriptionLabel');
  readonly sectionDeliverablesLabelKey = input<unknown>('landing.processSection.deliverablesLabel');
  readonly selectStep = output<number>();

  readonly resolvedProcess = computed<readonly ProcessStep[]>(() => {
    const entries = this.process();
    if (!Array.isArray(entries) || entries.length === 0) return [];

    return entries
      .map((entry, index) => this.normalizeStep(entry, index))
      .filter((step): step is ProcessStep => !!step);
  });

  readonly currentData = computed(() => {
    const steps = this.resolvedProcess();
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
    title: this.resolveSectionText(this.sectionTitleKey(), 'processSection.title'),
    sidebarTitle: this.resolveSectionText(this.sectionSidebarTitleKey(), 'processSection.sidebarTitle'),
    detailedDescriptionLabel: this.resolveSectionText(
      this.sectionDetailedDescriptionLabelKey(),
      'processSection.detailedDescriptionLabel'
    ),
    deliverablesLabel: this.resolveSectionText(
      this.sectionDeliverablesLabelKey(),
      'processSection.deliverablesLabel'
    ),
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

  iconForStep(stepIndex: number, step: ProcessStep): string {
    if (typeof step.icon === 'string' && step.icon.trim().length > 0) {
      return step.icon.trim();
    }
    return this.defaultStepIcons[stepIndex] ?? this.defaultStepIcons[0];
  }

  private resolveSectionText(primaryKeyOrLiteral: unknown, legacyKey: string): string {
    const primary = this.resolveI18nText(primaryKeyOrLiteral);
    if (typeof primary === 'string' && primary.trim().length > 0) return primary;
    return this.i18n.tOr(legacyKey, '');
  }

  private normalizeStep(step: ProcessStep | ProcessStepVariableConfig, index: number): ProcessStep | null {
    const record = step as Record<string, unknown>;
    const title = this.resolveI18nText(record['titleKey']) ?? this.asTrimmedString(record['title']);
    const description = this.resolveI18nText(record['descriptionKey']) ?? this.asTrimmedString(record['description']);
    const detailedDescription =
      this.resolveI18nText(record['detailedDescriptionKey']) ?? this.asTrimmedString(record['detailedDescription']);
    const duration = this.resolveI18nText(record['durationKey']) ?? this.asTrimmedString(record['duration']);
    const deliverables = this.resolveDeliverables(record);

    if (!title || !description || !detailedDescription || !duration || deliverables.length === 0) {
      return null;
    }

    const stepNumberRaw = Number(record['step']);
    const stepNumber = Number.isFinite(stepNumberRaw) && stepNumberRaw > 0
      ? Math.floor(stepNumberRaw)
      : index + 1;

    return {
      step: stepNumber,
      title,
      description,
      detailedDescription,
      duration,
      deliverables,
      isActive: Boolean(record['isActive']),
      icon: this.asTrimmedString(record['icon']),
    };
  }

  private resolveDeliverables(record: Record<string, unknown>): readonly string[] {
    const fromKey = this.resolveI18nArray(record['deliverablesKey']);
    if (fromKey.length > 0) return fromKey;

    const deliverableKeys = Array.isArray(record['deliverableKeys'])
      ? record['deliverableKeys']
      : [];

    const fromDeliverableKeys = deliverableKeys
      .map((key) => this.resolveI18nText(key))
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (fromDeliverableKeys.length > 0) return fromDeliverableKeys;

    return this.normalizeStringArray(record['deliverables']);
  }

  private resolveI18nArray(key: unknown): readonly string[] {
    const normalizedKey = this.asTrimmedString(key);
    if (!normalizedKey) return [];

    const raw = this.i18n.get(normalizedKey);
    return this.normalizeStringArray(raw);
  }

  private resolveI18nText(keyOrLiteral: unknown): string | undefined {
    const normalized = this.asTrimmedString(keyOrLiteral);
    if (!normalized) return undefined;

    const direct = this.i18n.get(normalized);
    if (typeof direct === 'string' && direct.trim().length > 0) {
      return direct;
    }

    const translated = this.i18n.t(normalized);
    if (typeof translated === 'string' && translated.trim().length > 0 && translated !== normalized) {
      return translated;
    }

    return normalized;
  }

  private normalizeStringArray(value: unknown): readonly string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private asTrimmedString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
}

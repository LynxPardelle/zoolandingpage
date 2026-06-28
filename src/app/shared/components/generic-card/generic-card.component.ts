import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../services/draft-runtime.service';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { navigateInCurrentWindow } from '../../utility/navigation/browser-navigation.utility';
import { resolveNavigationTarget } from '../../utility/navigation/navigation-target.utility';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import { TGenericCardAction, TGenericCardConfig } from './generic-card.types';

@Component({
  selector: 'generic-card',
  imports: [GenericButtonComponent, GenericIconComponent],
  templateUrl: './generic-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericCardComponent {
  private readonly i18n = inject(I18nService);
  private readonly _config = signal<TGenericCardConfig>({});
  readonly stars = signal<readonly number[]>([1, 2, 3, 4, 5]);

  @Input()
  get config(): TGenericCardConfig {
    return this._config();
  }

  set config(value: TGenericCardConfig) {
    this._config.set(value ?? {});
  }

  @Output() readonly linkClicked = new EventEmitter<{
    href: string;
    eventInstructions?: string;
  }>();
  @Output() readonly actionClicked = new EventEmitter<{
    label: string;
    index: number;
    eventInstructions?: string;
  }>();

  readonly variant = computed(() =>
    resolveDynamicValue(this._config().variant) === 'testimonial'
      ? 'testimonial'
      : 'feature'
  );
  readonly isTestimonial = computed(() => this.variant() === 'testimonial');
  readonly classes = computed(() =>
    String(resolveDynamicValue(this._config().classes) ?? '').trim()
  );
  readonly buttonClasses = computed(() =>
    String(resolveDynamicValue(this._config().buttonClasses) ?? '').trim()
  );

  readonly icon = computed(
    () => resolveDynamicValue(this._config().icon) ?? ''
  );
  readonly title = computed(() =>
    String(resolveDynamicValue(this._config().title) ?? '')
  );
  readonly description = computed(() =>
    String(resolveDynamicValue(this._config().description) ?? '')
  );
  readonly benefits = computed<readonly string[]>(
    () => resolveDynamicValue(this._config().benefits) ?? []
  );
  readonly buttonLabel = computed(() =>
    String(resolveDynamicValue(this._config().buttonLabel) ?? '')
  );
  readonly imageSrc = computed(() =>
    String(resolveDynamicValue(this._config().imageSrc) ?? '').trim()
  );
  readonly imageAlt = computed(() =>
    String(
      resolveDynamicValue(this._config().imageAlt) ?? this.title() ?? ''
    ).trim()
  );
  readonly href = computed(() =>
    String(resolveDynamicValue(this._config().href) ?? '').trim()
  );
  readonly navigationTarget = computed(() =>
    resolveNavigationTarget(this.href(), {
      stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
    })
  );
  readonly linkHref = computed(() => this.navigationTarget().href);
  readonly linkLabel = computed(() =>
    String(resolveDynamicValue(this._config().linkLabel) ?? '').trim()
  );
  readonly linkEventInstructions = computed(() =>
    String(
      resolveDynamicValue(this._config().linkEventInstructions) ?? ''
    ).trim()
  );
  readonly actions = computed<readonly TGenericCardAction[]>(() => {
    const value = resolveDynamicValue(this._config().actions);
    return Array.isArray(value) ? value : [];
  });
  readonly target = computed(
    () => {
      const target = String(resolveDynamicValue(this._config().target) ?? '').trim();
      if (target === '_blank' && this.navigationTarget().internal) return null;
      return target || null;
    }
  );
  readonly rel = computed(() =>
    String(
      resolveDynamicValue(this._config().rel) ?? 'nofollow noopener noreferrer'
    ).trim()
  );

  readonly name = computed(() =>
    String(resolveDynamicValue(this._config().name) ?? '')
  );
  readonly role = computed(() =>
    String(resolveDynamicValue(this._config().role) ?? '')
  );
  readonly company = computed(() =>
    String(resolveDynamicValue(this._config().company) ?? '')
  );
  readonly content = computed(() =>
    String(resolveDynamicValue(this._config().content) ?? '')
  );
  readonly rating = computed(() =>
    Number(resolveDynamicValue(this._config().rating) ?? 0)
  );
  readonly avatar = computed(() =>
    String(resolveDynamicValue(this._config().avatar) ?? '')
  );
  readonly verified = computed(() =>
    Boolean(resolveDynamicValue(this._config().verified) ?? false)
  );
  readonly keyedBenefits = computed(() =>
    this.benefits().map((benefit, index) => ({
      key: `${index}:${benefit}`,
      value: benefit,
    }))
  );
  readonly verifiedLabel = computed(() => this.i18n.t('ui.common.verified'));
  readonly classValue = (key: keyof TGenericCardConfig): string =>
    String(resolveDynamicValue(this._config()[key] as never) ?? '').trim();
  readonly iconClassValue = (key: keyof TGenericCardConfig): string => {
    const classes = this.classValue(key);
    return ['material-icons', classes].filter(Boolean).join(' ');
  };

  readonly onButtonPressed = (_event?: MouseEvent): void => {
    this._config().onCta?.(this.title());
  };

  readonly onLinkClicked = (event?: MouseEvent): void => {
    const target = this.navigationTarget();
    const href = target.href;
    if (!href) return;

    if (target.internal) {
      event?.preventDefault();
      navigateInCurrentWindow(href);
    }

    this.linkClicked.emit({
      href,
      eventInstructions: this.linkEventInstructions() || undefined,
    });
  };

  readonly actionLabel = (action: TGenericCardAction): string =>
    String(resolveDynamicValue(action.label) ?? '').trim();

  readonly actionAriaLabel = (action: TGenericCardAction): string | undefined => {
    const ariaLabel = String(resolveDynamicValue(action.ariaLabel) ?? '').trim();
    return ariaLabel || undefined;
  };

  readonly actionClasses = (action: TGenericCardAction): string => {
    const classes = String(resolveDynamicValue(action.classes) ?? '').trim();
    return classes || this.classValue('actionButtonClasses');
  };

  readonly actionDisabled = (action: TGenericCardAction): boolean =>
    Boolean(resolveDynamicValue(action.disabled) ?? false);

  readonly actionLoading = (action: TGenericCardAction): boolean =>
    Boolean(resolveDynamicValue(action.loading) ?? false);

  readonly actionIcon = (action: TGenericCardAction): string | undefined => {
    const icon = String(resolveDynamicValue(action.icon) ?? '').trim();
    return icon || undefined;
  };

  readonly actionIconClasses = (action: TGenericCardAction): string => {
    const classes = String(resolveDynamicValue(action.iconClasses) ?? '').trim();
    return classes || 'ank-fontSize-20px ank-lineHeight-1';
  };

  readonly actionIconPosition = (action: TGenericCardAction): 'after' | 'before' => {
    const position = String(resolveDynamicValue(action.iconPosition) ?? 'before').trim();
    return position === 'after' ? 'after' : 'before';
  };

  readonly actionEventInstructions = (action: TGenericCardAction): string | undefined => {
    const eventInstructions = String(resolveDynamicValue(action.eventInstructions) ?? '').trim();
    return eventInstructions || undefined;
  };

  readonly actionConfirmMessage = (action: TGenericCardAction): string | undefined => {
    const message = String(resolveDynamicValue(action.confirmMessage) ?? '').trim();
    return message || undefined;
  };

  readonly onActionClicked = (index: number, action: TGenericCardAction, _event?: MouseEvent): void => {
    const confirmMessage = this.actionConfirmMessage(action);
    if (confirmMessage && typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return;
    }

    this.actionClicked.emit({
      index,
      label: this.actionLabel(action),
      eventInstructions: this.actionEventInstructions(action),
    });
  };
}

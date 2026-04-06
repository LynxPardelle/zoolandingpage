import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { VariableStoreService } from '../../services/variable-store.service';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { ToastService } from './generic-toast.service';
import { ToastAction, ToastMessage, ToastUiConfig } from './generic-toast.types';

@Component({
  selector: 'generic-toast-host',
  imports: [CommonModule, GenericButtonComponent],
  templateUrl: './generic-toast.component.html',
  styleUrls: ['./generic-toast.component.scss'],
})
export class GenericToastComponent {
  private hoveredToasts = signal<Set<string>>(new Set());
  private readonly i18n = inject(I18nService);
  private readonly variableStore = inject(VariableStoreService);
  readonly analyticsEvent = output<AnalyticsEventPayload>();
  readonly notificationsAriaLabel = computed(() => this.i18n.t('ui.common.notifications'));
  readonly uiConfig = computed<ToastUiConfig>(() => {
    const value = this.variableStore.get('ui.toast');
    return this.isRecord(value) ? value as ToastUiConfig : {};
  });

  constructor(public service: ToastService) {
    // Reactive analytics emission for toast lifecycle
    effect(() => {
      const list = this.service.list();
      list.forEach(t => {
        if (t.entering) {
          this.analyticsEvent.emit({ name: AnalyticsEvents.ToastShow, category: AnalyticsCategories.Engagement, label: t.source || t.title || 'toast' });
        }
        if (t.leaving) {
          this.analyticsEvent.emit({ name: AnalyticsEvents.ToastHide, category: AnalyticsCategories.Engagement, label: t.source || t.title || 'toast' });
        }
      });
    });
  }

  getHostPositionClasses(): string {
    const config = this.service.config();
    const { vertical, horizontal } = config.position;

    const classes = [this.uiClass('hostClasses')];

    // Vertical positioning
    if (vertical === 'top') {
      classes.push(this.uiClass('hostTopClasses'));
    } else {
      classes.push(this.uiClass('hostBottomClasses'));
    }

    // Horizontal positioning
    if (horizontal === 'right') {
      classes.push(this.uiClass('hostRightClasses'));
    } else if (horizontal === 'left') {
      classes.push(this.uiClass('hostLeftClasses'));
    } else if (horizontal === 'center') {
      classes.push(this.uiClass('hostCenterClasses'));
    }

    return classes.filter(Boolean).join(' ');
  }

  getToastClasses(toast: ToastMessage): string {
    const classes = [this.uiClass('itemClasses')];

    // Level-specific styling
    classes.push(this.levelClasses(toast.level));

    // Animation classes
    if (toast.entering) {
      classes.push('toast-enter');
    }
    if (toast.leaving) {
      classes.push('toast-leave');
    }

    // Hover state
    if (this.hoveredToasts().has(toast.id)) {
      classes.push(this.uiClass('hoveredItemClasses'));
    }

    return classes.join(' ');
  }

  getIconClasses(toast: ToastMessage): string {
    return [this.uiClass('iconSurfaceClasses'), this.uiClass('iconContainerClasses'), this.iconLevelClasses(toast.level)].filter(Boolean).join(' ');
  }

  getProgressBarClasses(toast: ToastMessage): string {
    return [this.uiClass('progressBarSurfaceClasses'), this.uiClass('progressBarClasses'), 'toast-progress-bar-anim'].filter(Boolean).join(' ');
  }

  getActionButtonClasses(action: ToastAction): string {
    return [
      this.uiClass('actionButtonClasses'),
      action.style === 'primary' ? this.uiClass('actionPrimaryClasses') : this.uiClass('actionSecondaryClasses'),
    ].filter(Boolean).join(' ');
  }

  onToastHover(toastId: string, isHovered: boolean): void {
    this.hoveredToasts.update(set => {
      const newSet = new Set(set);
      if (isHovered) {
        newSet.add(toastId);
      } else {
        newSet.delete(toastId);
      }
      return newSet;
    });
  }

  handleActionClick(action: ToastAction, toastId: string): void {
    try {
      action.action();
    } catch (error) {
      console.error('Toast action failed:', error);
    }
    // Emit specific toast action event including the button label
    this.analyticsEvent.emit({ name: AnalyticsEvents.ActionTrigger, category: AnalyticsCategories.CTA, label: action.label });

    // Optionally dismiss the toast after action
    this.service.dismiss(toastId);
  }

  dismiss(toastId: string): void {
    this.analyticsEvent.emit({ name: AnalyticsEvents.ToastHide, category: AnalyticsCategories.CTA, label: 'dismiss' });
    this.service.dismiss(toastId);
  }

  getDismissAriaLabel(title?: string | null): string {
    const base = this.i18n.t('ui.common.dismissNotification');
    return title ? `${ base }: ${ title }` : base;
  }

  uiClass(key: keyof ToastUiConfig): string {
    const value = this.uiConfig()[key];
    return typeof value === 'string' ? value.trim() : '';
  }

  private levelClasses(level: ToastMessage['level']): string {
    switch (level) {
      case 'success':
        return this.uiClass('levelSuccessClasses');
      case 'error':
        return this.uiClass('levelErrorClasses');
      case 'warning':
        return this.uiClass('levelWarningClasses');
      default:
        return this.uiClass('levelInfoClasses');
    }
  }

  private iconLevelClasses(level: ToastMessage['level']): string {
    switch (level) {
      case 'success':
        return this.uiClass('iconSuccessClasses');
      case 'error':
        return this.uiClass('iconErrorClasses');
      case 'warning':
        return this.uiClass('iconWarningClasses');
      default:
        return this.uiClass('iconInfoClasses');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
}

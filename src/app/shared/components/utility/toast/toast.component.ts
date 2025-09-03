import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { CommonModule } from '@angular/common';
import { Component, effect, output, signal } from '@angular/core';
import { ToastService } from './toast.service';
import { ToastAction, ToastLevel, ToastMessage } from './toast.types';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {
  private hoveredToasts = signal<Set<string>>(new Set());
  readonly analyticsEvent = output<AnalyticsEventPayload>();

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

    const classes = [];

    // Vertical positioning
    if (vertical === 'top') {
      classes.push('ank-top-1rem');
    } else {
      classes.push('ank-bottom-1rem');
    }

    // Horizontal positioning
    if (horizontal === 'right') {
      classes.push('ank-right-1rem');
    } else if (horizontal === 'left') {
      classes.push('ank-left-1rem');
    } else if (horizontal === 'center') {
      classes.push('ank-left-50per', 'ank-transform-translateXSDMIN50perED');
    }

    return classes.join(' ');
  }

  getToastClasses(toast: ToastMessage): string {
    const classes = [
      'toast-item',
      'ank-border-1px__solid__secondaryBgColor',
      'ank-backdropFilter-blurSD0_5remED',
      'ank-transformOrigin-center__bottom',
    ];

    // Level-specific styling
    classes.push(`toast-${ toast.level }`);

    // Animation classes
    if (toast.entering) {
      classes.push('toast-enter');
    }
    if (toast.leaving) {
      classes.push('toast-leave');
    }

    // Hover state
    if (this.hoveredToasts().has(toast.id)) {
      classes.push('toast-hovered');
    }

    return classes.join(' ');
  }

  getActionButtonClasses(action: ToastAction, level: ToastLevel): string {
    const baseClasses = ['toast-action-btn'];

    // Style-specific classes
    if (action.style === 'primary') {
      baseClasses.push(`toast-action-primary-${ level }`);
    } else {
      baseClasses.push('toast-action-secondary');
    }

    return baseClasses.join(' ');
  }

  getIconClasses(level: ToastLevel): string {
    // Provide minimal per-level overrides via utilities; core theme handled in SCSS animations.
    switch (level) {
      case 'success':
      case 'error':
      case 'warning':
      case 'info':
      default:
        return '';
    }
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

  // Legacy noop methods retained (if template still references them)
  trackToastEnter(_: ToastMessage): void { }
  trackToastLeave(_: ToastMessage): void { }

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
}

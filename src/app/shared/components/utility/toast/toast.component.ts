import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
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

  constructor(public service: ToastService) {}

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
    if (horizontal === 'left') {
      classes.push('ank-left-1rem');
    } else if (horizontal === 'right') {
      classes.push('ank-right-1rem');
    } else {
      classes.push('ank-left-50%', 'ank-transform-translateX-neg50%');
    }

    return classes.join(' ');
  }

  getToastClasses(toast: ToastMessage): string {
    const classes = ['toast-item'];

    // Level-specific styling
    classes.push(`toast-${toast.level}`);

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
      baseClasses.push(`toast-action-primary-${level}`);
    } else {
      baseClasses.push('toast-action-secondary');
    }

    return baseClasses.join(' ');
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

    // Optionally dismiss the toast after action
    this.service.dismiss(toastId);
  }
}

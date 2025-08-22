import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-demo',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  template: `
    <div class="toast-demo ank-p-2rem ank-display-flex ank-flexDirection-column ank-gap-1rem ank-maxWidth-48rem">
      <h2 class="ank-fontSize-1_5rem ank-fontWeight-600 ank-mb-1rem">Advanced Toast Notifications Demo</h2>

      <!-- Basic Toast Types -->
      <section class="demo-section">
        <h3 class="ank-fontSize-1_25rem ank-fontWeight-500 ank-mb-0_75rem">Basic Toast Types</h3>
        <div class="ank-display-flex ank-gap-0_5rem ank-flexWrap-wrap">
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-success ank-color-bgColor ank-border-success"
            (click)="showSuccess()"
          >
            Success Toast
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-error ank-color-bgColor ank-border-error"
            (click)="showError()"
          >
            Error Toast
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-warning ank-color-bgColor ank-border-warning"
            (click)="showWarning()"
          >
            Warning Toast
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-info ank-color-bgColor ank-border-info"
            (click)="showInfo()"
          >
            Info Toast
          </button>
        </div>
      </section>

      <!-- Advanced Features -->
      <section class="demo-section">
        <h3 class="ank-fontSize-1_25rem ank-fontWeight-500 ank-mb-0_75rem">Advanced Features</h3>
        <div class="ank-display-flex ank-gap-0_5rem ank-flexWrap-wrap">
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-primary ank-color-bgColor ank-border-primary"
            (click)="showWithTitle()"
          >
            With Title
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-secondary ank-color-bgColor ank-border-secondary"
            (click)="showWithActions()"
          >
            With Actions
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-accent ank-color-bgColor ank-border-accent"
            (click)="showPersistent()"
          >
            Persistent
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border"
            (click)="showMultiple()"
          >
            Multiple Toasts
          </button>
        </div>
      </section>

      <!-- Configuration -->
      <section class="demo-section">
        <h3 class="ank-fontSize-1_25rem ank-fontWeight-500 ank-mb-0_75rem">Position & Configuration</h3>
        <div class="ank-display-flex ank-gap-0_5rem ank-flexWrap-wrap">
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border"
            (click)="setTopRight()"
          >
            Top Right
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border"
            (click)="setTopLeft()"
          >
            Top Left
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border"
            (click)="setBottomCenter()"
          >
            Bottom Center
          </button>
          <button
            class="ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-destructive ank-color-bgColor ank-border-destructive"
            (click)="clearAll()"
          >
            Clear All
          </button>
        </div>
      </section>

      <!-- Current Configuration -->
      <section class="demo-info ank-p-1rem ank-bgcl-surface-secondary ank-borderRadius-0_5rem">
        <h4 class="ank-fontSize-1rem ank-fontWeight-500 ank-mb-0_5rem">Current Configuration</h4>
        <div class="ank-fontSize-0_875rem ank-color-text-secondary">
          <p>Position: {{ toastService.config().position.vertical }} {{ toastService.config().position.horizontal }}</p>
          <p>Max Visible: {{ toastService.config().maxVisible }}</p>
          <p>Default Auto-close: {{ toastService.config().defaultAutoCloseMs }}ms</p>
          <p>Active Toasts: {{ toastService.list().length }}</p>
        </div>
      </section>
    </div>

    <!-- Toast Host Component -->
    <app-toast-host></app-toast-host>
  `,
  styles: [
    `
      .demo-section {
        padding: 1rem;
        border: 1px solid var(--ank-borderColor, #e5e7eb);
        border-radius: 0.5rem;
        background: var(--ank-surfaceColor, #ffffff);
      }

      .demo-info {
        border: 1px solid var(--ank-borderColor, #e5e7eb);
      }

      button:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        transition: all 200ms ease;
      }

      button:active {
        transform: translateY(0);
      }
    `,
  ],
})
export class ToastDemoComponent {
  constructor(public toastService: ToastService) {}

  showSuccess(): void {
    this.toastService.success('Operation completed successfully!');
  }

  showError(): void {
    this.toastService.error('Something went wrong. Please try again.');
  }

  showWarning(): void {
    this.toastService.warning('This action cannot be undone.');
  }

  showInfo(): void {
    this.toastService.info('New features are available in the latest update.');
  }

  showWithTitle(): void {
    this.toastService.show({
      level: 'success',
      title: 'File Uploaded',
      text: 'Your document has been successfully uploaded to the server.',
      autoCloseMs: 6000,
    });
  }

  showWithActions(): void {
    this.toastService.show({
      level: 'info',
      title: 'Update Available',
      text: 'A new version of the application is ready to install.',
      autoCloseMs: 0,
      actions: [
        {
          label: 'Update Now',
          action: () => {
            console.log('Updating application...');
            this.toastService.success('Update started successfully!');
          },
          style: 'primary',
        },
        {
          label: 'Later',
          action: () => console.log('Update postponed'),
          style: 'secondary',
        },
      ],
    });
  }

  showPersistent(): void {
    this.toastService.show({
      level: 'error',
      title: 'Connection Lost',
      text: 'Unable to connect to the server. Please check your internet connection.',
      autoCloseMs: 0,
      actions: [
        {
          label: 'Retry',
          action: () => {
            console.log('Retrying connection...');
            this.toastService.success('Connection restored!');
          },
          style: 'primary',
        },
      ],
    });
  }

  showMultiple(): void {
    const messages = ['First notification', 'Second notification', 'Third notification', 'Fourth notification'];

    messages.forEach((message, index) => {
      setTimeout(() => {
        this.toastService.info(message, {
          autoCloseMs: 3000 + index * 1000,
        });
      }, index * 500);
    });
  }

  setTopRight(): void {
    this.toastService.setPosition({ vertical: 'top', horizontal: 'right' });
    this.toastService.info('Position changed to top-right');
  }

  setTopLeft(): void {
    this.toastService.setPosition({ vertical: 'top', horizontal: 'left' });
    this.toastService.info('Position changed to top-left');
  }

  setBottomCenter(): void {
    this.toastService.setPosition({ vertical: 'bottom', horizontal: 'center' });
    this.toastService.info('Position changed to bottom-center');
  }

  clearAll(): void {
    this.toastService.clear();
  }
}

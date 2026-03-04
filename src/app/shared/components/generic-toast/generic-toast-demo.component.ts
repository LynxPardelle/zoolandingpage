import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericToastComponent } from './generic-toast.component';
import { ToastService } from './generic-toast.service';

@Component({
  selector: 'generic-toast-demo',
  imports: [CommonModule, GenericToastComponent, GenericButtonComponent],
  template: `
    <div class="toast-demo ank-p-2rem ank-display-flex ank-flexDirection-column ank-gap-1rem ank-maxWidth-48rem">
      <h2 class="ank-fontSize-1_5rem ank-fontWeight-600 ank-mb-1rem">{{ i18n.t('demo.toast.demoTitle') }}</h2>

      <!-- Basic Toast Types -->
      <section class="demo-section">
        <h3 class="ank-fontSize-1_25rem ank-fontWeight-500 ank-mb-0_75rem">{{ i18n.t('demo.toast.basicTypesTitle') }}</h3>
        <div class="ank-display-flex ank-gap-0_5rem ank-flexWrap-wrap">
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-success ank-color-bgColor ank-border-success'
            }"

            (pressed)="showSuccess()"
          >
            {{ i18n.t('demo.toast.button.success') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-error ank-color-bgColor ank-border-error'
            }"
            (pressed)="showError()"
          >
            {{ i18n.t('demo.toast.button.error') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-warning ank-color-bgColor ank-border-warning'
            }"
            (pressed)="showWarning()"
          >
            {{ i18n.t('demo.toast.button.warning') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-info ank-color-bgColor ank-border-info'
            }"
            (pressed)="showInfo()"
          >
            {{ i18n.t('demo.toast.button.info') }}
          </generic-button>
        </div>
      </section>

      <!-- Advanced Features -->
      <section class="demo-section">
        <h3 class="ank-fontSize-1_25rem ank-fontWeight-500 ank-mb-0_75rem">{{ i18n.t('demo.toast.advancedFeaturesTitle') }}</h3>
        <div class="ank-display-flex ank-gap-0_5rem ank-flexWrap-wrap">
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-primary ank-color-bgColor ank-border-primary'
            }"
            (pressed)="showWithTitle()"
          >
            {{ i18n.t('demo.toast.button.withTitle') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-secondary ank-color-bgColor ank-border-secondary'
            }"
            (pressed)="showWithActions()"
          >
            {{ i18n.t('demo.toast.button.action') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-accent ank-color-bgColor ank-border-accent'
            }"
            (pressed)="showPersistent()"
          >
            {{ i18n.t('demo.toast.button.persistent') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border'
            }"
            (pressed)="showMultiple()"
          >
            {{ i18n.t('demo.toast.button.multiple') }}
          </generic-button>
        </div>
      </section>

      <!-- Configuration -->
      <section class="demo-section">
        <h3 class="ank-fontSize-1_25rem ank-fontWeight-500 ank-mb-0_75rem">{{ i18n.t('demo.toast.positionConfigTitle') }}</h3>
        <div class="ank-display-flex ank-gap-0_5rem ank-flexWrap-wrap">
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border'
            }"
            (pressed)="setTopRight()"
          >
            {{ i18n.t('demo.toast.button.topRight') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border'
            }"
            (pressed)="setTopLeft()"
          >
            {{ i18n.t('demo.toast.button.topLeft') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-surface ank-color-text ank-border-border'
            }"
            (pressed)="setBottomCenter()"
          >
            {{ i18n.t('demo.toast.button.bottomCenter') }}
          </generic-button>
          <generic-button
            [config]="{
              classes:'ank-px-1rem ank-py-0_5rem ank-borderRadius-0_375rem ank-border-1 ank-cursor-pointer ank-bgcl-destructive ank-color-bgColor ank-border-destructive'
            }"
            (pressed)="clearAll()"
          >
            {{ i18n.t('demo.toast.button.clear') }}
          </generic-button>
        </div>
      </section>

      <!-- Current Configuration -->
      <section class="demo-info ank-p-1rem ank-bgcl-surface-secondary ank-borderRadius-0_5rem">
        <h4 class="ank-fontSize-1rem ank-fontWeight-500 ank-mb-0_5rem">{{ i18n.t('demo.toast.currentConfigurationTitle') }}</h4>
        <div class="ank-fontSize-0_875rem ank-color-text-secondary">
          <p>{{ i18n.t('demo.toast.positionLabel') }}: {{ toastService.config().position.vertical }} {{ toastService.config().position.horizontal }}</p>
          <p>{{ i18n.t('demo.toast.maxVisibleLabel') }}: {{ toastService.config().maxVisible }}</p>
          <p>{{ i18n.t('demo.toast.defaultAutoCloseLabel') }}: {{ toastService.config().defaultAutoCloseMs }}ms</p>
          <p>{{ i18n.t('demo.toast.activeToastsLabel') }}: {{ toastService.list().length }}</p>
        </div>
      </section>
    </div>

    <!-- Toast Host Component -->
    <generic-toast-host></generic-toast-host>
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

      generic-button:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        transition: all 200ms ease;
      }

      generic-button:active {
        transform: translateY(0);
      }
    `,
  ],
})
export class GenericToastDemoComponent {
  readonly i18n = inject(I18nService);

  constructor(public toastService: ToastService) { }

  showSuccess(): void {
    this.toastService.success(this.i18n.t('demo.toast.success'));
  }

  showError(): void {
    this.toastService.error(this.i18n.t('demo.toast.error'));
  }

  showWarning(): void {
    this.toastService.warning(this.i18n.t('demo.toast.warning'));
  }

  showInfo(): void {
    this.toastService.info(this.i18n.t('demo.toast.info'));
  }

  showWithTitle(): void {
    this.toastService.show({
      level: 'success',
      title: this.i18n.t('demo.toast.fileUploadTitle'),
      text: this.i18n.t('demo.toast.fileUploadText'),
      autoCloseMs: 6000,
    });
  }

  showWithActions(): void {
    this.toastService.show({
      level: 'info',
      title: this.i18n.t('demo.toast.updateTitle'),
      text: this.i18n.t('demo.toast.updateText'),
      autoCloseMs: 0,
      actions: [
        {
          label: this.i18n.t('demo.toast.updateNow'),
          action: () => {
            /*  console.log('Updating application...'); */
            this.toastService.success(this.i18n.t('demo.toast.updateStarted'));
          },
          style: 'primary',
        },
        /* {
          label: 'Later',
          action: () => console.log('Update postponed'),
          style: 'secondary',
        }, */
      ],
    });
  }

  showPersistent(): void {
    this.toastService.show({
      level: 'error',
      title: this.i18n.t('demo.toast.criticalTitle'),
      text: this.i18n.t('demo.toast.criticalText'),
      autoCloseMs: 0,
      actions: [
        {
          label: this.i18n.t('demo.toast.tryAgain'),
          action: () => {
            /* console.log('Retrying connection...'); */
            this.toastService.success(this.i18n.t('demo.toast.connectionRestored'));
          },
          style: 'primary',
        },
      ],
    });
  }

  showMultiple(): void {
    const messages = this.i18n.getOr<string[]>('demo.toast.multipleMessages', []);

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
    this.toastService.info(this.i18n.t('demo.toast.positionChanged', {
      position: this.i18n.t('demo.toast.positionTopRight'),
    }));
  }

  setTopLeft(): void {
    this.toastService.setPosition({ vertical: 'top', horizontal: 'left' });
    this.toastService.info(this.i18n.t('demo.toast.positionChanged', {
      position: this.i18n.t('demo.toast.positionTopLeft'),
    }));
  }

  setBottomCenter(): void {
    this.toastService.setPosition({ vertical: 'bottom', horizontal: 'center' });
    this.toastService.info(this.i18n.t('demo.toast.positionChanged', {
      position: this.i18n.t('demo.toast.positionBottomCenter'),
    }));
  }

  clearAll(): void {
    this.toastService.clear();
    this.toastService.info(this.i18n.t('demo.toast.allCleared'));
  }
}

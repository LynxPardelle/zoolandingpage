import { GenericFeatureCardConfig } from '@/app/shared/components/generic-feature-card/generic-feature-card.types';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { FEATURE_CARD_ANIMATIONS } from './generic-feature-card.styles';
@Component({
  selector: 'generic-feature-card',
  imports: [CommonModule, MatIconModule, GenericButtonComponent],
  templateUrl: './generic-feature-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: FEATURE_CARD_ANIMATIONS,
})
export class GenericFeatureCardComponent {

  readonly _config = signal<GenericFeatureCardConfig>({});
  @Input()
  get config(): GenericFeatureCardConfig {
    return this._config();
  }
  set config(value: GenericFeatureCardConfig) {
    this._config.set(value ?? {});
  }

  readonly icon = computed<string>(() => this._config().icon ?? '');
  readonly title = computed<string>(() => {
    const raw = this._config().title ?? '';
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly description = computed<string>(() => {
    const raw = this._config().description ?? '';
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly benefits = computed<readonly string[]>(() => {
    const raw = this._config().benefits ?? [];
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly classes = computed<string>(() => this._config().classes || '');
  readonly buttonLabel = computed<string>(() => {
    const raw = this._config().buttonLabel ?? '';
    return typeof raw === 'function' ? raw() : raw;
  });

  readonly onButtonPressed = (_event?: MouseEvent): void => {
    this._config().onCta?.(this.title());
  };


}

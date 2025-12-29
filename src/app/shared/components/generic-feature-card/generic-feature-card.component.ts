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
  readonly title = computed<string>(() => this._config().title ?? '');
  readonly description = computed<string>(() => this._config().description ?? '');
  readonly benefits = computed<readonly string[]>(() => this._config().benefits ?? []);
  readonly classes = computed<string>(() => this._config().classes || '');
  readonly buttonLabel = computed<string>(() => this._config().buttonLabel || '');

  readonly onButtonPressed = (_event?: MouseEvent): void => {
    this._config().onCta?.(this.title());
  };


}

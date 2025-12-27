import { GenericFeatureCardConfig } from '@/app/shared/components/generic-feature-card/generic-feature-card.types';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FEATURE_CARD_ANIMATIONS } from './generic-feature-card.styles';
@Component({
  selector: 'generic-feature-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './generic-feature-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: FEATURE_CARD_ANIMATIONS,
})
export class GenericFeatureCardComponent {

  private readonly _config = signal<GenericFeatureCardConfig>({});
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
}

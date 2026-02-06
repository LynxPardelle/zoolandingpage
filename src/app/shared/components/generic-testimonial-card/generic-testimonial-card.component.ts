import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DEFAULT_TESTIMONIAL_CARD_CONFIG } from './generic-testimonial-card.constants';
import { TESTIMONIAL_CARD_ANIMATIONS } from './generic-testimonial-card.styles';
import { TestimonialCardConfig } from './generic-testimonial-card.types';
@Component({
  selector: 'generic-testimonial-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './generic-testimonial-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: TESTIMONIAL_CARD_ANIMATIONS,
})
export class GenericTestimonialCardComponent {


  private readonly _config = signal<TestimonialCardConfig>(DEFAULT_TESTIMONIAL_CARD_CONFIG);
  @Input()
  get config(): TestimonialCardConfig {
    return this._config();
  }
  set config(value: TestimonialCardConfig) {
    this._config.set(value ?? {});
  }
  readonly name = computed<string>(() => {
    const raw = this._config().name ?? DEFAULT_TESTIMONIAL_CARD_CONFIG.name;
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly role = computed<string>(() => {
    const raw = this._config().role ?? DEFAULT_TESTIMONIAL_CARD_CONFIG.role;
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly company = computed<string>(() => {
    const raw = this._config().company ?? DEFAULT_TESTIMONIAL_CARD_CONFIG.company;
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly content = computed<string>(() => {
    const raw = this._config().content ?? DEFAULT_TESTIMONIAL_CARD_CONFIG.content;
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly avatar = computed<string>(() => this._config().avatar ?? '');
  readonly verified = computed<boolean>(() => this._config().verified ?? false);
  readonly classes = computed<string>(() => this._config().classes ?? '');
  readonly rating = computed<number>(() => {
    const raw = this._config().rating ?? DEFAULT_TESTIMONIAL_CARD_CONFIG.rating;
    return typeof raw === 'function' ? raw() : raw;
  });
  readonly stars = computed(() => [1, 2, 3, 4, 5]);
}

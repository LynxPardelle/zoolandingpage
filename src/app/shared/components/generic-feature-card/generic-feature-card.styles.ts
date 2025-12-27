import { animate, style, transition, trigger } from '@angular/animations';

export const FEATURE_CARD_ANIMATIONS = [
  trigger('fadeIn', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
    ]),
  ]),
];

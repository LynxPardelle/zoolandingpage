import { animate, style, transition, trigger } from '@angular/animations';

export const TESTIMONIAL_CARD_ANIMATIONS = [
  trigger('fadeIn', [
    transition(':enter', [style({ opacity: 0 }), animate('400ms ease-out', style({ opacity: 1 }))]),
  ]),
];

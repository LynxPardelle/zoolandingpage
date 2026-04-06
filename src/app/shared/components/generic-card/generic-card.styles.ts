import { animate, style, transition, trigger } from '@angular/animations';

export const GENERIC_CARD_ANIMATIONS = [
    trigger('featureFadeIn', [
        transition(':enter', [
            style({ opacity: 0, transform: 'translateY(12px)' }),
            animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
        ]),
    ]),
    trigger('testimonialFadeIn', [
        transition(':enter', [style({ opacity: 0 }), animate('400ms ease-out', style({ opacity: 1 }))]),
    ]),
];
